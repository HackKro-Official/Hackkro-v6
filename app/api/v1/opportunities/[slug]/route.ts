import { NextRequest } from "next/server"
import prisma, { safeParseJson } from "@/lib/db"
import { getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import { evaluateUserEligibility } from "@/backend/modules/eligibility.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const ctx = await getAuthContext(req)
    const op = await prisma.opportunity.findFirst({
      where: { OR: [{ slug: params.slug }, { id: params.slug }] },
      include: {
        organization: true,
        eligibilityRules: true,
        registrationForm: { include: { fields: { orderBy: { orderIndex: "asc" } } } },
        rounds: { orderBy: { roundNumber: "asc" } },
        rubrics: true,
        ticketTiers: true,
        incidents: { where: { active: true }, orderBy: { createdAt: "desc" } },
        _count: { select: { applications: true, teams: true } },
      },
    })

    if (!op) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)
    }

    const isOwnerOrg = ctx?.memberships.some((m) => m.organizationId === op.organizationId)
    const isAdmin = ctx && ["platform_admin", "moderator"].includes(ctx.activeRole)
    if (["draft", "pending_review", "rejected"].includes(op.status) && !isOwnerOrg && !isAdmin) {
      throw new AppError(ERROR_CODES.FORBIDDEN, "This opportunity draft is private.", 403)
    }

    let userApplication: any = null
    let eligibility: any = null
    let isSaved = false
    let isFollowingOrg = false
    let userResumes: any[] = []
    let userTeams: any[] = []

    if (ctx) {
      userApplication = await prisma.application.findFirst({
        where: {
          opportunityId: op.id,
          userId: ctx.userId,
          status: { notIn: ["withdrawn", "cancelled"] },
        },
      })
      eligibility = await evaluateUserEligibility(ctx.userId, op.id)
      isSaved = Boolean(
        await prisma.savedOpportunity.findUnique({
          where: { userId_opportunityId: { userId: ctx.userId, opportunityId: op.id } },
        })
      )
      isFollowingOrg = Boolean(
        await prisma.followOrganization.findUnique({
          where: { userId_organizationId: { userId: ctx.userId, organizationId: op.organizationId } },
        })
      )
      userResumes = await prisma.resumeVersion.findMany({
        where: { userId: ctx.userId, isArchived: false },
        orderBy: { createdAt: "desc" },
      })
      userTeams = await prisma.team.findMany({
        where: {
          opportunityId: op.id,
          members: { some: { userId: ctx.userId, status: "accepted" } },
        },
        include: { members: true },
      })
    }

    // State-aware CTA resolution (Chapter 11)
    let ctaState = "Apply"
    if (op.status === "results_published") ctaState = "Results Published"
    else if (op.status === "registration_closed" || (op.registrationCloseAt && op.registrationCloseAt < new Date())) {
      ctaState = userApplication ? "View Status" : "Registration Closed"
    } else if (userApplication) {
      ctaState = userApplication.status === "draft" ? "Continue Application" : "View Status"
    } else if (op.type === "hackathon" || op.type === "case_study") {
      ctaState = op.teamMax > 1 ? "Register / Join Team" : "Register"
    }

    // Track view analytics
    await prisma.analyticsEvent.create({
      data: {
        eventName: "opportunity_viewed",
        actorId: ctx?.userId || null,
        tenantId: op.organizationId,
        resourceType: "opportunity",
        resourceId: op.id,
      },
    }).catch(() => {})

    return apiSuccess({
      opportunity: {
        ...op,
        skills: safeParseJson(op.skillsJson, []),
        tracks: safeParseJson(op.tracksJson, []),
        perks: safeParseJson(op.perksJson, []),
        rules: safeParseJson(op.rulesJson, []),
        faqs: safeParseJson(op.faqsJson, []),
        sponsors: safeParseJson(op.sponsorsJson, []),
        winners: safeParseJson(op.winnersJson, []),
      },
      ctaState,
      userApplication,
      eligibility,
      isSaved,
      isFollowingOrg,
      userResumes,
      userTeams,
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const op = await prisma.opportunity.findFirst({
      where: { OR: [{ slug: params.slug }, { id: params.slug }] },
    })
    if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)

    if (body.action === "toggle_save") {
      const existing = await prisma.savedOpportunity.findUnique({
        where: { userId_opportunityId: { userId: ctx.userId, opportunityId: op.id } },
      })
      if (existing) {
        await prisma.savedOpportunity.delete({ where: { id: existing.id } })
        return apiSuccess({ saved: false })
      }
      await prisma.savedOpportunity.create({ data: { userId: ctx.userId, opportunityId: op.id } })
      return apiSuccess({ saved: true })
    }

    if (body.action === "toggle_follow") {
      const existing = await prisma.followOrganization.findUnique({
        where: { userId_organizationId: { userId: ctx.userId, organizationId: op.organizationId } },
      })
      if (existing) {
        await prisma.followOrganization.delete({ where: { id: existing.id } })
        return apiSuccess({ following: false })
      }
      await prisma.followOrganization.create({
        data: { userId: ctx.userId, organizationId: op.organizationId },
      })
      return apiSuccess({ following: true })
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
