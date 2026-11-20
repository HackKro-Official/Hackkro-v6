import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { clearSessionCookies } from "@/backend/modules/auth.service"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { apiError, apiSuccess } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const result = await prisma.session.updateMany({
      where: { userId: ctx.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    await recordAuditEvent({
      actorId: ctx.userId,
      actorRole: ctx.activeRole,
      action: "auth.logout_all",
      resourceType: "user",
      resourceId: ctx.userId,
      afterSummary: { revokedCount: result.count },
    })

    const res = apiSuccess({ revokedCount: result.count, message: "All device sessions have been signed out." })
    return clearSessionCookies(res)
  } catch (err) {
    return apiError(err)
  }
}
