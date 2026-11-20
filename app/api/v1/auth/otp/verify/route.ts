import { NextRequest } from "next/server"
import { otpVerifySchema } from "@/backend/schemas/auth.schema"
import { attachSessionCookies, verifyOtpChallenge } from "@/backend/modules/auth.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { getClientMeta } from "@/backend/utils/rbac-abac"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = otpVerifySchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }
    const meta = getClientMeta(req)
    const result = await verifyOtpChallenge({
      ...parsed.data,
      ...meta,
    })

    if (result.requiresSignup) {
      return apiSuccess({
        verified: true,
        requiresSignup: true,
        challengeId: result.challengeId,
        destinationMasked: result.destinationMasked,
      })
    }

    const res = apiSuccess({
      verified: true,
      requiresSignup: false,
      user: result.user,
      csrfToken: result.csrfToken,
      destination: result.destination,
    })
    return attachSessionCookies(
      res,
      result.rawToken!,
      result.csrfToken!,
      parsed.data.rememberDevice
    )
  } catch (err) {
    return apiError(err)
  }
}
