import { NextRequest } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { transitionApplicationStatus } from "@/backend/modules/applications.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { APPLICATION_STATUSES } from "@/config/taxonomies"

export const dynamic = "force-dynamic"

const transitionSchema = z.object({
  toStatus: z.enum(APPLICATION_STATUSES),
  customStatusLabel: z.string().optional(),
  reasonCategory: z.string().optional(),
  participantNote: z.string().optional(),
  internalNote: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const parsed = transitionSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }
    const application = await transitionApplicationStatus(ctx, {
      applicationId: params.id,
      ...parsed.data,
    })
    return apiSuccess({ application })
  } catch (err) {
    return apiError(err)
  }
}
