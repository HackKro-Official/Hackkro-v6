import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { assertRecentReauth, requireAuth } from "@/backend/utils/rbac-abac"
import { buildUserPortabilityExport } from "@/backend/modules/ecosystem-platform.service"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const [privacy, consents, exportsList] = await Promise.all([
      prisma.privacySettings.findUnique({ where: { userId: ctx.userId } }),
      prisma.consentRecord.findMany({ where: { userId: ctx.userId }, orderBy: { createdAt: "desc" } }),
      prisma.dataExportRequest.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ])
    return apiSuccess({ privacy, consents, exports: exportsList })
  } catch (err) {
    return apiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const body = await req.json()

    const updated = await prisma.privacySettings.upsert({
      where: { userId: ctx.userId },
      update: {
        ...(body.profileVisibility ? { profileVisibility: body.profileVisibility } : {}),
        ...(body.resumeVisibility ? { resumeVisibility: body.resumeVisibility } : {}),
        ...(body.recruiterDiscovery !== undefined ? { recruiterDiscovery: Boolean(body.recruiterDiscovery) } : {}),
        ...(body.contactSharing !== undefined ? { contactSharing: Boolean(body.contactSharing) } : {}),
        ...(body.marketingOptIn !== undefined ? { marketingOptIn: Boolean(body.marketingOptIn) } : {}),
        ...(body.publicPortfolio !== undefined ? { publicPortfolio: Boolean(body.publicPortfolio) } : {}),
        ...(body.personalizationConsent !== undefined
          ? { personalizationConsent: Boolean(body.personalizationConsent) }
          : {}),
      },
      create: {
        userId: ctx.userId,
        recruiterDiscovery: Boolean(body.recruiterDiscovery),
        marketingOptIn: Boolean(body.marketingOptIn),
      },
    })

    if (body.marketingOptIn !== undefined) {
      await prisma.consentRecord.create({
        data: {
          userId: ctx.userId,
          consentType: "marketing",
          version: "v3.0-2026",
          locale: ctx.locale,
          granted: Boolean(body.marketingOptIn),
        },
      })
    }

    return apiSuccess({ privacy: updated })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const body = await req.json()

    if (body.action === "request_export") {
      const exportJob = await buildUserPortabilityExport(ctx)
      await recordAuditEvent({
        actorId: ctx.userId,
        actorRole: ctx.activeRole,
        action: "privacy.data_export",
        resourceType: "data_export",
        resourceId: exportJob.id,
      })
      return apiSuccess({ exportJob }, 201)
    }

    if (body.action === "request_deletion") {
      assertRecentReauth(ctx, 15)
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: ctx.userId },
          data: { status: "deletion_requested", deletedAt: new Date() },
        })
        await tx.session.updateMany({
          where: { userId: ctx.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      })
      await recordAuditEvent({
        actorId: ctx.userId,
        actorRole: ctx.activeRole,
        action: "privacy.deletion_requested",
        resourceType: "user",
        resourceId: ctx.userId,
      })
      return apiSuccess({
        status: "deletion_requested",
        message: "Account deletion workflow initiated and all active sessions revoked.",
      })
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported privacy action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
