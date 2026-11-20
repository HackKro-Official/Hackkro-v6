import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { AuthContext, assertPermission } from "@/backend/utils/rbac-abac"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { createNotification } from "@/backend/modules/notifications.service"
import { ATS_CANONICAL_STAGES } from "@/config/taxonomies"

export async function createJobRequisition(
  ctx: AuthContext,
  input: {
    organizationId: string
    title: string
    shortSummary: string
    fullDescription: string
    employmentType: "full_time" | "internship" | "contract"
    department: string
    locationMode: "online" | "offline" | "hybrid"
    locationText: string
    salaryShared: boolean
    salaryMin?: number | null
    salaryMax?: number | null
    stipendText?: string
    skills: string[]
    experienceMin?: number
    experienceMax?: number
    customStages?: string[]
  }
) {
  assertPermission(ctx, "job:create", input.organizationId)

  const slugBase = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const slug = `${slugBase || "role"}-${Math.floor(1000 + Math.random() * 9000)}`

  const created = await prisma.$transaction(async (tx) => {
    const op = await tx.opportunity.create({
      data: {
        slug,
        title: input.title.trim(),
        shortSummary: input.shortSummary.trim(),
        fullDescription: input.fullDescription,
        type: input.employmentType === "internship" ? "internship" : "job",
        category: input.department || "Engineering",
        organizationId: input.organizationId,
        visibility: "public",
        status: "live",
        locationMode: input.locationMode,
        locationText: input.locationText,
        employmentType: input.employmentType,
        department: input.department,
        salaryShared: input.salaryShared,
        salaryMin: input.salaryShared ? input.salaryMin ?? null : null,
        salaryMax: input.salaryShared ? input.salaryMax ?? null : null,
        stipendText: input.stipendText || "",
        experienceMin: input.experienceMin ?? 0,
        experienceMax: input.experienceMax ?? null,
        skillsJson: toJsonString(input.skills),
        teamMin: 1,
        teamMax: 1,
        createdBy: ctx.userId,
        publishedAt: new Date(),
      },
    })

    await tx.opportunityVersion.create({
      data: {
        opportunityId: op.id,
        versionNumber: 1,
        snapshotJson: toJsonString(op),
        changeReason: "Initial job requisition publication",
        changedBy: ctx.userId,
      },
    })

    const req = await tx.jobRequisition.create({
      data: {
        opportunityId: op.id,
        organizationId: input.organizationId,
        hiringManagerId: ctx.userId,
        hiringTeamIdsJson: toJsonString([ctx.userId]),
        customStagesJson: toJsonString(input.customStages || []),
        status: "open",
      },
    })

    return { op, req }
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: input.organizationId,
    action: "recruiter.requisition_created",
    resourceType: "job_requisition",
    resourceId: created.req.id,
  })

  return created
}

export async function moveCandidateStage(
  ctx: AuthContext,
  input: {
    applicationId: string
    canonicalStage: (typeof ATS_CANONICAL_STAGES)[number]
    customStageLabel?: string
    reason: string
    privateNote?: string
    participantNote?: string
  }
) {
  const stage = await prisma.candidateStage.findUnique({
    where: { applicationId: input.applicationId },
    include: { requisition: true, application: { include: { opportunity: true } } },
  })
  if (!stage) throw new AppError(ERROR_CODES.NOT_FOUND, "Candidate pipeline record not found.", 404)

  assertPermission(ctx, "candidate:stage_move", stage.requisition.organizationId)

  const prevStage = stage.canonicalStage
  const notes = safeParseJson<Array<{ authorId: string; text: string; createdAt: string; private: true }>>(
    stage.privateNotesJson,
    []
  )
  if (input.privateNote?.trim()) {
    notes.push({
      authorId: ctx.userId,
      text: input.privateNote.trim(),
      createdAt: new Date().toISOString(),
      private: true,
    })
  }

  const appStatusMap: Record<string, string> = {
    new: "submitted",
    profile_review: "under_review",
    screening: "shortlisted",
    assessment_invited: "assessment_invited",
    assessment_completed: "assessment_completed",
    interview_1: "interview",
    interview_2: "interview",
    final_review: "interview",
    offer_sent: "selected",
    offer_accepted: "selected",
    hired: "selected",
    rejected: "rejected",
    withdrawn: "withdrawn",
  }

  const updated = await prisma.$transaction(async (tx) => {
    const cs = await tx.candidateStage.update({
      where: { id: stage.id },
      data: {
        canonicalStage: input.canonicalStage,
        customStageLabel: input.customStageLabel || "",
        privateNotesJson: toJsonString(notes),
      },
    })

    const mappedAppStatus = appStatusMap[input.canonicalStage] || stage.application.status
    await tx.application.update({
      where: { id: stage.applicationId },
      data: { status: mappedAppStatus },
    })

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: stage.applicationId,
        fromStatus: prevStage,
        toStatus: input.canonicalStage,
        actorId: ctx.userId,
        reasonCategory: input.reason || "ats_stage_move",
        participantNote: input.participantNote || "",
        internalNote: input.privateNote || "",
      },
    })

    return cs
  })

  await createNotification({
    userId: stage.application.userId,
    category: "transactional",
    title: `Hiring pipeline update: ${stage.application.opportunity.title}`,
    body: `Your application progressed to ${input.customStageLabel || input.canonicalStage.replace(/_/g, " ")}.`,
    actionUrl: "/dashboard?tab=applications",
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: stage.requisition.organizationId,
    action: "ats.stage_moved",
    resourceType: "candidate_stage",
    resourceId: stage.id,
    beforeSummary: { stage: prevStage },
    afterSummary: { stage: input.canonicalStage },
    reasonCode: input.reason,
  })

  return updated
}

export async function searchConsentedTalent(
  ctx: AuthContext,
  organizationId: string,
  filters: { skill?: string; graduationYear?: string; location?: string }
) {
  assertPermission(ctx, "candidate:read", organizationId)

  const candidates = await prisma.user.findMany({
    where: {
      status: "active",
      privacySettings: { recruiterDiscovery: true },
    },
    include: {
      profile: true,
      skills: true,
      privacySettings: true,
      certificates: { where: { status: "valid" } },
    },
    take: 50,
  })

  return candidates
    .filter((c) => {
      if (filters.skill && !c.skills.some((s) => s.name.toLowerCase().includes(filters.skill!.toLowerCase()))) {
        return false
      }
      if (filters.graduationYear && c.profile?.graduationYear !== filters.graduationYear) {
        return false
      }
      if (filters.location && !c.profile?.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false
      }
      return true
    })
    .map((c) => ({
      id: c.id,
      displayName: c.displayName,
      headline: c.profile?.headline || "",
      college: c.profile?.collegeName || "",
      graduationYear: c.profile?.graduationYear || "",
      location: c.profile?.location || "",
      // Respect contactSharing consent — never expose email/phone unless explicitly consented
      contactEmail: c.privacySettings?.contactSharing ? c.primaryEmail : null,
      skills: c.skills.map((s) => ({ name: s.name, provenance: s.provenance })),
      verifiedCertificatesCount: c.certificates.length,
    }))
}

export async function scheduleInterviewWithConflictCheck(
  ctx: AuthContext,
  input: {
    applicationId: string
    panelUserIds: string[]
    scheduledStartAt: string
    scheduledEndAt: string
    timezone: string
  }
) {
  const stage = await prisma.candidateStage.findUnique({
    where: { applicationId: input.applicationId },
    include: { requisition: true, application: true },
  })
  if (!stage) throw new AppError(ERROR_CODES.NOT_FOUND, "Application not found.", 404)
  assertPermission(ctx, "interview:schedule", stage.requisition.organizationId)

  const start = new Date(input.scheduledStartAt)
  const end = new Date(input.scheduledEndAt)
  if (Number.isNaN(start.getTime()) || end <= start) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Invalid interview time window.", 400)
  }

  // Conflict detection for candidate & interviewers
  const overlapping = await prisma.interview.findFirst({
    where: {
      status: { in: ["scheduled", "rescheduled"] },
      candidateId: stage.application.userId,
      scheduledStartAt: { lt: end },
      scheduledEndAt: { gt: start },
    },
  })
  if (overlapping) {
    throw new AppError(ERROR_CODES.CONFLICT, "Candidate has an overlapping scheduled interview.", 409)
  }

  const interview = await prisma.interview.create({
    data: {
      applicationId: stage.applicationId,
      requisitionId: stage.requisitionId,
      candidateId: stage.application.userId,
      panelUserIdsJson: toJsonString(input.panelUserIds),
      scheduledStartAt: start,
      scheduledEndAt: end,
      timezone: input.timezone || "Asia/Kolkata",
      meetingUrl: `https://meet.hackkro.local/interview/${stage.applicationId.slice(-6)}`,
      feedbackDeadline: new Date(end.getTime() + 24 * 60 * 60 * 1000),
    },
  })

  await createNotification({
    userId: stage.application.userId,
    category: "transactional",
    title: "Interview scheduled",
    body: `Your interview is scheduled for ${start.toISOString()} (${input.timezone}). Meeting link: ${interview.meetingUrl}`,
    actionUrl: "/dashboard?tab=applications",
  })

  return interview
}

export async function advanceOfferWorkflow(
  ctx: AuthContext,
  input: {
    applicationId: string
    action: "create_draft" | "approve_comp" | "approve_hr" | "send" | "candidate_accept" | "candidate_decline"
    compensationSummary?: Record<string, unknown>
    termsText?: string
  }
) {
  const stage = await prisma.candidateStage.findUnique({
    where: { applicationId: input.applicationId },
    include: { requisition: true, application: true, },
  })
  if (!stage) throw new AppError(ERROR_CODES.NOT_FOUND, "Candidate record not found.", 404)

  if (input.action === "create_draft") {
    assertPermission(ctx, "offer:draft", stage.requisition.organizationId)
    return prisma.offer.upsert({
      where: { applicationId: stage.applicationId },
      update: {
        compensationSummaryJson: toJsonString(input.compensationSummary || {}),
        termsText: input.termsText || "Standard HackKro employment offer terms.",
        status: "comp_approval",
        version: { increment: 1 },
      },
      create: {
        applicationId: stage.applicationId,
        requisitionId: stage.requisitionId,
        candidateId: stage.application.userId,
        compensationSummaryJson: toJsonString(input.compensationSummary || {}),
        termsText: input.termsText || "Standard HackKro employment offer terms.",
        status: "comp_approval",
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    })
  }

  const offer = await prisma.offer.findUnique({ where: { applicationId: stage.applicationId } })
  if (!offer) throw new AppError(ERROR_CODES.NOT_FOUND, "Offer draft not found.", 404)

  if (input.action === "approve_comp") {
    assertPermission(ctx, "offer:approve_comp", stage.requisition.organizationId)
    return prisma.offer.update({
      where: { id: offer.id },
      data: { compApprovedBy: ctx.userId, compApprovedAt: new Date(), status: "legal_hr_approval" },
    })
  }

  if (input.action === "approve_hr") {
    assertPermission(ctx, "offer:approve_hr", stage.requisition.organizationId)
    if (!offer.compApprovedAt) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Compensation approval is required before HR/Legal approval.", 400)
    }
    return prisma.offer.update({
      where: { id: offer.id },
      data: { hrApprovedBy: ctx.userId, hrApprovedAt: new Date(), status: "sent", sentAt: new Date() },
    })
  }

  if (input.action === "candidate_accept" || input.action === "candidate_decline") {
    if (offer.candidateId !== ctx.userId) {
      throw new AppError(ERROR_CODES.FORBIDDEN, "Only the candidate can respond to this offer.", 403)
    }
    if (!["sent", "viewed"].includes(offer.status)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Offer is not in an actionable sent state.", 400)
    }
    const accepted = input.action === "candidate_accept"
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.offer.update({
        where: { id: offer.id },
        data: {
          status: accepted ? "accepted" : "declined",
          respondedAt: new Date(),
          eSignatureStatus: accepted ? "pending" : "not_started",
        },
      })
      await tx.candidateStage.update({
        where: { applicationId: offer.applicationId },
        data: { canonicalStage: accepted ? "offer_accepted" : "offer_declined" },
      })
      return o
    })
    await recordAuditEvent({
      actorId: ctx.userId,
      actorRole: ctx.activeRole,
      tenantId: stage.requisition.organizationId,
      action: accepted ? "offer.accepted" : "offer.declined",
      resourceType: "offer",
      resourceId: offer.id,
    })
    return updated
  }

  return offer
}
