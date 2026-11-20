import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { AuthContext, assertPermission } from "@/backend/utils/rbac-abac"
import { runSandboxedJavaScript } from "@/backend/adapters/code-sandbox.adapter"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { createNotification } from "@/backend/modules/notifications.service"
import { generateCredentialId } from "@/backend/utils/crypto"

export async function startAssessmentAttempt(
  ctx: AuthContext,
  input: {
    assessmentId: string
    proctoringConsented: boolean
    accommodationExtraMinutes?: number
  }
) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: input.assessmentId },
    include: { questions: true },
  })
  if (!assessment || !assessment.isActive) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Assessment not found or inactive.", 404)
  }

  const proctorConfig = safeParseJson<{ required?: boolean }>(assessment.proctoringConfigJson, {})
  if (proctorConfig.required && !input.proctoringConsented) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "Please review and accept the proctoring & privacy notice before starting.",
      400
    )
  }

  const existingInProgress = await prisma.assessmentAttempt.findFirst({
    where: { assessmentId: assessment.id, userId: ctx.userId, status: "in_progress" },
  })

  let attempt = existingInProgress
  if (!attempt) {
    const completedCount = await prisma.assessmentAttempt.count({
      where: { assessmentId: assessment.id, userId: ctx.userId, status: { in: ["submitted", "expired", "under_review"] } },
    })
    if (completedCount >= assessment.maxAttempts) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        `Maximum attempts (${assessment.maxAttempts}) reached for this assessment.`,
        409
      )
    }

    // Freeze assessment version once candidates begin
    if (!assessment.isFrozen) {
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { isFrozen: true },
      })
    }

    attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: assessment.id,
        userId: ctx.userId,
        status: "in_progress",
        accommodationExtraMinutes: Math.max(0, Math.min(60, input.accommodationExtraMinutes || 0)),
        proctoringConsentedAt: input.proctoringConsented ? new Date() : null,
        startedAt: new Date(),
      },
    })
  }

  // Strip answer keys & hidden test cases before sending to candidate browser!
  let selectedQuestions = assessment.questions
  if (assessment.randomizedPoolSize && assessment.randomizedPoolSize < selectedQuestions.length) {
    selectedQuestions = [...selectedQuestions]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, assessment.randomizedPoolSize)
  }

  const sanitizedQuestions = selectedQuestions.map((q, idx) => ({
    id: q.id,
    number: idx + 1,
    format: q.format,
    topic: q.topic,
    skillTag: q.skillTag,
    difficulty: q.difficulty,
    prompt: q.prompt,
    codeSnippet: q.codeSnippet,
    options: safeParseJson<Array<{ id: string; text: string }>>(q.optionsJson, []),
    publicTestCases: safeParseJson<Array<{ input: unknown; expectedOutput: unknown; isHidden?: boolean }>>(
      q.testCasesJson,
      []
    ).filter((tc) => !tc.isHidden),
    points: q.points,
    accessibilityAlt: q.accessibilityAlt,
  }))

  const totalMinutes = assessment.durationMinutes + attempt.accommodationExtraMinutes
  const elapsedSec = attempt.startedAt
    ? Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
    : 0
  const remainingSeconds = Math.max(0, totalMinutes * 60 - elapsedSec)

  return {
    attemptId: attempt.id,
    assessment: {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      durationMinutes: totalMinutes,
      negativeMarkingRatio: assessment.negativeMarkingRatio,
      partialCredit: assessment.partialCredit,
      calculatorAllowed: assessment.calculatorAllowed,
      proctoringConfig: proctorConfig,
    },
    remainingSeconds,
    savedAnswers: safeParseJson<Record<string, unknown>>(attempt.answersJson, {}),
    questions: sanitizedQuestions,
  }
}

export async function recordProctorSignal(
  ctx: AuthContext,
  input: {
    attemptId: string
    signalType: "fullscreen_exit" | "tab_switch" | "webcam_missing" | "copy_paste" | "network_drop" | "anomaly"
    details?: Record<string, unknown>
  }
) {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: input.attemptId } })
  if (!attempt || attempt.userId !== ctx.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Attempt not found.", 403)
  }

  const severity =
    input.signalType === "network_drop"
      ? "info"
      : input.signalType === "tab_switch" || input.signalType === "fullscreen_exit"
      ? "warning"
      : "alert"

  const signal = await prisma.proctorSignal.create({
    data: {
      attemptId: attempt.id,
      signalType: input.signalType,
      severity,
      detailsJson: toJsonString(input.details || {}),
    },
  })

  // Signals are evidence for review, NEVER automatic guilt/rejection!
  const count = await prisma.proctorSignal.count({ where: { attemptId: attempt.id } })
  const riskBand = count >= 8 ? "high" : count >= 3 ? "medium" : "low"

  await prisma.assessmentAttempt.update({
    where: { id: attempt.id },
    data: { proctorRiskBand: riskBand },
  })

  return { signal, riskBand }
}

export async function autosaveOrSubmitAttempt(
  ctx: AuthContext,
  input: {
    attemptId: string
    answers: Record<string, unknown>
    submitFinal: boolean
  }
) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: input.attemptId },
    include: {
      assessment: { include: { questions: true } },
    },
  })
  if (!attempt || attempt.userId !== ctx.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Assessment attempt not found.", 403)
  }
  if (attempt.status === "submitted") {
    throw new AppError(ERROR_CODES.CONFLICT, "This assessment attempt has already been submitted.", 409)
  }

  if (!input.submitFinal) {
    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { answersJson: toJsonString(input.answers) },
    })
    return { saved: true, submitted: false }
  }

  // Deterministic server-side scoring across MCQ, Multi-MCQ, Numerical, Short Text, Coding
  let rawScore = 0
  let maxPossible = 0
  const codeSnapshots: Record<string, unknown> = {}

  for (const q of attempt.assessment.questions) {
    maxPossible += q.points
    const ans = input.answers[q.id]
    if (ans === undefined || ans === null || ans === "") continue

    const correctKey = safeParseJson<{
      optionId?: string
      optionIds?: string[]
      value?: number | string
      keywords?: string[]
      functionName?: string
    }>(q.correctAnswerJson, {})

    if (q.format === "mcq_single" || q.format === "true_false") {
      if (String(ans) === String(correctKey.optionId)) {
        rawScore += q.points
      } else if (attempt.assessment.negativeMarkingRatio > 0) {
        rawScore -= q.points * attempt.assessment.negativeMarkingRatio
      }
    } else if (q.format === "mcq_multi" && Array.isArray(ans) && Array.isArray(correctKey.optionIds)) {
      const expected = new Set(correctKey.optionIds)
      const chosen = new Set(ans.map(String))
      let correctSelected = 0
      let wrongSelected = 0
      chosen.forEach((c) => (expected.has(c) ? correctSelected++ : wrongSelected++))
      if (correctSelected === expected.size && wrongSelected === 0) {
        rawScore += q.points
      } else if (attempt.assessment.partialCredit && expected.size > 0 && wrongSelected === 0) {
        rawScore += q.points * (correctSelected / expected.size)
      }
    } else if (q.format === "numerical") {
      const numAns = Number(ans)
      const expectedNum = Number(correctKey.value)
      if (Number.isFinite(numAns) && Math.abs(numAns - expectedNum) <= 0.01) {
        rawScore += q.points
      }
    } else if (q.format === "short_text" || q.format === "sql") {
      const norm = String(ans).trim().toLowerCase()
      if (correctKey.value && norm === String(correctKey.value).trim().toLowerCase()) {
        rawScore += q.points
      } else if (correctKey.keywords && correctKey.keywords.some((k) => norm.includes(k.toLowerCase()))) {
        rawScore += q.points * 0.7
      }
    } else if (q.format === "coding" || q.format === "debugging") {
      const testCases = safeParseJson<Array<{ input: unknown; expectedOutput: unknown; isHidden?: boolean }>>(
        q.testCasesJson,
        []
      )
      const exec = runSandboxedJavaScript(
        String(ans),
        correctKey.functionName || "solution",
        testCases
      )
      codeSnapshots[q.id] = { code: String(ans), execution: exec }
      rawScore += q.points * exec.scoreRatio
    }
  }

  rawScore = Math.max(0, Math.round(rawScore * 100) / 100)
  const normalizedScore = maxPossible > 0 ? Math.round((rawScore / maxPossible) * 10000) / 100 : 0

  const updated = await prisma.assessmentAttempt.update({
    where: { id: attempt.id },
    data: {
      answersJson: toJsonString(input.answers),
      codeSnapshotsJson: toJsonString(codeSnapshots),
      rawScore,
      normalizedScore,
      status: attempt.proctorRiskBand === "high" ? "under_review" : "submitted",
      submittedAt: new Date(),
    },
  })

  // Award verified assessed skill badge if passing score achieved
  if (normalizedScore >= attempt.assessment.passingScore) {
    const primarySkill = attempt.assessment.questions[0]?.skillTag
    if (primarySkill) {
      await prisma.userSkill.upsert({
        where: { userId_name: { userId: ctx.userId, name: primarySkill } },
        update: { provenance: "assessed", evidenceRef: attempt.id, verifiedAt: new Date() },
        create: {
          userId: ctx.userId,
          name: primarySkill,
          provenance: "assessed",
          evidenceRef: attempt.id,
          proficiency: 4,
          verifiedAt: new Date(),
        },
      })
    }
  }

  return {
    saved: true,
    submitted: true,
    status: updated.status,
    proctorRiskBand: updated.proctorRiskBand,
    resultsPublished: attempt.assessment.resultsPublished,
    score: attempt.assessment.resultsPublished ? updated.normalizedScore : null,
    rawScore: attempt.assessment.resultsPublished ? updated.rawScore : null,
  }
}

export async function submitProctorAppeal(ctx: AuthContext, attemptId: string, notes: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } })
  if (!attempt || attempt.userId !== ctx.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Attempt not found.", 403)
  }
  return prisma.assessmentAttempt.update({
    where: { id: attempt.id },
    data: { appealStatus: "submitted", appealNotes: notes },
  })
}

export async function createRubric(
  ctx: AuthContext,
  input: {
    opportunityId: string
    roundId?: string
    trackName?: string
    title: string
    criteria: Array<{
      id: string
      name: string
      description: string
      weight: number
      maxScore: number
      minPassScore?: number
      anchors?: string
    }>
  }
) {
  const op = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } })
  if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)
  assertPermission(ctx, "rubric:manage", op.organizationId)

  const totalWeight = input.criteria.reduce((sum, c) => sum + c.weight, 0)
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      `Rubric criterion weights must sum to 100 (currently ${totalWeight}).`,
      400
    )
  }

  return prisma.rubric.create({
    data: {
      opportunityId: op.id,
      roundId: input.roundId ?? null,
      trackName: input.trackName || "",
      title: input.title.trim(),
      criteriaJson: toJsonString(input.criteria),
    },
  })
}

export async function assignEvaluatorToSubmission(
  ctx: AuthContext,
  input: { submissionId: string; evaluatorId: string; blindMode?: boolean }
) {
  const sub = await prisma.submission.findUnique({
    where: { id: input.submissionId },
    include: { opportunity: true, team: { include: { members: true } } },
  })
  if (!sub) throw new AppError(ERROR_CODES.NOT_FOUND, "Submission not found.", 404)
  assertPermission(ctx, "judge:assign", sub.opportunity.organizationId)

  // Prevent self-review or evaluating own team!
  if (sub.userId === input.evaluatorId) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Conflict of interest: evaluator cannot judge their own submission.", 400)
  }
  if (sub.team?.members.some((m) => m.userId === input.evaluatorId && m.status === "accepted")) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Conflict of interest: evaluator is a member of this team.", 400)
  }

  return prisma.judgeAssignment.upsert({
    where: { submissionId_evaluatorId: { submissionId: sub.id, evaluatorId: input.evaluatorId } },
    update: { blindMode: input.blindMode ?? true, status: "assigned" },
    create: {
      opportunityId: sub.opportunityId,
      submissionId: sub.id,
      evaluatorId: input.evaluatorId,
      blindMode: input.blindMode ?? true,
    },
  })
}

export async function submitJudgeEvaluation(
  ctx: AuthContext,
  input: {
    submissionId: string
    rubricId: string
    criterionScores: Record<string, number>
    evidenceNotes: string
    submitFinal: boolean
    coiDeclared: boolean
    coiHasConflict: boolean
    coiReason?: string
    isSecondReview?: boolean
    isTieBreak?: boolean
  }
) {
  const assignment = await prisma.judgeAssignment.findUnique({
    where: {
      submissionId_evaluatorId: {
        submissionId: input.submissionId,
        evaluatorId: ctx.userId,
      },
    },
    include: { submission: { include: { opportunity: true } } },
  })

  if (!assignment && ctx.activeRole !== "platform_admin") {
    throw new AppError(ERROR_CODES.FORBIDDEN, "You are only permitted to evaluate assigned submissions.", 403)
  }

  if (input.coiHasConflict) {
    if (assignment) {
      await prisma.judgeAssignment.update({
        where: { id: assignment.id },
        data: {
          coiDeclared: true,
          coiHasConflict: true,
          coiReason: input.coiReason || "Declared conflict of interest",
          status: "recused",
        },
      })
    }
    return { recused: true }
  }

  const rubric = await prisma.rubric.findUnique({ where: { id: input.rubricId } })
  if (!rubric) throw new AppError(ERROR_CODES.NOT_FOUND, "Rubric not found.", 404)

  const criteria = safeParseJson<Array<{ id: string; weight: number; maxScore: number }>>(
    rubric.criteriaJson,
    []
  )
  let totalWeightedScore = 0
  for (const c of criteria) {
    const score = Number(input.criterionScores[c.id] ?? 0)
    const clamped = Math.max(0, Math.min(c.maxScore, score))
    totalWeightedScore += (clamped / (c.maxScore || 1)) * c.weight
  }
  totalWeightedScore = Math.round(totalWeightedScore * 100) / 100

  // Freeze rubric once evaluation starts
  if (!rubric.isFrozen) {
    await prisma.rubric.update({ where: { id: rubric.id }, data: { isFrozen: true } })
  }

  // Outlier detection against existing evaluations on same submission (flag for moderation, never alter score!)
  const peerEvals = await prisma.evaluation.findMany({
    where: { submissionId: input.submissionId, evaluatorId: { not: ctx.userId }, status: { in: ["submitted", "locked"] } },
  })
  let outlierFlagged = false
  if (peerEvals.length > 0) {
    const avg = peerEvals.reduce((s, e) => s + e.totalWeightedScore, 0) / peerEvals.length
    if (Math.abs(totalWeightedScore - avg) >= 25) {
      outlierFlagged = true
    }
  }

  const evaluation = await prisma.evaluation.upsert({
    where: {
      submissionId_evaluatorId_isSecondReview: {
        submissionId: input.submissionId,
        evaluatorId: ctx.userId,
        isSecondReview: Boolean(input.isSecondReview),
      },
    },
    update: {
      criterionScoresJson: toJsonString(input.criterionScores),
      totalWeightedScore,
      evidenceNotes: input.evidenceNotes,
      status: input.submitFinal ? (outlierFlagged ? "moderation_flagged" : "submitted") : "draft",
      isTieBreak: Boolean(input.isTieBreak),
      outlierFlagged,
      submittedAt: input.submitFinal ? new Date() : null,
    },
    create: {
      submissionId: input.submissionId,
      rubricId: rubric.id,
      evaluatorId: ctx.userId,
      criterionScoresJson: toJsonString(input.criterionScores),
      totalWeightedScore,
      evidenceNotes: input.evidenceNotes,
      status: input.submitFinal ? (outlierFlagged ? "moderation_flagged" : "submitted") : "draft",
      isSecondReview: Boolean(input.isSecondReview),
      isTieBreak: Boolean(input.isTieBreak),
      outlierFlagged,
      submittedAt: input.submitFinal ? new Date() : null,
    },
  })

  if (assignment) {
    await prisma.judgeAssignment.update({
      where: { id: assignment.id },
      data: {
        coiDeclared: input.coiDeclared,
        status: input.submitFinal ? "submitted" : "in_progress",
      },
    })
  }

  return { evaluation, outlierFlagged }
}

export async function issueCertificateRecord(
  ctx: AuthContext,
  input: {
    userId: string
    organizationId?: string
    opportunityId?: string
    courseId?: string
    title: string
    achievementType: "attendance" | "completion" | "finalist" | "winner" | "assessed_skill"
    criteriaText: string
    evidenceSummary?: string
  }
) {
  if (input.organizationId) {
    assertPermission(ctx, "certificate:issue", input.organizationId)
  } else {
    assertPermission(ctx, "certificate:issue")
  }

  const recipient = await prisma.user.findUnique({ where: { id: input.userId } })
  if (!recipient) throw new AppError(ERROR_CODES.NOT_FOUND, "Recipient user not found.", 404)

  const org = input.organizationId
    ? await prisma.organization.findUnique({ where: { id: input.organizationId } })
    : null

  // Prevent duplicate issuance for same (user, opportunity/course, achievementType)
  const duplicate = await prisma.certificate.findFirst({
    where: {
      userId: input.userId,
      opportunityId: input.opportunityId ?? null,
      courseId: input.courseId ?? null,
      achievementType: input.achievementType,
      status: "valid",
    },
  })
  if (duplicate) return duplicate

  const cert = await prisma.certificate.create({
    data: {
      credentialId: generateCredentialId(),
      userId: recipient.id,
      organizationId: input.organizationId ?? null,
      opportunityId: input.opportunityId ?? null,
      courseId: input.courseId ?? null,
      recipientName: recipient.displayName,
      issuerName: org?.displayName || "HackKro Platform",
      title: input.title,
      achievementType: input.achievementType,
      criteriaText: input.criteriaText,
      evidenceSummary: input.evidenceSummary || "",
    },
  })

  await createNotification({
    userId: recipient.id,
    category: "transactional",
    title: `Credential issued: ${cert.title}`,
    body: `Your verifiable certificate (${cert.credentialId}) is now available on your HackKro profile.`,
    actionUrl: `/verify/${cert.credentialId}`,
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    tenantId: input.organizationId ?? null,
    action: "certificate.issued",
    resourceType: "certificate",
    resourceId: cert.id,
    afterSummary: { credentialId: cert.credentialId, achievementType: cert.achievementType },
  })

  return cert
}
