import { NextRequest } from "next/server"
import { z } from "zod"
import { getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import {
  createOrUpdateOpportunity,
  searchOpportunities,
} from "@/backend/modules/opportunities.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

const upsertSchema = z.object({
  id: z.string().optional(),
  organizationId: z.string().min(1),
  title: z.string().min(3).max(180),
  shortSummary: z.string().min(10).max(400),
  fullDescription: z.string().min(10),
  type: z.string().min(1),
  category: z.string().min(1),
  visibility: z.enum(["public", "unlisted", "invite_only", "org_only"]).optional(),
  status: z.string().optional(),
  locationMode: z.enum(["online", "offline", "hybrid"]).optional(),
  locationText: z.string().optional(),
  venue: z.string().optional(),
  registrationOpenAt: z.string().nullable().optional(),
  registrationCloseAt: z.string().nullable().optional(),
  eventStartAt: z.string().nullable().optional(),
  eventEndAt: z.string().nullable().optional(),
  timezone: z.string().optional(),
  teamMin: z.number().int().min(1).optional(),
  teamMax: z.number().int().min(1).max(20).optional(),
  capacity: z.number().int().positive().nullable().optional(),
  feeAmount: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  refundPolicy: z.string().optional(),
  prizeText: z.string().optional(),
  stipendText: z.string().optional(),
  salaryShared: z.boolean().optional(),
  salaryMin: z.number().int().nullable().optional(),
  salaryMax: z.number().int().nullable().optional(),
  skills: z.array(z.string()).optional(),
  tracks: z.array(z.string()).optional(),
  perks: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  contactChannel: z.string().optional(),
  bannerAssetUrl: z.string().optional(),
  changeReason: z.string().optional(),
  confirmParticipantImpact: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    const { searchParams } = new URL(req.url)

    const result = await searchOpportunities({
      q: searchParams.get("q") || undefined,
      type: searchParams.get("type") || undefined,
      category: searchParams.get("category") || undefined,
      skill: searchParams.get("skill") || undefined,
      locationMode: searchParams.get("locationMode") || undefined,
      location: searchParams.get("location") || undefined,
      paidOnly: searchParams.get("paidOnly") === "true",
      freeOnly: searchParams.get("freeOnly") === "true",
      status: searchParams.get("status") || undefined,
      sort: (searchParams.get("sort") as any) || undefined,
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20),
      organizationId: searchParams.get("organizationId") || undefined,
      includePrivateForCtx: ctx,
    })

    return apiSuccess(result)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }

    const opportunity = await createOrUpdateOpportunity(ctx, parsed.data)
    return apiSuccess({ opportunity }, parsed.data.id ? 200 : 201)
  } catch (err) {
    return apiError(err)
  }
}
