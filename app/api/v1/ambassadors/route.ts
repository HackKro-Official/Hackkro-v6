import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { getAuthContext, getClientMeta, requireAuth } from "@/backend/utils/rbac-abac"
import { sha256Hex } from "@/backend/utils/crypto"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const profile = await prisma.ambassadorProfile.findUnique({
      where: { userId: ctx.userId },
      include: {
        referralEvents: {
          orderBy: { createdAt: "desc" },
          include: {
            referredUser: { select: { displayName: true } },
            opportunity: { select: { title: true } },
          },
        },
      },
    })
    return apiSuccess({ ambassador: profile })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ipAddress } = getClientMeta(req)

    if (body.action === "track_click") {
      const code = String(body.referralCode || "").trim().toUpperCase()
      const amb = await prisma.ambassadorProfile.findUnique({ where: { referralCode: code } })
      if (!amb) return apiSuccess({ tracked: false })

      const ctx = await getAuthContext(req)
      // Self-referral fraud check
      if (ctx && ctx.userId === amb.userId) {
        await prisma.referralEvent.create({
          data: {
            ambassadorId: amb.id,
            referralCode: code,
            referredUserId: ctx.userId,
            status: "flagged_fraud",
            fraudReason: "Self-referral attempt detected",
            fingerprintHash: sha256Hex(ipAddress),
          },
        })
        return apiSuccess({ tracked: false, flagged: "self_referral" })
      }

      const ev = await prisma.referralEvent.create({
        data: {
          ambassadorId: amb.id,
          referralCode: code,
          opportunityId: body.opportunityId || null,
          status: "clicked",
          fingerprintHash: sha256Hex(ipAddress),
        },
      })
      return apiSuccess({ tracked: true, eventId: ev.id })
    }

    const ctx = await requireAuth(req)
    if (body.action === "apply") {
      const existing = await prisma.ambassadorProfile.findUnique({ where: { userId: ctx.userId } })
      if (existing) return apiSuccess({ ambassador: existing })

      const code = `HK-${ctx.displayName.replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
      const amb = await prisma.ambassadorProfile.create({
        data: {
          userId: ctx.userId,
          institutionName: body.institutionName,
          city: body.city || "",
          state: body.state || "",
          referralCode: code,
          campaignNotes: body.campaignNotes || "",
          status: "pending",
        },
      })
      return apiSuccess({ ambassador: amb }, 201)
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported ambassador action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
