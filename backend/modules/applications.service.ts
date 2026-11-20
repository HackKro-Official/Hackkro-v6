import crypto from "crypto"
import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { AuthContext, assertPermission } from "@/backend/utils/rbac-abac"
import { evaluateUserEligibility } from "@/backend/modules/eligibility.service"
import { createNotification } from "@/backend/modules/notifications.service"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { createPaymentIntentAdapter } from "@/backend/adapters/payment.adapter"

export async function submitApplication(
  ctx: AuthContext,
  input: {
    opportunityId: string
    teamId?: string
    resumeVersionId?: string
    trackName?: string
    responses: Record<string, unknown>
    idempotencyKey?: string
    requestManualException?: boolean
    manualExceptionReason?: string
    consentAccepted: boolean
  }
) {
  if (!input.consentAccepted) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "Please accept the opportunity data-use and rules notice before submitting.",
      400
    )
  }

  // Idempotency retry return (prevents duplicate submissions on double-click/network retry)
  if (input.idempotencyKey) {
    const existingIdem = await prisma.application.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { opportunity: true },
    })
    if (existingIdem) {
      if (existingIdem.userId !== ctx.userId) {
        throw new AppError(ERROR_CODES.FORBIDDEN, "Idempotency key belongs to another user.", 403)
      }
      return { application: existingIdem, deduplicated: true }
    }
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: input.opportunityId },
    include: {
      registrationForm: { include: { fields: { orderBy: { orderIndex: "asc" } } } },
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      jobRequisition: true,
    },
  })

  if (!opportunity) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)
  }

  if (!["live", "scheduled"].includes(opportunity.status)) {
    throw new AppError(
      ERROR_CODES.OPPORTUNITY_CLOSED,
      "This opportunity is not currently accepting applications.",
      400
    )
  }

  if (opportunity.registrationCloseAt && opportunity.registrationCloseAt < new Date()) {
    throw new AppError(
      ERROR_CODES.OPPORTUNITY_CLOSED,
      "The registration deadline for this opportunity has passed.",
      400
    )
  }

  // Duplicate application check
  if (!opportunity.allowMultipleApplications) {
    const existingApp = await prisma.application.findFirst({
      where: {
        opportunityId: opportunity.id,
        userId: ctx.userId,
        status: { notIn: ["withdrawn", "cancelled"] },
      },
    })
    if (existingApp) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        `You already have an active application (${existingApp.receiptCode}) for this opportunity.`,
        409,
        { receiptCode: existingApp.receiptCode, applicationId: existingApp.id }
      )
    }
  }

  // Dynamic form field validation
  const fields = opportunity.registrationForm?.fields || []
  const missingLabels: string[] = []
  for (const field of fields) {
    if (!field.required) continue
    // Evaluate simple conditional visibility rule { fieldId, equals }
    const cond = safeParseJson<{ fieldId?: string; equals?: string }>(field.conditionalRuleJson, {})
    if (cond.fieldId && String(input.responses[cond.fieldId] ?? "") !== String(cond.equals ?? "")) {
      continue
    }
    const val = input.responses[field.id] ?? input.responses[field.exportName] ?? input.responses[field.label]
    if (val === undefined || val === null || String(val).trim() === "") {
      missingLabels.push(field.label)
    }
  }
  if (missingLabels.length > 0) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      `Missing required application field(s): ${missingLabels.join(", ")}`,
      400,
      { missingFields: missingLabels }
    )
  }

  // Resume snapshot check (ensure user owns selected resume)
  if (input.resumeVersionId) {
    const resume = await prisma.resumeVersion.findUnique({ where: { id: input.resumeVersionId } })
    if (!resume || resume.userId !== ctx.userId) {
      throw new AppError(ERROR_CODES.FORBIDDEN, "Selected resume does not belong to your account.", 403)
    }
  }

  // Server-side eligibility evaluation
  const eligibility = await evaluateUserEligibility(ctx.userId, opportunity.id, input.trackName)
  if (!eligibility.eligible) {
    if (!(input.requestManualException && eligibility.allowManualException && input.manualExceptionReason?.trim())) {
      throw new AppError(
        ERROR_CODES.ELIGIBILITY_NOT_MET,
        eligibility.reasons[0] || "Eligibility criteria not met.",
        400,
        { reasons: eligibility.reasons, allowManualException: eligibility.allowManualException }
      )
    }
  }

  // Atomic seat reservation & application creation inside a serializable transaction
  const receiptCode = `HK-${opportunity.slug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X")}-${crypto.randomInt(100000, 999999)}`
  const latestVersionId = opportunity.versions[0]?.id
  if (!latestVersionId) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Opportunity version snapshot missing.", 500)
  }

  const requiresPayment = opportunity.feeAmount > 0

  const result = await prisma.$transaction(async (tx) => {
    if (opportunity.capacity !== null && opportunity.capacity !== undefined) {
      const updatedCount = await tx.opportunity.updateMany({
        where: {
          id: opportunity.id,
          reservedCount: { lt: opportunity.capacity },
        },
        data: { reservedCount: { increment: 1 }, popularityScore: { increment: 1 } },
      })
      if (updatedCount.count === 0) {
        throw new AppError(
          ERROR_CODES.CAPACITY_REACHED,
          "All available seats for this opportunity have been reserved.",
          409
        )
      }
    } else {
      await tx.opportunity.update({
        where: { id: opportunity.id },
        data: { popularityScore: { increment: 1 } },
      })
    }

    const app = await tx.application.create({
      data: {
        receiptCode,
        opportunityId: opportunity.id,
        opportunityVersionId: latestVersionId,
        userId: ctx.userId,
        teamId: input.teamId ?? null,
        resumeVersionId: input.resumeVersionId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        status: requiresPayment ? "draft" : eligibility.eligible ? "submitted" : "under_review",
        eligibilityPassed: eligibility.eligible,
        eligibilitySnapshotJson: toJsonString(eligibility),
        manualExceptionRequested: !eligibility.eligible && Boolean(input.requestManualException),
        manualExceptionReason: input.manualExceptionReason || "",
        consentSnapshotJson: toJsonString({
          termsVersion: opportunity.termsVersion,
          dataUseNotice: opportunity.dataUseNotice,
          consentedAt: new Date().toISOString(),
        }),
        paymentState: requiresPayment ? "pending" : "not_required",
        trackName: input.trackName || "",
        submittedAt: requiresPayment ? null : new Date(),
      },
    })

    await tx.formResponse.create({
      data: {
        applicationId: app.id,
        responsesJson: toJsonString(input.responses || {}),
      },
    })

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: app.id,
        fromStatus: "new",
        toStatus: app.status,
        actorId: ctx.userId,
        reasonCategory: requiresPayment ? "payment_pending" : "applicant_submitted",
        participantNote: requiresPayment
          ? "Seat reserved temporarily pending checkout payment confirmation."
          : "Application received and confirmed.",
      },
    })

    if (opportunity.jobRequisition) {
      await tx.candidateStage.create({
        data: {
          requisitionId: opportunity.jobRequisition.id,
          applicationId: app.id,
          canonicalStage: "new",
        },
      })
    }

    // Create PersonalTask if payment or submission pending
    if (requiresPayment) {
      await tx.personalTask.create({
        data: {
          userId: ctx.userId,
          title: `Complete payment for ${opportunity.title}`,
          description: `Finish checkout to confirm application ${receiptCode}.`,
          sourceType: "payment",
          sourceId: app.id,
          actionUrl: `/opportunities/${opportunity.slug}`,
          dueAt: opportunity.registrationCloseAt,
          priority: "high",
        },
      })
    }

    let paymentOrder: any = null
    let paymentIntent: any = null
    if (requiresPayment) {
      const taxAmount = Math.round(opportunity.feeAmount * 0.18)
      const order = await tx.paymentOrder.create({
        data: {
          orderNumber: `ORD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          userId: ctx.userId,
          organizationId: opportunity.organizationId,
          opportunityId: opportunity.id,
          idempotencyKey: `app-pay-${app.id}`,
          subtotalAmount: opportunity.feeAmount,
          taxAmount,
          platformFeeAmount: 0,
          totalAmount: opportunity.feeAmount + taxAmount,
          currency: opportunity.currency,
          status: "pending",
          refundPolicySnapshot: opportunity.refundPolicy,
        },
      })
      paymentIntent = createPaymentIntentAdapter(order)
      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: paymentIntent.provider,
          providerIntentId: paymentIntent.providerIntentId,
          status: "initiated",
        },
      })
      paymentOrder = order
    }

    // Qualify referral if referred user applied
    const referral = await tx.referralEvent.findFirst({
      where: { referredUserId: ctx.userId, status: "registered" },
    })
    if (referral) {
      await tx.referralEvent.update({
        where: { id: referral.id },
        data: { status: "qualified", opportunityId: opportunity.id },
      })
      await tx.ambassadorProfile.update({
        where: { id: referral.ambassadorId },
        data: { points: { increment: 25 } },
      })
    }

    await tx.user.update({
      where: { id: ctx.userId },
      data: { points: { increment: requiresPayment ? 0 : 50 } },
    })

    return { application: app, paymentOrder, paymentIntent }
  })

  await createNotification({
    userId: ctx.userId,
    category: "transactional",
    title: requiresPayment
      ? `Action required: Complete payment for ${opportunity.title}`
      : `Application confirmed: ${opportunity.title}`,
    body: requiresPayment
      ? `Receipt ${receiptCode} created. Complete checkout to finalize registration.`
      : `Your application (${receiptCode}) for ${opportunity.title} is confirmed.`,
    actionUrl: `/dashboard?tab=applications`,
    sendEmail: true,
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: opportunity.organizationId,
    action: "application.submitted",
    resourceType: "application",
    resourceId: result.application.id,
    afterSummary: { receiptCode, status: result.application.status },
  })

  return { ...result, deduplicated: false }
}

export async function transitionApplicationStatus(
  ctx: AuthContext,
  input: {
    applicationId: string
    toStatus: string
    customStatusLabel?: string
    reasonCategory?: string
    participantNote?: string
    internalNote?: string
  }
) {
  const app = await prisma.application.findUnique({
    where: { id: input.applicationId },
    include: { opportunity: true },
  })
  if (!app) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Application not found.", 404)
  }

  // Participant may withdraw their own application; organizers/recruiters transition others
  const isOwnerWithdrawing = app.userId === ctx.userId && input.toStatus === "withdrawn"
  if (!isOwnerWithdrawing) {
    assertPermission(ctx, "event:write", app.opportunity.organizationId)
  }

  const fromStatus = app.status
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.application.update({
      where: { id: app.id },
      data: {
        status: input.toStatus,
        customStatusLabel: input.customStatusLabel ?? app.customStatusLabel,
      },
    })
    await tx.applicationStatusHistory.create({
      data: {
        applicationId: app.id,
        fromStatus,
        toStatus: input.toStatus,
        actorId: ctx.userId,
        reasonCategory: input.reasonCategory || "status_update",
        participantNote: input.participantNote || "",
        internalNote: input.internalNote || "",
      },
    })

    if (input.toStatus === "withdrawn" && app.opportunity.capacity !== null) {
      await tx.opportunity.updateMany({
        where: { id: app.opportunityId, reservedCount: { gt: 0 } },
        data: { reservedCount: { decrement: 1 } },
      })
    }
    return u
  })

  await createNotification({
    userId: app.userId,
    category: "transactional",
    title: `Application update: ${app.opportunity.title}`,
    body: `Your application status moved from ${fromStatus} to ${input.customStatusLabel || input.toStatus}.${
      input.participantNote ? ` Note: ${input.participantNote}` : ""
    }`,
    actionUrl: `/dashboard?tab=applications`,
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: app.opportunity.organizationId,
    action: "application.status_transition",
    resourceType: "application",
    resourceId: app.id,
    beforeSummary: { status: fromStatus },
    afterSummary: { status: input.toStatus },
    reasonCode: input.reasonCategory || "status_update",
  })

  return updated
}
