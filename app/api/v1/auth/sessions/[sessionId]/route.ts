import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const target = await prisma.session.findUnique({ where: { id: params.sessionId } })
    if (!target || target.userId !== ctx.userId) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Session not found.", 404)
    }

    await prisma.session.update({
      where: { id: target.id },
      data: { revokedAt: new Date() },
    })

    return apiSuccess({ revokedSessionId: target.id })
  } catch (err) {
    return apiError(err)
  }
}
