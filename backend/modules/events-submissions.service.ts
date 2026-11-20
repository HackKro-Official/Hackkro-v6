import crypto from "crypto"
import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { AuthContext, assertPermission } from "@/backend/utils/rbac-abac"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { createNotification } from "@/backend/modules/notifications.service"
import { sanitizePlainText, sanitizeUrl } from "@/backend/utils/sanitizer"

function computeTokenJaccard(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3))
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let intersection = 0
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection++
  })
  const union = wordsA.size + wordsB.size - intersection
  return union === 0 ? 0 : Math.round((intersection / union) * 100)
}

export async function performParticipantCheckIn(
  ctx: AuthContext,
  input: { opportunityId: string; userId?: string; qrToken?: string; mode?: "qr" | "roster"; notes?: string }
) {
  const op = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } })
  if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Event not found.", 404)
  assertPermission(ctx, "event:checkin", op.organizationId)

  let targetUserId = input.userId
  if (!targetUserId && input.qrToken) {
    const app = await prisma.application.findUnique({
      where: { receiptCode: input.qrToken },
    })
    if (app && app.opportunityId === op.id) {
      targetUserId = app.userId
    }
  }
  if (!targetUserId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Participant or QR pass not found for this event.", 404)
  }

  const application = await prisma.application.findFirst({
    where: { opportunityId: op.id, userId: targetUserId, status: { notIn: ["withdrawn", "cancelled"] } },
  })
  if (!application) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "User does not hold an active registration.", 400)
  }

  const checkIn = await prisma.checkIn.upsert({
    where: { opportunityId_userId: { opportunityId: op.id, userId: targetUserId } },
    update: { checkedInBy: ctx.userId, checkedInAt: new Date(), mode: input.mode || "roster", notes: input.notes || "" },
    create: {
      opportunityId: op.id,
      userId: targetUserId,
      applicationId: application.id,
      qrToken: application.receiptCode,
      checkedInBy: ctx.userId,
      mode: input.mode || "roster",
      notes: input.notes || "",
    },
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: op.organizationId,
    action: "event.checkin",
    resourceType: "checkin",
    resourceId: checkIn.id,
    afterSummary: { userId: targetUserId, mode: checkIn.mode },
  })

  return checkIn
}

export async function triggerContingencyEvent(
  ctx: AuthContext,
  input: {
    opportunityId: string
    incidentType: "outage" | "deadline_extension" | "judge_unavailable" | "venue_change" | "security"
    reason: string
    revisedDeadline?: string
  }
) {
  const op = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } })
  if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Event not found.", 404)
  assertPermission(ctx, "event:contingency", op.organizationId)

  const originalDeadline = op.registrationCloseAt
  const revisedDate = input.revisedDeadline ? new Date(input.revisedDeadline) : null

  const apps = await prisma.application.findMany({
    where: { opportunityId: op.id, status: { notIn: ["withdrawn", "cancelled"] } },
    select: { userId: true },
  })

  const incident = await prisma.$transaction(async (tx) => {
    if (input.incidentType === "deadline_extension" && revisedDate) {
      await tx.opportunity.update({
        where: { id: op.id },
        data: { registrationCloseAt: revisedDate },
      })
      await tx.round.updateMany({
        where: { opportunityId: op.id, status: { in: ["scheduled", "live"] } },
        data: { endAt: revisedDate },
      })
    }

    return tx.incidentEvent.create({
      data: {
        opportunityId: op.id,
        incidentType: input.incidentType,
        reason: input.reason,
        originalDeadline,
        revisedDeadline: revisedDate,
        notifiedCount: apps.length,
        approvedBy: ctx.userId,
      },
    })
  })

  for (const app of apps) {
    await createNotification({
      userId: app.userId,
      category: "transactional",
      title: `Important Event Update (${op.title})`,
      body: `${input.incidentType.replace("_", " ").toUpperCase()}: ${input.reason}${
        revisedDate ? ` New deadline: ${revisedDate.toISOString()}` : ""
      }`,
      actionUrl: `/opportunities/${op.slug}`,
    })
  }

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: op.organizationId,
    action: "event.contingency_triggered",
    resourceType: "incident_event",
    resourceId: incident.id,
    reasonCode: input.incidentType,
    afterSummary: { revisedDeadline: revisedDate?.toISOString() || null, notifiedCount: apps.length },
  })

  return incident
}

export async function createOrUpdateSubmission(
  ctx: AuthContext,
  input: {
    opportunityId: string
    roundId?: string
    teamId?: string
    trackName?: string
    title: string
    summary: string
    repoUrl?: string
    demoUrl?: string
    textContent?: string
    fileAssetIds?: string[]
    contributionStatement: string
    sourceAttribution?: string
    lateReason?: string
    isDraft?: boolean
  }
) {
  const op = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } })
  if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)

  // Verify registration or active team membership
  if (input.teamId) {
    const member = await prisma.teamMember.findFirst({
      where: { teamId: input.teamId, userId: ctx.userId, status: "accepted" },
    })
    if (!member) {
      throw new AppError(ERROR_CODES.FORBIDDEN, "You are not an active member of this team.", 403)
    }
  } else {
    const app = await prisma.application.findFirst({
      where: { opportunityId: op.id, userId: ctx.userId, status: { notIn: ["withdrawn", "cancelled"] } },
    })
    if (!app) {
      throw new AppError(ERROR_CODES.FORBIDDEN, "Register for this event before submitting work.", 403)
    }
  }

  let existing = await prisma.submission.findFirst({
    where: {
      opportunityId: op.id,
      ...(input.teamId ? { teamId: input.teamId } : { userId: ctx.userId }),
      ...(input.roundId ? { roundId: input.roundId } : {}),
    },
    include: { versions: true },
  })

  if (existing?.status === "final_locked") {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "This submission is final-locked and cannot be modified.", 400)
  }

  const now = new Date()
  const deadline = op.eventEndAt || op.registrationCloseAt
  const isLate = Boolean(deadline && now > deadline)
  const targetStatus = input.isDraft ? "draft" : isLate ? "late_submitted" : "submitted"

  const cleanTitle = sanitizePlainText(input.title, 180)
  const cleanSummary = sanitizePlainText(input.summary, 2000)
  const cleanText = sanitizePlainText(input.textContent || "", 20000)
  const checksumSha256 = crypto
    .createHash("sha256")
    .update(`${cleanTitle}|${cleanSummary}|${cleanText}|${input.repoUrl || ""}`)
    .digest("hex")

  // Compute transparent similarity indicator against peer submissions in same opportunity
  const peers = await prisma.submission.findMany({
    where: {
      opportunityId: op.id,
      ...(existing ? { id: { not: existing.id } } : {}),
      status: { not: "draft" },
    },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  })

  let maxSim = 0
  let simNote = "No elevated similarity detected."
  const currentBlob = `${cleanTitle} ${cleanSummary} ${cleanText}`
  for (const peer of peers) {
    const v = peer.versions[0]
    if (!v) continue
    const sim = computeTokenJaccard(currentBlob, `${peer.title} ${v.summary} ${v.textContent}`)
    if (sim > maxSim) {
      maxSim = sim
      if (sim >= 65) {
        simNote = `Elevated text overlap (${sim}%) detected with another submission; flagged for human review (not an automatic penalty).`
      }
    }
  }

  const nextVersion = existing ? existing.currentVersionNumber + 1 : 1

  const submission = await prisma.$transaction(async (tx) => {
    if (!existing) {
      existing = await tx.submission.create({
        data: {
          opportunityId: op.id,
          roundId: input.roundId ?? null,
          teamId: input.teamId ?? null,
          userId: ctx.userId,
          trackName: input.trackName || "",
          title: cleanTitle,
          status: targetStatus,
          currentVersionNumber: nextVersion,
          similarityScore: maxSim,
          similarityNote: simNote,
        },
        include: { versions: true },
      })
    } else {
      await tx.submission.update({
        where: { id: existing.id },
        data: {
          title: cleanTitle,
          trackName: input.trackName || existing.trackName,
          status: targetStatus,
          currentVersionNumber: nextVersion,
          similarityScore: maxSim,
          similarityNote: simNote,
        },
      })
    }

    await tx.submissionVersion.create({
      data: {
        submissionId: existing.id,
        versionNumber: nextVersion,
        summary: cleanSummary,
        repoUrl: sanitizeUrl(input.repoUrl),
        demoUrl: sanitizeUrl(input.demoUrl),
        textContent: cleanText,
        fileAssetIdsJson: toJsonString(input.fileAssetIds || []),
        checksumSha256,
        contributionStatement: sanitizePlainText(input.contributionStatement, 1000),
        sourceAttribution: sanitizePlainText(input.sourceAttribution || "", 1000),
        submittedBy: ctx.userId,
        deadlineSnapshot: deadline,
        lateReason: isLate ? input.lateReason || "Submitted after deadline" : "",
      },
    })

    return tx.submission.findUniqueOrThrow({
      where: { id: existing.id },
      include: { versions: { orderBy: { versionNumber: "desc" } } },
    })
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: op.organizationId,
    action: "submission.version_saved",
    resourceType: "submission",
    resourceId: submission.id,
    afterSummary: { version: nextVersion, status: submission.status, similarityScore: maxSim },
  })

  return submission
}

export async function appealSubmissionStatus(
  ctx: AuthContext,
  submissionId: string,
  appealText: string
) {
  const sub = await prisma.submission.findUnique({ where: { id: submissionId } })
  if (!sub) throw new AppError(ERROR_CODES.NOT_FOUND, "Submission not found.", 404)
  if (sub.userId !== ctx.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Only the submission owner can file an appeal.", 403)
  }
  return prisma.submission.update({
    where: { id: sub.id },
    data: {
      appealStatus: "submitted",
      appealText: sanitizePlainText(appealText, 2000),
    },
  })
}
