import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { getAuthContext, verifyCsrfIfCookieAuth } from "@/backend/utils/rbac-abac"
import { clearSessionCookies } from "@/backend/modules/auth.service"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { apiError, apiSuccess } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    if (ctx) {
      verifyCsrfIfCookieAuth(req, ctx.csrfToken)
      await prisma.session.update({
        where: { id: ctx.sessionId },
        data: { revokedAt: new Date() },
      })
      await recordAuditEvent({
        actorId: ctx.userId,
        actorRole: ctx.activeRole,
        action: "auth.logout",
        resourceType: "session",
        resourceId: ctx.sessionId,
      })
    }
    const res = apiSuccess({ message: "Signed out successfully." })
    return clearSessionCookies(res)
  } catch (err) {
    return apiError(err)
  }
}
