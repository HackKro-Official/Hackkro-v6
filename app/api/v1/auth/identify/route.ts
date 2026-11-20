import { NextRequest } from "next/server"
import { identifySchema } from "@/backend/schemas/auth.schema"
import { identifyStep } from "@/backend/modules/auth.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { getClientMeta } from "@/backend/utils/rbac-abac"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = identifySchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }
    const { ipAddress } = getClientMeta(req)
    const result = await identifyStep(parsed.data.identifier, parsed.data.countryDialCode, ipAddress)
    return apiSuccess(result)
  } catch (err) {
    return apiError(err)
  }
}
