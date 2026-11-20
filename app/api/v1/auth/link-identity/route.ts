import { NextRequest } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { linkExternalIdentity } from "@/backend/modules/auth.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

const linkSchema = z.object({
  provider: z.string().min(1),
  providerSubject: z.string().min(1),
  providerEmail: z.string().email(),
  providerEmailVerified: z.boolean().default(true),
  proofPassword: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const parsed = linkSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }
    const identity = await linkExternalIdentity(ctx, parsed.data)
    return apiSuccess({ identity }, 201)
  } catch (err) {
    return apiError(err)
  }
}
