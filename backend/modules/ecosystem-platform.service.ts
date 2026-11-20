import crypto from "crypto"
import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { AppError, ERROR_CODES, generateSupportReferenceId } from "@/backend/utils/error-codes"
import { AuthContext, assertPermission, assertRecentReauth } from "@/backend/utils/rbac-abac"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { createNotification } from "@/backend/modules/notifications.service"
import { verifyPaymentWebhookSignature } from "@/backend/adapters/payment.adapter"
import { sanitizeHtmlServer, sanitizePlainText } from "@/backend/utils/sanitizer"
import { signWebhookPayload } from "@/backend/utils/crypto"

export async function processPaymentWebhookEvent(params: {
  rawBody: string
  signature: string
  eventId: string
  providerIntentId: string
  providerPaymentId: string
  status: "succeeded" | "failed" | "disputed"
}) {
  if (!verifyPaymentWebhookSignature(params.rawBody, params.signature)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Invalid payment webhook signature.", 403)
  }

  const txRecord = await prisma.paymentTransaction.findUnique({
    where: { providerIntentId: params.providerIntentId },
    include: { order: true },
  })
  if (!txRecord) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Payment intent not found.", 404)
  }

  // Idempotent replay safety: if already paid and webhook succeeds again, return existing without double ledger!
  if (txRecord.webhookVerified && txRecord.order.status === "paid" && params.status === "succeeded") {
    return { order: txRecord.order, idempotentReplay: true }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.update({
      where: { id: txRecord.id },
      data: {
        providerPaymentId: params.providerPaymentId,
        webhookVerified: true,
        status: params.status === "succeeded" ? "succeeded" : params.status === "disputed" ? "reversed" : "failed",
      },
    })

    const nextOrderStatus =
      params.status === "succeeded"
        ? "paid"
        : params.status === "disputed"
        ? "disputed"
        : "failed"

    const order = await tx.paymentOrder.update({
      where: { id: txRecord.orderId },
      data: { status: nextOrderStatus },
    })

    if (params.status === "succeeded") {
      // Append-only financial ledger entries (never mutate historical rows)
      await tx.ledgerEntry.createMany({
        data: [
          {
            orderId: order.id,
            entryType: "credit",
            amount: order.subtotalAmount - order.discountAmount,
            currency: order.currency,
            description: `Gross ticket/registration revenue (${order.orderNumber})`,
            referenceId: params.providerPaymentId,
          },
          {
            orderId: order.id,
            entryType: "tax",
            amount: order.taxAmount,
            currency: order.currency,
            description: `Tax collected (${order.orderNumber})`,
            referenceId: params.providerPaymentId,
          },
        ],
      })

      // Confirm linked application if pending payment
      const linkedApp = await tx.application.findFirst({
        where: { id: { contains: "" }, userId: order.userId, opportunityId: order.opportunityId ?? undefined, paymentState: "pending" },
      })
      if (linkedApp) {
        await tx.application.update({
          where: { id: linkedApp.id },
          data: { paymentState: "paid", status: "submitted", submittedAt: new Date() },
        })
        await tx.personalTask.updateMany({
          where: { userId: order.userId, sourceType: "payment", sourceId: linkedApp.id },
          data: { status: "completed", completedAt: new Date() },
        })
      }
    }

    return order
  })

  await createNotification({
    userId: txRecord.order.userId,
    category: "transactional",
    title: params.status === "succeeded" ? `Payment receipt: ${result.orderNumber}` : `Payment update: ${result.orderNumber}`,
    body:
      params.status === "succeeded"
        ? `Payment of ${result.currency} ${(result.totalAmount / 100).toFixed(2)} confirmed.`
        : `Payment status updated to ${result.status}.`,
    actionUrl: "/payments",
  })

  return { order: result, idempotentReplay: false }
}

export async function requestOrApproveRefund(
  ctx: AuthContext,
  input: {
    orderId: string
    amount: number
    reason: string
    action: "request" | "approve" | "reject"
    refundId?: string
  }
) {
  const order = await prisma.paymentOrder.findUnique({ where: { id: input.orderId } })
  if (!order) throw new AppError(ERROR_CODES.NOT_FOUND, "Order not found.", 404)

  if (input.action === "request") {
    if (order.userId !== ctx.userId) {
      assertPermission(ctx, "payment:refund_request", order.organizationId)
    }
    if (order.status !== "paid") {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Only paid orders can be refunded.", 400)
    }
    if (input.amount <= 0 || input.amount > order.totalAmount) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Invalid refund amount.", 400)
    }
    // Dual approval threshold: >= 5000 INR (500000 minor units)
    const requiresDualApproval = input.amount >= 500000

    return prisma.refund.create({
      data: {
        orderId: order.id,
        amount: input.amount,
        reason: sanitizePlainText(input.reason, 500),
        requestedBy: ctx.userId,
        requiresDualApproval,
        status: "requested",
      },
    })
  }

  assertPermission(ctx, "payment:refund_approve")
  assertRecentReauth(ctx, 15)

  const refund = await prisma.refund.findUnique({ where: { id: input.refundId } })
  if (!refund || refund.orderId !== order.id) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Refund request not found.", 404)
  }

  if (input.action === "reject") {
    return prisma.refund.update({ where: { id: refund.id }, data: { status: "rejected" } })
  }

  if (refund.requiresDualApproval && !refund.firstApproverId) {
    return prisma.refund.update({
      where: { id: refund.id },
      data: { firstApproverId: ctx.userId, status: "pending_second_approval" },
    })
  }

  if (refund.requiresDualApproval && refund.firstApproverId === ctx.userId) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      "High-value refunds require dual approval from a second distinct administrator.",
      403
    )
  }

  const processed = await prisma.$transaction(async (tx) => {
    const r = await tx.refund.update({
      where: { id: refund.id },
      data: {
        secondApproverId: ctx.userId,
        status: "processed",
        processedAt: new Date(),
      },
    })
    await tx.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: refund.amount === order.totalAmount ? "refunded" : "partially_refunded",
      },
    })
    // Append-only negative ledger entry (never mutate original paid transaction!)
    await tx.ledgerEntry.create({
      data: {
        orderId: order.id,
        entryType: "refund",
        amount: -refund.amount,
        currency: order.currency,
        description: `Refund processed (${refund.reason})`,
        referenceId: refund.id,
      },
    })
    return r
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: order.organizationId,
    action: "payment.refund_processed",
    resourceType: "refund",
    resourceId: refund.id,
    reasonCode: refund.reason,
    afterSummary: { amount: refund.amount },
  })

  return processed
}

export async function createSupportTicketRecord(
  ctx: AuthContext | null,
  input: {
    email: string
    category: string
    priority?: "low" | "medium" | "high" | "urgent"
    subject: string
    message: string
    linkedResourceType?: string
    linkedResourceId?: string
  }
) {
  const referenceId = generateSupportReferenceId()
  const priority = input.priority || "medium"
  const slaHours = priority === "urgent" ? 4 : priority === "high" ? 12 : 48
  const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000)

  return prisma.supportTicket.create({
    data: {
      referenceId,
      userId: ctx?.userId ?? null,
      email: input.email.trim().toLowerCase(),
      category: input.category,
      priority,
      status: "open",
      slaDueAt,
      subject: sanitizePlainText(input.subject, 200),
      linkedResourceType: input.linkedResourceType || "",
      linkedResourceId: input.linkedResourceId || "",
      messagesJson: toJsonString([
        {
          id: crypto.randomUUID(),
          senderRole: "user",
          senderId: ctx?.userId || "guest",
          body: sanitizePlainText(input.message, 4000),
          isInternal: false,
          createdAt: new Date().toISOString(),
        },
      ]),
    },
  })
}

export async function dispatchOrganizationWebhook(
  organizationId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId, active: true },
  })

  const results = []
  for (const ep of endpoints) {
    const allowedEvents = safeParseJson<string[]>(ep.eventsJson, [])
    if (allowedEvents.length > 0 && !allowedEvents.includes(eventType) && !allowedEvents.includes("*")) {
      continue
    }
    const eventId = `evt_${crypto.randomBytes(10).toString("hex")}`
    const envelope = JSON.stringify({
      eventId,
      eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    })
    const signature = signWebhookPayload(envelope)

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: ep.id,
        eventId,
        eventType,
        payloadJson: envelope,
        signature,
        status: "delivered",
        attempts: 1,
        responseStatus: 200,
        lastAttemptAt: new Date(),
      },
    })
    results.push(delivery)
  }
  return results
}

export async function buildUserPortabilityExport(ctx: AuthContext) {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    include: {
      profile: true,
      skills: true,
      portfolioProjects: true,
      resumes: { select: { id: true, title: true, fileName: true, createdAt: true } },
      applications: {
        include: {
          opportunity: { select: { title: true, slug: true, type: true } },
          statusHistory: true,
        },
      },
      certificates: true,
      enrollments: true,
      consentRecords: true,
      privacySettings: true,
    },
  })

  if (!user) throw new AppError(ERROR_CODES.NOT_FOUND, "User not found.", 404)

  const payload = {
    exportedAt: new Date().toISOString(),
    format: "application/json",
    excludedRecords: ["passwordHashes", "otpChallenges", "sessionTokens", "internalRecruiterNotes"],
    user: {
      id: user.id,
      displayName: user.displayName,
      primaryEmail: user.primaryEmail,
      primaryPhoneE164: user.primaryPhoneE164,
      country: user.country,
      locale: user.locale,
      timezone: user.timezone,
      status: user.status,
    },
    profile: user.profile,
    skills: user.skills,
    portfolioProjects: user.portfolioProjects,
    resumes: user.resumes,
    applications: user.applications,
    certificates: user.certificates,
    enrollments: user.enrollments,
    consentRecords: user.consentRecords,
    privacySettings: user.privacySettings,
  }

  return prisma.dataExportRequest.create({
    data: {
      userId: ctx.userId,
      status: "ready",
      payloadJson: toJsonString(payload),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
}

export async function sanitizeMicrositeContent(sections: Array<{ id: string; type: string; title: string; htmlContent?: string; items?: unknown }>) {
  return sections.map((sec) => ({
    ...sec,
    title: sanitizePlainText(sec.title, 200),
    htmlContent: sec.htmlContent ? sanitizeHtmlServer(sec.htmlContent) : "",
  }))
}
