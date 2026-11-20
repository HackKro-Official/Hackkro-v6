import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import {
  performParticipantCheckIn,
  triggerContingencyEvent,
} from "@/backend/modules/events-submissions.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireAuth(req)
    const op = await prisma.opportunity.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    })
    if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Event not found.", 404)
    assertPermission(ctx, "event:read", op.organizationId)

    const [applicationsCount, teamsCount, checkIns, submissionsCount, incidents] = await Promise.all([
      prisma.application.count({ where: { opportunityId: op.id, status: { notIn: ["withdrawn", "cancelled"] } } }),
      prisma.team.count({ where: { opportunityId: op.id } }),
      prisma.checkIn.findMany({
        where: { opportunityId: op.id },
        include: { user: { select: { id: true, displayName: true, primaryEmail: true } } },
        orderBy: { checkedInAt: "desc" },
      }),
      prisma.submission.count({ where: { opportunityId: op.id, status: { not: "draft" } } }),
      prisma.incidentEvent.findMany({
        where: { opportunityId: op.id },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return apiSuccess({
      opportunity: op,
      metrics: {
        registrations: applicationsCount,
        teams: teamsCount,
        checkedIn: checkIns.length,
        submissions: submissionsCount,
      },
      checkIns,
      incidents,
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const op = await prisma.opportunity.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    })
    if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Event not found.", 404)

    if (body.action === "checkin") {
      const checkIn = await performParticipantCheckIn(ctx, {
        opportunityId: op.id,
        userId: body.userId,
        qrToken: body.qrToken,
        mode: body.mode || "qr",
        notes: body.notes,
      })
      return apiSuccess({ checkIn }, 201)
    }

    if (body.action === "contingency") {
      const incident = await triggerContingencyEvent(ctx, {
        opportunityId: op.id,
        incidentType: body.incidentType,
        reason: body.reason,
        revisedDeadline: body.revisedDeadline,
      })
      return apiSuccess({ incident }, 201)
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported event operation.", 400)
  } catch (err) {
    return apiError(err)
  }
}
