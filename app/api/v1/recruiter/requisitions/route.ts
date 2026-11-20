import { NextRequest } from "next/server"
import prisma, { safeParseJson } from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import { createJobRequisition } from "@/backend/modules/hiring.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get("organizationId") || ctx.activeOrganizationId
    if (!organizationId) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Select a recruiter organization workspace.", 400)
    }
    assertPermission(ctx, "candidate:read", organizationId)

    const requisitions = await prisma.jobRequisition.findMany({
      where: { organizationId },
      include: {
        opportunity: true,
        candidateStages: {
          include: {
            application: {
              include: {
                user: { select: { id: true, displayName: true, primaryEmail: true, profile: true, skills: true } },
                resumeVersion: { select: { id: true, title: true, fileName: true } },
                interviews: { include: { scorecards: true } },
                offer: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess({
      requisitions: requisitions.map((r) => ({
        ...r,
        customStages: safeParseJson(r.customStagesJson, []),
        candidateStages: r.candidateStages.map((cs) => ({
          ...cs,
          privateNotes: safeParseJson(cs.privateNotesJson, []),
          aiSummary: safeParseJson(cs.aiSummaryJson, {}),
        })),
      })),
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const created = await createJobRequisition(ctx, body)
    return apiSuccess(created, 201)
  } catch (err) {
    return apiError(err)
  }
}
