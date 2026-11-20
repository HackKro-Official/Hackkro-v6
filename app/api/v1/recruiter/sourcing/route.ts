import { NextRequest } from "next/server"
import prisma, { toJsonString } from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import { searchConsentedTalent } from "@/backend/modules/hiring.service"
import { createNotification } from "@/backend/modules/notifications.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get("organizationId") || ctx.activeOrganizationId
    if (!organizationId) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Organization context required.", 400)
    }
    assertPermission(ctx, "candidate:read", organizationId)

    const [candidates, pools, savedSearches, campaigns] = await Promise.all([
      searchConsentedTalent(ctx, organizationId, {
        skill: searchParams.get("skill") || undefined,
        graduationYear: searchParams.get("graduationYear") || undefined,
        location: searchParams.get("location") || undefined,
      }),
      prisma.talentPool.findMany({
        where: { organizationId },
        include: { candidates: { include: { user: { select: { id: true, displayName: true } } } } },
      }),
      prisma.savedSearch.findMany({ where: { organizationId } }),
      prisma.outreachCampaign.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }),
    ])

    return apiSuccess({ candidates, pools, savedSearches, campaigns })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const organizationId = body.organizationId || ctx.activeOrganizationId
    if (!organizationId) throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Organization context required.", 400)
    assertPermission(ctx, "candidate:read", organizationId)

    if (body.action === "create_pool") {
      const pool = await prisma.talentPool.create({
        data: {
          organizationId,
          name: body.name,
          description: body.description || "",
          ownerId: ctx.userId,
          retentionDays: Number(body.retentionDays || 180),
        },
      })
      return apiSuccess({ pool }, 201)
    }

    if (body.action === "add_to_pool") {
      const entry = await prisma.talentPoolCandidate.upsert({
        where: { poolId_userId: { poolId: body.poolId, userId: body.userId } },
        update: { reason: body.reason || "Sourced match" },
        create: {
          poolId: body.poolId,
          userId: body.userId,
          addedBy: ctx.userId,
          reason: body.reason || "Sourced match",
          tagsJson: toJsonString(body.tags || []),
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
      })
      return apiSuccess({ entry }, 201)
    }

    if (body.action === "save_search") {
      const saved = await prisma.savedSearch.create({
        data: {
          organizationId,
          userId: ctx.userId,
          name: body.name,
          filtersJson: toJsonString(body.filters || {}),
        },
      })
      return apiSuccess({ savedSearch: saved }, 201)
    }

    if (body.action === "send_outreach") {
      const recipientIds: string[] = Array.isArray(body.recipientIds) ? body.recipientIds.slice(0, 25) : []
      for (const uid of recipientIds) {
        await createNotification({
          userId: uid,
          category: "marketing",
          title: body.subject,
          body: body.bodyTemplate,
          actionUrl: "/jobs",
        })
      }
      const campaign = await prisma.outreachCampaign.create({
        data: {
          organizationId,
          senderId: ctx.userId,
          subject: body.subject,
          bodyTemplate: body.bodyTemplate,
          recipientIdsJson: toJsonString(recipientIds),
          sentCount: recipientIds.length,
          deliveredCount: recipientIds.length,
        },
      })
      return apiSuccess({ campaign }, 201)
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported sourcing action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
