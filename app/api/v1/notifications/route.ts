import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import { createNotification } from "@/backend/modules/notifications.service"
import { sanitizeHtmlServer } from "@/backend/utils/sanitizer"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const notifications = await prisma.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    })
    const unreadCount = notifications.filter((n) => !n.readAt).length
    return apiSuccess({ notifications, unreadCount })
  } catch (err) {
    return apiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const body = await req.json()
    if (body.markAll) {
      await prisma.notification.updateMany({
        where: { userId: ctx.userId, readAt: null },
        data: { readAt: new Date(), deliveryStatus: "read" },
      })
      return apiSuccess({ markedAll: true })
    }
    if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, userId: ctx.userId },
        data: { readAt: new Date(), deliveryStatus: "read" },
      })
      return apiSuccess({ read: true })
    }
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Provide id or markAll.", 400)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    assertPermission(ctx, "event:broadcast", body.organizationId)

    const apps = await prisma.application.findMany({
      where: {
        opportunityId: body.opportunityId,
        status: { notIn: ["withdrawn", "cancelled"] },
      },
      select: { userId: true },
    })

    const isLarge = apps.length >= 100
    const campaign = await prisma.messageCampaign.create({
      data: {
        organizationId: body.organizationId,
        opportunityId: body.opportunityId || null,
        senderId: ctx.userId,
        subject: body.subject,
        bodyHtml: sanitizeHtmlServer(body.bodyHtml || body.message || ""),
        recipientCount: apps.length,
        approvalStatus: isLarge ? "pending_approval" : "sent",
        sentAt: isLarge ? null : new Date(),
      },
    })

    if (!isLarge) {
      for (const a of apps) {
        await createNotification({
          userId: a.userId,
          category: "transactional",
          title: body.subject,
          body: body.plainText || body.message || body.subject,
          actionUrl: "/dashboard?tab=applications",
        })
      }
    }

    return apiSuccess({ campaign }, 201)
  } catch (err) {
    return apiError(err)
  }
}
