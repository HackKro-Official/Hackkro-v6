import { NextRequest } from "next/server"
import { getAuthContext } from "@/backend/utils/rbac-abac"
import { getRecommendationsForUser, searchOpportunities } from "@/backend/modules/opportunities.service"
import { apiError, apiSuccess } from "@/backend/utils/error-codes"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    if (!ctx) {
      const featured = await searchOpportunities({ sort: "popularity", limit: 6 })
      return apiSuccess({ personalized: false, items: featured.items })
    }

    const privacy = await prisma.privacySettings.findUnique({ where: { userId: ctx.userId } })
    if (privacy && !privacy.personalizationConsent) {
      const popular = await searchOpportunities({ sort: "popularity", limit: 6 })
      return apiSuccess({ personalized: false, items: popular.items })
    }

    const items = await getRecommendationsForUser(ctx.userId)
    return apiSuccess({ personalized: true, items })
  } catch (err) {
    return apiError(err)
  }
}
