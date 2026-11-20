import { NextRequest } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { verifyPassword } from "@/backend/utils/crypto"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

const reauthSchema = z.object({
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const body = await req.json()
    const parsed = reauthSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Password is required.", 400)
    }
    const cred = await prisma.passwordCredential.findUnique({ where: { userId: ctx.userId } })
    if (!cred || !verifyPassword(parsed.data.password, cred.passwordHash)) {
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Password verification failed.", 401)
    }
    await prisma.session.update({
      where: { id: ctx.sessionId },
      data: { lastReauthAt: new Date() },
    })
    return apiSuccess({ reauthenticated: true, validForMinutes: 15 })
  } catch (err) {
    return apiError(err)
  }
}
