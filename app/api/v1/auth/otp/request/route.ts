import { NextRequest } from "next/server"
import { otpRequestSchema } from "@/backend/schemas/auth.schema"
import { requestOtpChallenge } from "@/backend/modules/auth.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { getClientMeta } from "@/backend/utils/rbac-abac"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = otpRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }
    const { ipAddress } = getClientMeta(req)
    const result = await requestOtpChallenge({
      identifier: parsed.data.identifier,
      countryDialCode: parsed.data.countryDialCode,
      purpose: parsed.data.purpose,
      ipAddress,
    })
    return apiSuccess(result)
  } catch (err) {
    return apiError(err)
  }
}
