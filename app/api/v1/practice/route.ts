import { NextRequest } from "next/server"
import prisma, { safeParseJson } from "@/lib/db"
import { getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import {
  runMockInterviewSimulation,
  submitPracticeAttempt,
} from "@/backend/modules/learning-mentorship.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const difficulty = searchParams.get("difficulty")

    const items = await prisma.practiceItem.findMany({
      where: {
        ...(category && category !== "all" ? { category } : {}),
        ...(difficulty && difficulty !== "all" ? { difficulty } : {}),
      },
      orderBy: { createdAt: "desc" },
    })

    let analytics: any = null
    let mockInterviews: any[] = []
    if (ctx) {
      const attempts = await prisma.practiceAttempt.findMany({
        where: { userId: ctx.userId },
        include: { practiceItem: { select: { topic: true, category: true } } },
        orderBy: { createdAt: "desc" },
      })
      const correctCount = attempts.filter((a) => a.isCorrect).length
      const avgTime =
        attempts.length > 0
          ? Math.round(attempts.reduce((s, a) => s + a.timeSpentSeconds, 0) / attempts.length)
          : 0

      analytics = {
        totalAttempts: attempts.length,
        accuracyPercent: attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0,
        averageSeconds: avgTime,
      }

      mockInterviews = await prisma.mockInterview.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
      })
    }

    return apiSuccess({
      items: items.map((i) => ({
        id: i.id,
        slug: i.slug,
        category: i.category,
        companyTag: i.companyTag,
        roleTag: i.roleTag,
        skillTag: i.skillTag,
        topic: i.topic,
        difficulty: i.difficulty,
        prompt: i.prompt,
        options: safeParseJson(i.optionsJson, []),
      })),
      analytics,
      mockInterviews: mockInterviews.map((m) => ({
        ...m,
        aiFeedback: safeParseJson(m.aiFeedbackJson, {}),
        actionItems: safeParseJson(m.actionItemsJson, []),
      })),
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    if (body.action === "submit_practice") {
      const result = await submitPracticeAttempt(ctx, body)
      return apiSuccess(result)
    }
    if (body.action === "mock_interview") {
      const interview = await runMockInterviewSimulation(ctx, body)
      return apiSuccess(
        {
          mockInterview: {
            ...interview,
            aiFeedback: safeParseJson(interview.aiFeedbackJson, {}),
            actionItems: safeParseJson(interview.actionItemsJson, []),
          },
        },
        201
      )
    }
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported practice action.", 400)
  } catch (err) {
    return apiError(err)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    await prisma.practiceAttempt.deleteMany({ where: { userId: ctx.userId } })
    return apiSuccess({ cleared: true })
  } catch (err) {
    return apiError(err)
  }
}
