import { NextRequest } from "next/server"
import { switchWorkspaceSchema } from "@/backend/schemas/auth.schema"
import { switchWorkspaceContext } from "@/backend/modules/auth.service"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const parsed = switchWorkspaceSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }
    const result = await switchWorkspaceContext(
      ctx,
      parsed.data.roleKey,
      parsed.data.organizationId ?? null
    )
    return apiSuccess(result)
  } catch (err) {
    return apiError(err)
  }
}
