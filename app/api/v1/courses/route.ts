import { NextRequest } from "next/server"
import prisma, { safeParseJson } from "@/lib/db"
import { getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import {
  completeLessonWithCriteria,
  enrollAndTrackCourse,
} from "@/backend/modules/learning-mentorship.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")

    if (slug) {
      const course = await prisma.course.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
        include: {
          lessons: { orderBy: { orderIndex: "asc" } },
          cohorts: true,
        },
      })
      if (!course) throw new AppError(ERROR_CODES.NOT_FOUND, "Course not found.", 404)

      const enrollment = ctx
        ? await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: ctx.userId, courseId: course.id } },
          })
        : null

      return apiSuccess({
        course: {
          ...course,
          outcomes: safeParseJson(course.outcomesJson, []),
          syllabus: safeParseJson(course.syllabusJson, []),
          lessons: course.lessons.map((l) => ({
            ...l,
            quiz: safeParseJson(l.quizJson, {}),
          })),
        },
        enrollment: enrollment
          ? {
              ...enrollment,
              completedLessonIds: safeParseJson<string[]>(enrollment.completedLessonIdsJson, []),
            }
          : null,
      })
    }

    const courses = await prisma.course.findMany({
      where: { published: true },
      include: { _count: { select: { lessons: true, enrollments: true } } },
      orderBy: { createdAt: "desc" },
    })

    const enrollments = ctx
      ? await prisma.enrollment.findMany({ where: { userId: ctx.userId } })
      : []

    return apiSuccess({
      courses: courses.map((c) => ({
        ...c,
        outcomes: safeParseJson(c.outcomesJson, []),
        enrollment: enrollments.find((e) => e.courseId === c.id) || null,
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
    if (body.action === "enroll") {
      const enrollment = await enrollAndTrackCourse(ctx, {
        courseId: body.courseId,
        cohortId: body.cohortId,
      })
      return apiSuccess({ enrollment }, 201)
    }
    if (body.action === "complete_lesson") {
      const enrollment = await completeLessonWithCriteria(ctx, {
        courseId: body.courseId,
        lessonId: body.lessonId,
        quizAnswers: body.quizAnswers,
      })
      return apiSuccess({
        enrollment: {
          ...enrollment,
          completedLessonIds: safeParseJson<string[]>(enrollment.completedLessonIdsJson, []),
        },
      })
    }
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported course action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
