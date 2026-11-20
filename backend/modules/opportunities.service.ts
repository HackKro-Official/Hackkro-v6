import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { AuthContext, assertPermission } from "@/backend/utils/rbac-abac"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { createNotification } from "@/backend/modules/notifications.service"
import { sanitizeHtmlServer, sanitizePlainText } from "@/backend/utils/sanitizer"

const SYNONYMS: Record<string, string[]> = {
  ai: ["artificial intelligence", "machine learning", "ml", "llm", "genai"],
  ml: ["machine learning", "ai", "data science"],
  frontend: ["react", "next.js", "ui", "typescript", "javascript"],
  backend: ["node", "api", "python", "sql", "postgresql"],
  hackathon: ["buildathon", "coding sprint", "innovation challenge"],
  job: ["full-time", "hiring", "role", "career"],
  internship: ["intern", "summer intern", "apprenticeship"],
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[n]
}

function expandSearchTerms(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)
  const expanded = new Set(tokens)
  for (const t of tokens) {
    if (SYNONYMS[t]) {
      SYNONYMS[t].forEach((s) => expanded.add(s))
    }
  }
  return Array.from(expanded)
}

export interface OpportunitySearchParams {
  q?: string
  type?: string
  category?: string
  skill?: string
  locationMode?: string
  location?: string
  paidOnly?: boolean
  freeOnly?: boolean
  status?: string
  sort?: "relevance" | "newest" | "deadline" | "popularity"
  page?: number
  limit?: number
  organizationId?: string
  includePrivateForCtx?: AuthContext | null
}

export async function searchOpportunities(params: OpportunitySearchParams) {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(50, Math.max(1, params.limit || 20))

  // Public discovery NEVER exposes draft, pending_review, rejected, or invite_only/org_only unless authorized
  const ctx = params.includePrivateForCtx
  const orgIds = ctx ? ctx.memberships.map((m) => m.organizationId) : []

  const all = await prisma.opportunity.findMany({
    where: {
      ...(params.type && params.type !== "all" ? { type: params.type } : {}),
      ...(params.category && params.category !== "all" ? { category: params.category } : {}),
      ...(params.locationMode && params.locationMode !== "all"
        ? { locationMode: params.locationMode }
        : {}),
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
    },
    include: {
      organization: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          logoUrl: true,
          verificationStatus: true,
        },
      },
      eligibilityRules: true,
      _count: {
        select: { applications: true },
      },
    },
  })

  const visible = all.filter((op) => {
    const isMemberOfOwnerOrg = orgIds.includes(op.organizationId)
    const isAdmin =
      ctx && ["platform_admin", "moderator", "security_admin"].includes(ctx.activeRole)
    const publicStatuses = ["live", "scheduled", "registration_closed", "in_progress", "completed", "results_published"]

    if (params.status && params.status !== "all") {
      if (op.status !== params.status) return false
    } else if (!isMemberOfOwnerOrg && !isAdmin && !publicStatuses.includes(op.status)) {
      return false
    }

    if (op.visibility === "public") return true
    if (op.visibility === "unlisted" && params.organizationId === op.organizationId) return true
    if (isMemberOfOwnerOrg || isAdmin) return true
    return false
  })

  const terms = params.q ? expandSearchTerms(params.q) : []

  const scored = visible
    .map((op) => {
      const skills = safeParseJson<string[]>(op.skillsJson, [])
      const tracks = safeParseJson<string[]>(op.tracksJson, [])
      const haystack = `${op.title} ${op.shortSummary} ${op.fullDescription} ${op.category} ${op.type} ${op.locationText} ${op.organization.displayName} ${skills.join(" ")} ${tracks.join(" ")}`.toLowerCase()

      if (params.skill && !skills.some((s) => s.toLowerCase().includes(params.skill!.toLowerCase()))) {
        return null
      }
      if (params.location && !op.locationText.toLowerCase().includes(params.location.toLowerCase())) {
        return null
      }
      if (params.paidOnly && op.feeAmount === 0 && !op.stipendText && !op.prizeText) {
        return null
      }
      if (params.freeOnly && op.feeAmount > 0) {
        return null
      }

      let relevanceScore = op.featured ? 15 : 0
      if (terms.length > 0) {
        let matched = false
        const words = haystack.split(/\W+/).filter((w) => w.length > 2)
        for (const term of terms) {
          if (op.title.toLowerCase().includes(term)) {
            relevanceScore += 30
            matched = true
          } else if (haystack.includes(term)) {
            relevanceScore += 15
            matched = true
          } else if (
            term.length >= 4 &&
            words.some((w) => Math.abs(w.length - term.length) <= 2 && levenshtein(w, term) <= 1)
          ) {
            relevanceScore += 8 // Typo tolerance
            matched = true
          }
        }
        if (!matched) return null
      }

      return { op, relevanceScore, skills, tracks }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const sortMode = params.sort || (terms.length > 0 ? "relevance" : "newest")
  scored.sort((a, b) => {
    if (sortMode === "relevance") return b.relevanceScore - a.relevanceScore
    if (sortMode === "popularity") return b.op.popularityScore - a.op.popularityScore
    if (sortMode === "deadline") {
      const da = a.op.registrationCloseAt?.getTime() ?? Number.MAX_SAFE_INTEGER
      const db = b.op.registrationCloseAt?.getTime() ?? Number.MAX_SAFE_INTEGER
      return da - db
    }
    return b.op.createdAt.getTime() - a.op.createdAt.getTime()
  })

  const total = scored.length
  const start = (page - 1) * limit
  const items = scored.slice(start, start + limit).map(({ op, skills, tracks }) => ({
    id: op.id,
    slug: op.slug,
    title: op.title,
    shortSummary: op.shortSummary,
    type: op.type,
    category: op.category,
    visibility: op.visibility,
    status: op.status,
    bannerAssetUrl: op.bannerAssetUrl || "/placeholder.jpg",
    logoAssetUrl: op.logoAssetUrl || op.organization.logoUrl || "/placeholder-logo.png",
    locationMode: op.locationMode,
    locationText: op.locationText,
    registrationOpenAt: op.registrationOpenAt,
    registrationCloseAt: op.registrationCloseAt,
    eventStartAt: op.eventStartAt,
    eventEndAt: op.eventEndAt,
    timezone: op.timezone,
    teamMin: op.teamMin,
    teamMax: op.teamMax,
    capacity: op.capacity,
    reservedCount: op.reservedCount,
    feeAmount: op.feeAmount,
    currency: op.currency,
    prizeText: op.prizeText,
    stipendText: op.stipendText,
    salaryShared: op.salaryShared,
    salaryMin: op.salaryMin,
    salaryMax: op.salaryMax,
    featured: op.featured,
    popularityScore: op.popularityScore,
    skills,
    tracks,
    organization: op.organization,
    applicationsCount: op._count.applications,
  }))

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}

export async function getRecommendationsForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      skills: true,
      privacySettings: true,
    },
  })
  if (!user) return []

  const userSkills = new Set(user.skills.map((s) => s.name.toLowerCase()))
  const interests = new Set(
    safeParseJson<string[]>(user.profile?.interestsJson, []).map((i) => i.toLowerCase())
  )
  const gradYear = user.profile?.graduationYear

  const liveOps = await prisma.opportunity.findMany({
    where: {
      visibility: "public",
      status: { in: ["live", "scheduled"] },
    },
    include: {
      organization: {
        select: { id: true, slug: true, displayName: true, verificationStatus: true, logoUrl: true },
      },
      eligibilityRules: true,
    },
    take: 25,
  })

  return liveOps
    .map((op) => {
      const opSkills = safeParseJson<string[]>(op.skillsJson, [])
      const reasons: string[] = []
      let score = op.featured ? 10 : 0

      for (const skill of opSkills) {
        if (userSkills.has(skill.toLowerCase())) {
          score += 25
          reasons.push(`Matches your ${skill} skill`)
        }
      }
      if (interests.has(op.category.toLowerCase()) || interests.has(op.type.toLowerCase())) {
        score += 20
        reasons.push(`Matches your ${op.category} interest`)
      }
      for (const rule of op.eligibilityRules) {
        const years = safeParseJson<string[]>(rule.graduationYearsJson, [])
        if (gradYear && years.includes(gradYear)) {
          score += 15
          reasons.push(`Open to Class of ${gradYear}`)
        }
      }
      if (reasons.length === 0) {
        reasons.push("Popular active opportunity on HackKro")
      }

      return {
        id: op.id,
        slug: op.slug,
        title: op.title,
        shortSummary: op.shortSummary,
        type: op.type,
        category: op.category,
        locationMode: op.locationMode,
        locationText: op.locationText,
        registrationCloseAt: op.registrationCloseAt,
        prizeText: op.prizeText,
        stipendText: op.stipendText,
        feeAmount: op.feeAmount,
        currency: op.currency,
        bannerAssetUrl: op.bannerAssetUrl || "/placeholder.jpg",
        organization: op.organization,
        skills: opSkills,
        reasons: reasons.slice(0, 2),
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

export async function createOrUpdateOpportunity(
  ctx: AuthContext,
  input: {
    id?: string
    organizationId: string
    title: string
    shortSummary: string
    fullDescription: string
    type: string
    category: string
    visibility?: string
    status?: string
    locationMode?: string
    locationText?: string
    venue?: string
    registrationOpenAt?: string | null
    registrationCloseAt?: string | null
    eventStartAt?: string | null
    eventEndAt?: string | null
    timezone?: string
    teamMin?: number
    teamMax?: number
    capacity?: number | null
    feeAmount?: number
    currency?: string
    refundPolicy?: string
    prizeText?: string
    stipendText?: string
    salaryShared?: boolean
    salaryMin?: number | null
    salaryMax?: number | null
    skills?: string[]
    tracks?: string[]
    perks?: string[]
    rules?: string[]
    faqs?: Array<{ q: string; a: string }>
    contactChannel?: string
    bannerAssetUrl?: string
    changeReason?: string
    confirmParticipantImpact?: boolean
  }
) {
  assertPermission(ctx, input.id ? "event:write" : "event:create", input.organizationId)

  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } })
  if (!org) throw new AppError(ERROR_CODES.NOT_FOUND, "Organization not found.", 404)

  const cleanTitle = sanitizePlainText(input.title, 180)
  const cleanSummary = sanitizePlainText(input.shortSummary, 400)
  const cleanDescription = sanitizeHtmlServer(input.fullDescription)

  // Publish gating for unverified organizations: route to pending_review if attempting live publication
  let targetStatus = input.status || "draft"
  if (
    ["live", "scheduled"].includes(targetStatus) &&
    org.verificationStatus !== "verified" &&
    ctx.activeRole !== "platform_admin"
  ) {
    targetStatus = "pending_review"
  }

  if (input.id) {
    const existing = await prisma.opportunity.findUnique({ where: { id: input.id } })
    if (!existing || existing.organizationId !== input.organizationId) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found in this organization.", 404)
    }

    const appsCount = await prisma.application.count({
      where: { opportunityId: existing.id, status: { notIn: ["withdrawn", "cancelled"] } },
    })

    const criticalChanged =
      (input.registrationCloseAt &&
        existing.registrationCloseAt?.toISOString() !== new Date(input.registrationCloseAt).toISOString()) ||
      (input.feeAmount !== undefined && input.feeAmount !== existing.feeAmount)

    if (appsCount > 0 && criticalChanged && !input.confirmParticipantImpact) {
      throw new AppError(
        ERROR_CODES.VALIDATION_FAILED,
        `This change affects ${appsCount} existing applicant(s). Confirm impact and provide a changeReason.`,
        409,
        { affectedParticipants: appsCount, requiresConfirmation: true }
      )
    }

    if (appsCount > 0 && criticalChanged && !input.changeReason?.trim()) {
      throw new AppError(
        ERROR_CODES.VALIDATION_FAILED,
        "A documented reason is required when modifying deadlines or fees with active applications.",
        400
      )
    }

    const latestVersion = await prisma.opportunityVersion.findFirst({
      where: { opportunityId: existing.id },
      orderBy: { versionNumber: "desc" },
    })
    const nextVersionNum = (latestVersion?.versionNumber || 0) + 1

    const updated = await prisma.$transaction(async (tx) => {
      const op = await tx.opportunity.update({
        where: { id: existing.id },
        data: {
          title: cleanTitle,
          shortSummary: cleanSummary,
          fullDescription: cleanDescription,
          type: input.type,
          category: input.category,
          visibility: input.visibility || existing.visibility,
          status: targetStatus,
          locationMode: input.locationMode || existing.locationMode,
          locationText: input.locationText ?? existing.locationText,
          venue: input.venue ?? existing.venue,
          registrationOpenAt: input.registrationOpenAt ? new Date(input.registrationOpenAt) : existing.registrationOpenAt,
          registrationCloseAt: input.registrationCloseAt ? new Date(input.registrationCloseAt) : existing.registrationCloseAt,
          eventStartAt: input.eventStartAt ? new Date(input.eventStartAt) : existing.eventStartAt,
          eventEndAt: input.eventEndAt ? new Date(input.eventEndAt) : existing.eventEndAt,
          timezone: input.timezone || existing.timezone,
          teamMin: input.teamMin ?? existing.teamMin,
          teamMax: input.teamMax ?? existing.teamMax,
          capacity: input.capacity !== undefined ? input.capacity : existing.capacity,
          feeAmount: input.feeAmount ?? existing.feeAmount,
          currency: input.currency || existing.currency,
          refundPolicy: input.refundPolicy ?? existing.refundPolicy,
          prizeText: input.prizeText ?? existing.prizeText,
          stipendText: input.stipendText ?? existing.stipendText,
          salaryShared: input.salaryShared ?? existing.salaryShared,
          salaryMin: input.salaryMin !== undefined ? input.salaryMin : existing.salaryMin,
          salaryMax: input.salaryMax !== undefined ? input.salaryMax : existing.salaryMax,
          skillsJson: input.skills ? toJsonString(input.skills) : existing.skillsJson,
          tracksJson: input.tracks ? toJsonString(input.tracks) : existing.tracksJson,
          perksJson: input.perks ? toJsonString(input.perks) : existing.perksJson,
          rulesJson: input.rules ? toJsonString(input.rules) : existing.rulesJson,
          faqsJson: input.faqs ? toJsonString(input.faqs) : existing.faqsJson,
          contactChannel: input.contactChannel ?? existing.contactChannel,
          bannerAssetUrl: input.bannerAssetUrl ?? existing.bannerAssetUrl,
          publishedAt: targetStatus === "live" && !existing.publishedAt ? new Date() : existing.publishedAt,
        },
      })

      await tx.opportunityVersion.create({
        data: {
          opportunityId: op.id,
          versionNumber: nextVersionNum,
          snapshotJson: toJsonString(op),
          changeReason: input.changeReason || "Organizer listing update",
          changedBy: ctx.userId,
        },
      })
      return op
    })

    if (appsCount > 0 && criticalChanged) {
      const applicants = await prisma.application.findMany({
        where: { opportunityId: updated.id, status: { notIn: ["withdrawn", "cancelled"] } },
        select: { userId: true },
      })
      for (const app of applicants) {
        await createNotification({
          userId: app.userId,
          category: "transactional",
          title: `Schedule or terms updated: ${updated.title}`,
          body: `Organizer update (${input.changeReason}). Please check the latest listing rules and timeline.`,
          actionUrl: `/opportunities/${updated.slug}`,
        })
      }
    }

    await recordAuditEvent({
      actorId: ctx.userId,
      actorRole: ctx.activeRole,
      tenantId: input.organizationId,
      action: "opportunity.updated",
      resourceType: "opportunity",
      resourceId: updated.id,
      reasonCode: input.changeReason || "update",
      beforeSummary: { status: existing.status, feeAmount: existing.feeAmount },
      afterSummary: { status: updated.status, feeAmount: updated.feeAmount, version: nextVersionNum },
    })

    return updated
  }

  // Create new opportunity
  const slugBase = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const slug = `${slugBase || "opportunity"}-${Math.floor(1000 + Math.random() * 9000)}`

  const created = await prisma.$transaction(async (tx) => {
    const op = await tx.opportunity.create({
      data: {
        slug,
        title: cleanTitle,
        shortSummary: cleanSummary,
        fullDescription: cleanDescription,
        type: input.type,
        category: input.category,
        organizationId: input.organizationId,
        visibility: input.visibility || "public",
        status: targetStatus,
        locationMode: input.locationMode || "online",
        locationText: input.locationText || "Pan-India / Online",
        venue: input.venue || "",
        registrationOpenAt: input.registrationOpenAt ? new Date(input.registrationOpenAt) : new Date(),
        registrationCloseAt: input.registrationCloseAt ? new Date(input.registrationCloseAt) : null,
        eventStartAt: input.eventStartAt ? new Date(input.eventStartAt) : null,
        eventEndAt: input.eventEndAt ? new Date(input.eventEndAt) : null,
        timezone: input.timezone || "Asia/Kolkata",
        teamMin: input.teamMin ?? 1,
        teamMax: input.teamMax ?? 4,
        capacity: input.capacity ?? null,
        feeAmount: input.feeAmount ?? 0,
        currency: input.currency || "INR",
        refundPolicy: input.refundPolicy || "Standard HackKro refund policy applies.",
        prizeText: input.prizeText || "",
        stipendText: input.stipendText || "",
        salaryShared: input.salaryShared ?? false,
        salaryMin: input.salaryMin ?? null,
        salaryMax: input.salaryMax ?? null,
        skillsJson: toJsonString(input.skills || []),
        tracksJson: toJsonString(input.tracks || []),
        perksJson: toJsonString(input.perks || []),
        rulesJson: toJsonString(input.rules || []),
        faqsJson: toJsonString(input.faqs || []),
        contactChannel: input.contactChannel || org.officialEmail,
        bannerAssetUrl: input.bannerAssetUrl || "/placeholder.jpg",
        createdBy: ctx.userId,
        publishedAt: targetStatus === "live" ? new Date() : null,
      },
    })

    await tx.opportunityVersion.create({
      data: {
        opportunityId: op.id,
        versionNumber: 1,
        snapshotJson: toJsonString(op),
        changeReason: "Initial creation",
        changedBy: ctx.userId,
      },
    })

    await tx.registrationForm.create({
      data: {
        opportunityId: op.id,
        title: `${op.title} — Application Form`,
      },
    })

    return op
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: input.organizationId,
    action: "opportunity.created",
    resourceType: "opportunity",
    resourceId: created.id,
    afterSummary: { title: created.title, status: created.status, type: created.type },
  })

  return created
}
