import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const sessions = await prisma.session.findMany({
      where: { userId: ctx.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
      select: {
        id: true,
        deviceLabel: true,
        ipAddress: true,
        activeRole: true,
        activeOrganizationId: true,
        rememberDevice: true,
        lastSeenAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    const identities = await prisma.authIdentity.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        provider: true,
        providerEmail: true,
        providerEmailVerified: true,
        createdAt: true,
      },
    })

    return apiSuccess({
      sessions: sessions.map((s) => ({ ...s, isCurrent: s.id === ctx.sessionId })),
      identities,
    })
  } catch (err) {
    return apiError(err)
  }
}
