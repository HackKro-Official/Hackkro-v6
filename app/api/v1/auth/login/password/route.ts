import { NextRequest } from "next/server"
import { passwordLoginSchema } from "@/backend/schemas/auth.schema"
import { attachSessionCookies, loginWithPassword } from "@/backend/modules/auth.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { getClientMeta } from "@/backend/utils/rbac-abac"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = passwordLoginSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }
    const meta = getClientMeta(req)
    const result = await loginWithPassword({
      ...parsed.data,
      ...meta,
    })

    const res = apiSuccess({
      user: result.user,
      csrfToken: result.csrfToken,
      destination: result.destination,
    })
    return attachSessionCookies(res, result.rawToken, result.csrfToken, parsed.data.rememberDevice)
  } catch (err) {
    return apiError(err)
  }
}
