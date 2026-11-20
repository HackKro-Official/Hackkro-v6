import { NextRequest } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import { submitApplication } from "@/backend/modules/applications.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

const applySchema = z.object({
  opportunityId: z.string().min(1),
  teamId: z.string().optional(),
  resumeVersionId: z.string().optional(),
  trackName: z.string().optional(),
  responses: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().optional(),
  requestManualException: z.boolean().optional(),
  manualExceptionReason: z.string().optional(),
  consentAccepted: z.boolean(),
})

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const opportunityId = searchParams.get("opportunityId")

    if (opportunityId) {
      const op = await prisma.opportunity.findUnique({ where: { id: opportunityId } })
      if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)
      assertPermission(ctx, "event:read", op.organizationId)

      const applications = await prisma.application.findMany({
        where: { opportunityId: op.id },
        include: {
          user: { select: { id: true, displayName: true, primaryEmail: true, profile: true } },
          team: { select: { id: true, name: true } },
          resumeVersion: { select: { id: true, title: true, fileName: true } },
          formResponse: true,
          statusHistory: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      })
      return apiSuccess({ applications })
    }

    const applications = await prisma.application.findMany({
      where: { userId: ctx.userId },
      include: {
        opportunity: {
          include: { organization: { select: { displayName: true, verificationStatus: true } } },
        },
        team: { select: { id: true, name: true } },
        resumeVersion: { select: { id: true, title: true, fileName: true } },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    })
    return apiSuccess({ applications })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const parsed = applySchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }
    const result = await submitApplication(ctx, parsed.data)
    return apiSuccess(result, result.deduplicated ? 200 : 201)
  } catch (err) {
    return apiError(err)
  }
}
