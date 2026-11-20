import { NextRequest } from "next/server"
import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { assertPermission, getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")

    if (slug) {
      const assessment = await prisma.assessment.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
        include: {
          organization: { select: { id: true, displayName: true } },
          opportunity: { select: { id: true, slug: true, title: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      })
      if (!assessment) throw new AppError(ERROR_CODES.NOT_FOUND, "Assessment not found.", 404)

      const userAttempts = ctx
        ? await prisma.assessmentAttempt.findMany({
            where: { assessmentId: assessment.id, userId: ctx.userId },
            orderBy: { createdAt: "desc" },
          })
        : []

      return apiSuccess({
        assessment: {
          ...assessment,
          instructions: safeParseJson(assessment.instructionsJson, []),
          proctoringConfig: safeParseJson(assessment.proctoringConfigJson, {}),
        },
        userAttempts,
      })
    }

    const assessments = await prisma.assessment.findMany({
      where: { isActive: true },
      include: {
        organization: { select: { displayName: true } },
        opportunity: { select: { slug: true, title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess({ assessments })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    assertPermission(ctx, "event:create", body.organizationId)

    const slugBase = String(body.title || "assessment")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
    const slug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`

    const assessment = await prisma.$transaction(async (tx) => {
      const a = await tx.assessment.create({
        data: {
          slug,
          organizationId: body.organizationId || null,
          opportunityId: body.opportunityId || null,
          title: body.title,
          description: body.description || "",
          instructionsJson: toJsonString(body.instructions || []),
          durationMinutes: Number(body.durationMinutes || 30),
          negativeMarkingRatio: Number(body.negativeMarkingRatio || 0),
          partialCredit: Boolean(body.partialCredit),
          maxAttempts: Number(body.maxAttempts || 1),
          proctoringConfigJson: toJsonString(body.proctoringConfig || { required: true }),
          showExplanations: Boolean(body.showExplanations),
          resultsPublished: Boolean(body.resultsPublished),
          createdBy: ctx.userId,
        },
      })

      if (Array.isArray(body.questions) && body.questions.length > 0) {
        await tx.question.createMany({
          data: body.questions.map((q: any) => ({
            assessmentId: a.id,
            organizationId: body.organizationId || null,
            format: q.format || "mcq_single",
            topic: q.topic || "General",
            skillTag: q.skillTag || "Problem Solving",
            difficulty: q.difficulty || "medium",
            prompt: q.prompt,
            codeSnippet: q.codeSnippet || "",
            optionsJson: toJsonString(q.options || []),
            correctAnswerJson: toJsonString(q.correctAnswer || {}),
            testCasesJson: toJsonString(q.testCases || []),
            points: Number(q.points || 10),
            explanation: q.explanation || "",
          })),
        })
      }
      return a
    })

    return apiSuccess({ assessment }, 201)
  } catch (err) {
    return apiError(err)
  }
}
