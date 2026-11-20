import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { assertPermission, getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import { createSupportTicketRecord } from "@/backend/modules/ecosystem-platform.service"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const section = searchParams.get("section") || "overview"

    if (section === "my_tickets") {
      const tickets = await prisma.supportTicket.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
      })
      return apiSuccess({ tickets })
    }

    const isAdminOrStaff = ["platform_admin", "security_admin", "moderator", "support_agent"].includes(
      ctx.activeRole
    )
    if (!isAdminOrStaff) {
      throw new AppError(ERROR_CODES.FORBIDDEN, "Platform staff permissions required.", 403)
    }

    const [
      users,
      organizations,
      pendingOpportunities,
      reports,
      tickets,
      flags,
      auditLogs,
      refunds,
      analyticsCounts,
    ] = await Promise.all([
      prisma.user.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          displayName: true,
          primaryEmail: true,
          primaryPhoneE164: true,
          status: true,
          primaryIntent: true,
          createdAt: true,
        },
      }),
      prisma.organization.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.opportunity.findMany({
        where: { status: { in: ["pending_review", "live", "flagged"] } },
        include: { organization: { select: { displayName: true, verificationStatus: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.moderationReport.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.featureFlag.findMany({ orderBy: { key: "asc" } }),
      prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
      prisma.refund.findMany({
        include: { order: { select: { orderNumber: true, totalAmount: true, currency: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["eventName"],
        _count: { eventName: true },
      }),
    ])

    return apiSuccess({
      users,
      organizations,
      opportunities: pendingOpportunities,
      reports,
      tickets,
      flags,
      auditLogs,
      refunds,
      analyticsKpis: analyticsCounts.map((g) => ({ eventName: g.eventName, count: g._count.eventName })),
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action as string

    // Public/Authenticated Support Ticket & Content Reporting routes
    if (action === "create_ticket") {
      const ctx = await getAuthContext(req)
      const ticket = await createSupportTicketRecord(ctx, {
        email: body.email || ctx?.primaryEmail || "guest@hackkro.local",
        category: body.category || "general",
        priority: body.priority || "medium",
        subject: body.subject,
        message: body.message,
        linkedResourceType: body.linkedResourceType,
        linkedResourceId: body.linkedResourceId,
      })
      return apiSuccess({ ticket }, 201)
    }

    if (action === "report_content") {
      const ctx = await getAuthContext(req)
      const report = await prisma.moderationReport.create({
        data: {
          reporterId: ctx?.userId ?? null,
          targetType: body.targetType,
          targetId: body.targetId,
          reasonCategory: body.reasonCategory || "suspicious_listing",
          details: body.details || "",
          status: "flagged",
        },
      })
      return apiSuccess({ report }, 201)
    }

    const ctx = await requireAuth(req)

    if (action === "verify_org") {
      assertPermission(ctx, "admin:verify_org")
      const org = await prisma.organization.update({
        where: { id: body.organizationId },
        data: {
          verificationStatus: body.decision, // verified | rejected | suspended
          verifiedBy: ctx.userId,
          verifiedAt: body.decision === "verified" ? new Date() : null,
          rejectionReason: body.reason || null,
        },
      })
      await recordAuditEvent({
        actorId: ctx.userId,
        actorRole: ctx.activeRole,
        tenantId: org.id,
        action: "admin.org_verification",
        resourceType: "organization",
        resourceId: org.id,
        afterSummary: { verificationStatus: org.verificationStatus },
        reasonCode: body.reason || "",
      })
      return apiSuccess({ organization: org })
    }

    if (action === "moderate_listing") {
      assertPermission(ctx, "moderation:action")
      const op = await prisma.opportunity.update({
        where: { id: body.opportunityId },
        data: {
          status: body.status, // live | rejected | archived
          statusReason: body.reason || "",
        },
      })
      await recordAuditEvent({
        actorId: ctx.userId,
        actorRole: ctx.activeRole,
        tenantId: op.organizationId,
        action: "admin.listing_moderated",
        resourceType: "opportunity",
        resourceId: op.id,
        afterSummary: { status: op.status },
      })
      return apiSuccess({ opportunity: op })
    }

    if (action === "update_report") {
      assertPermission(ctx, "moderation:action")
      const report = await prisma.moderationReport.update({
        where: { id: body.reportId },
        data: {
          status: body.status,
          assigneeId: ctx.userId,
          policyCode: body.policyCode || "",
          decisionNote: body.decisionNote || "",
        },
      })
      await recordAuditEvent({
        actorId: ctx.userId,
        actorRole: ctx.activeRole,
        action: "moderation.report_updated",
        resourceType: "moderation_report",
        resourceId: report.id,
        afterSummary: { status: report.status, policyCode: report.policyCode },
      })
      return apiSuccess({ report })
    }

    if (action === "update_user_status") {
      assertPermission(ctx, "admin:user_manage")
      const target = await prisma.user.update({
        where: { id: body.userId },
        data: { status: body.status },
      })
      if (["suspended", "closed"].includes(body.status)) {
        await prisma.session.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
      await recordAuditEvent({
        actorId: ctx.userId,
        actorRole: ctx.activeRole,
        action: "admin.user_status_changed",
        resourceType: "user",
        resourceId: target.id,
        afterSummary: { status: target.status },
        reasonCode: body.reason || "admin_action",
      })
      return apiSuccess({ user: target })
    }

    if (action === "toggle_flag") {
      assertPermission(ctx, "admin:flags_manage")
      const flag = await prisma.featureFlag.upsert({
        where: { key: body.key },
        update: { enabled: Boolean(body.enabled), updatedBy: ctx.userId },
        create: {
          key: body.key,
          description: body.description || body.key,
          enabled: Boolean(body.enabled),
          updatedBy: ctx.userId,
        },
      })
      await recordAuditEvent({
        actorId: ctx.userId,
        actorRole: ctx.activeRole,
        action: "admin.feature_flag_updated",
        resourceType: "feature_flag",
        resourceId: flag.id,
        afterSummary: { key: flag.key, enabled: flag.enabled },
      })
      return apiSuccess({ flag })
    }

    if (action === "reply_ticket") {
      assertPermission(ctx, "support:reply")
      const ticket = await prisma.supportTicket.findUnique({ where: { id: body.ticketId } })
      if (!ticket) throw new AppError(ERROR_CODES.NOT_FOUND, "Support ticket not found.", 404)
      const msgs = JSON.parse(ticket.messagesJson || "[]")
      msgs.push({
        id: crypto.randomUUID(),
        senderRole: ctx.activeRole,
        senderId: ctx.userId,
        body: body.message,
        isInternal: Boolean(body.isInternal),
        createdAt: new Date().toISOString(),
      })
      const updated = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: body.status || "in_progress",
          assigneeId: ctx.userId,
          messagesJson: JSON.stringify(msgs),
        },
      })
      return apiSuccess({ ticket: updated })
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported admin action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
