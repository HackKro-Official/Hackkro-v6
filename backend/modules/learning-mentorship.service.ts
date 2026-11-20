import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { AuthContext } from "@/backend/utils/rbac-abac"
import { createNotification } from "@/backend/modules/notifications.service"
import { generateCredentialId } from "@/backend/utils/crypto"

export async function enrollAndTrackCourse(
  ctx: AuthContext,
  input: { courseId: string; cohortId?: string }
) {
  const course = await prisma.course.findUnique({ where: { id: input.courseId } })
  if (!course || !course.published) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Course not found.", 404)
  }

  return prisma.enrollment.upsert({
    where: { userId_courseId: { userId: ctx.userId, courseId: course.id } },
    update: { status: "active" },
    create: {
      userId: ctx.userId,
      courseId: course.id,
      cohortId: input.cohortId ?? null,
      status: "active",
    },
  })
}

export async function completeLessonWithCriteria(
  ctx: AuthContext,
  input: { courseId: string; lessonId: string; quizAnswers?: Record<string, string> }
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: ctx.userId, courseId: input.courseId } },
    include: { course: { include: { lessons: { orderBy: { orderIndex: "asc" } } } } },
  })
  if (!enrollment) throw new AppError(ERROR_CODES.NOT_FOUND, "Enroll in the course first.", 404)

  const lesson = enrollment.course.lessons.find((l) => l.id === input.lessonId)
  if (!lesson) throw new AppError(ERROR_CODES.NOT_FOUND, "Lesson not found.", 404)

  // Enforce explicit completion criteria (not just video play!)
  if (lesson.completionRule === "quiz_pass") {
    const quiz = safeParseJson<{ questions?: Array<{ id: string; correctId: string }> }>(
      lesson.quizJson,
      {}
    )
    const qs = quiz.questions || []
    if (qs.length > 0) {
      const passed = qs.every((q) => input.quizAnswers?.[q.id] === q.correctId)
      if (!passed) {
        throw new AppError(
          ERROR_CODES.VALIDATION_FAILED,
          "Complete the lesson verification quiz accurately to mark this lesson complete.",
          400
        )
      }
    }
  }

  const completed = new Set(safeParseJson<string[]>(enrollment.completedLessonIdsJson, []))
  completed.add(lesson.id)

  const totalLessons = enrollment.course.lessons.length || 1
  const progressPercent = Math.round((completed.size / totalLessons) * 100)
  const isFinished = completed.size >= totalLessons

  const updated = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      completedLessonIdsJson: toJsonString(Array.from(completed)),
      progressPercent,
      status: isFinished ? "completed" : "active",
      completedAt: isFinished ? new Date() : null,
    },
  })

  if (isFinished && enrollment.course.certificateEnabled) {
    const existingCert = await prisma.certificate.findFirst({
      where: { userId: ctx.userId, courseId: enrollment.courseId, status: "valid" },
    })
    if (!existingCert) {
      await prisma.certificate.create({
        data: {
          credentialId: generateCredentialId(),
          userId: ctx.userId,
          organizationId: enrollment.course.organizationId,
          courseId: enrollment.courseId,
          recipientName: ctx.displayName,
          issuerName: "HackKro Learning Academy",
          title: `${enrollment.course.title} — Completion Certificate`,
          achievementType: "completion",
          criteriaText: "Completed 100% of lessons and explicit lesson verification checks.",
        },
      })
    }
  }

  return updated
}

export async function submitPracticeAttempt(
  ctx: AuthContext,
  input: { practiceItemId: string; answer: unknown; timeSpentSeconds?: number }
) {
  const item = await prisma.practiceItem.findUnique({ where: { id: input.practiceItemId } })
  if (!item) throw new AppError(ERROR_CODES.NOT_FOUND, "Practice item not found.", 404)

  const key = safeParseJson<{ correctOptionId?: string; value?: string }>(item.answerKeyJson, {})
  let isCorrect = false
  if (key.correctOptionId) {
    isCorrect = String(input.answer) === String(key.correctOptionId)
  } else if (key.value) {
    isCorrect = String(input.answer).trim().toLowerCase() === key.value.trim().toLowerCase()
  }

  const attempt = await prisma.practiceAttempt.create({
    data: {
      userId: ctx.userId,
      practiceItemId: item.id,
      submittedAnswerJson: toJsonString(input.answer),
      isCorrect,
      timeSpentSeconds: Math.max(0, input.timeSpentSeconds || 0),
    },
  })

  return {
    attempt,
    isCorrect,
    explanation: item.explanation,
  }
}

export async function runMockInterviewSimulation(
  ctx: AuthContext,
  input: {
    roleTitle: string
    experienceLevel: string
    interviewType: "technical" | "behavioral" | "system_design" | "case"
    durationMinutes: number
    responses: Array<{ question: string; answer: string }>
    consentedToTranscript: boolean
  }
) {
  const avgLength =
    input.responses.length > 0
      ? Math.round(
          input.responses.reduce((s, r) => s + r.answer.trim().split(/\s+/).length, 0) /
            input.responses.length
        )
      : 0

  const structureScore = Math.min(95, 55 + avgLength)
  const aiFeedback = {
    isAiGenerated: true,
    disclaimer: "AI-generated advisory feedback for practice only; not a hiring prediction or guarantee.",
    overallScore: structureScore,
    strengths: [
      avgLength >= 25
        ? "Clear, detailed explanation depth across prompts."
        : "Concise direct answers.",
      `Aligned vocabulary for ${input.roleTitle} (${input.interviewType}).`,
    ],
    improvements: [
      "Structure technical trade-offs explicitly (latency vs consistency, cost vs scale).",
      "Quantify measurable outcomes when citing past projects.",
    ],
  }

  const actionItems = [
    `Practice 3 ${input.interviewType} prompts for ${input.roleTitle}`,
    "Add concrete metrics to top 2 portfolio project summaries",
  ]

  return prisma.mockInterview.create({
    data: {
      userId: ctx.userId,
      roleTitle: input.roleTitle,
      experienceLevel: input.experienceLevel,
      interviewType: input.interviewType,
      durationMinutes: input.durationMinutes,
      status: "completed",
      transcriptJson: input.consentedToTranscript ? toJsonString(input.responses) : "[]",
      aiFeedbackJson: toJsonString(aiFeedback),
      actionItemsJson: toJsonString(actionItems),
      consentedToTranscript: input.consentedToTranscript,
    },
  })
}

export async function bookMentorSlotAtomic(
  ctx: AuthContext,
  input: { slotId: string; sessionType: string; topic: string; menteeTimezone?: string }
) {
  const booking = await prisma.$transaction(async (tx) => {
    const slot = await tx.mentorSlot.findUnique({
      where: { id: input.slotId },
      include: { mentor: true },
    })
    if (!slot) throw new AppError(ERROR_CODES.NOT_FOUND, "Mentorship slot not found.", 404)
    if (slot.mentor.userId === ctx.userId) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "You cannot book your own mentorship slot.", 400)
    }

    // Atomic compare-and-set prevents double booking under concurrency
    const claimed = await tx.mentorSlot.updateMany({
      where: { id: slot.id, status: "available" },
      data: { status: "booked" },
    })
    if (claimed.count === 0) {
      throw new AppError(ERROR_CODES.CONFLICT, "This mentorship slot was just reserved by another learner.", 409)
    }

    const meetingUrl = `https://meet.hackkro.local/session/${slot.id}`

    return tx.booking.create({
      data: {
        mentorId: slot.mentorId,
        menteeId: ctx.userId,
        slotId: slot.id,
        sessionType: input.sessionType,
        topic: input.topic,
        menteeTimezone: input.menteeTimezone || ctx.timezone,
        amount: slot.mentor.hourlyRate,
        currency: slot.mentor.currency,
        meetingUrl,
        status: "confirmed",
      },
    })
  })

  await createNotification({
    userId: ctx.userId,
    category: "transactional",
    title: "Mentorship session confirmed",
    body: `Your session "${input.topic}" is booked. Meeting link: ${booking.meetingUrl}`,
    actionUrl: "/mentorship",
  })

  return booking
}
