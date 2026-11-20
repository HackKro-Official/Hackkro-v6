import { NextRequest } from "next/server"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { unlinkExternalIdentity } from "@/backend/modules/auth.service"
import { apiError, apiSuccess } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { identityId: string } }
) {
  try {
    const ctx = await requireAuth(req)
    const result = await unlinkExternalIdentity(ctx, params.identityId)
    return apiSuccess(result)
  } catch (err) {
    return apiError(err)
  }
}
