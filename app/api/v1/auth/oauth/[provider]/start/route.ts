import { NextRequest } from "next/server"
import { createOAuthStartUrl } from "@/backend/adapters/oauth.adapter"
import { validateReturnToUrl } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const returnTo = validateReturnToUrl(body?.returnTo)
    const result = createOAuthStartUrl(params.provider, returnTo)
    return apiSuccess(result)
  } catch (err) {
    return apiError(err)
  }
}
