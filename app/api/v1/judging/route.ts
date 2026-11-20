import { NextRequest } from "next/server"
import prisma, { safeParseJson } from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import {
  assignEvaluatorToSubmission,
  createRubric,
  submitJudgeEvaluation,
} from "@/backend/modules/assessments-judging.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const opportunityId = searchParams.get("opportunityId")

    if (opportunityId) {
      const op = await prisma.opportunity.findUnique({ where: { id: opportunityId } })
      if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)
      assertPermission(ctx, "rubric:manage", op.organizationId)

      const [rubrics, submissions, assignments, evaluations] = await Promise.all([
        prisma.rubric.findMany({ where: { opportunityId: op.id } }),
        prisma.submission.findMany({
          where: { opportunityId: op.id },
          include: {
            user: { select: { id: true, displayName: true } },
            team: { select: { id: true, name: true } },
            versions: { orderBy: { versionNumber: "desc" }, take: 1 },
          },
        }),
        prisma.judgeAssignment.findMany({
          where: { opportunityId: op.id },
          include: { evaluator: { select: { id: true, displayName: true, primaryEmail: true } } },
        }),
        prisma.evaluation.findMany({
          where: { submission: { opportunityId: op.id } },
          include: { evaluator: { select: { id: true, displayName: true } } },
        }),
      ])

      return apiSuccess({
        rubrics: rubrics.map((r) => ({ ...r, criteria: safeParseJson(r.criteriaJson, []) })),
        submissions,
        assignments,
        evaluations,
      })
    }

    // Evaluator view: ONLY assigned entries; hide participant identity when blindMode is true!
    const assignments = await prisma.judgeAssignment.findMany({
      where: { evaluatorId: ctx.userId },
      include: {
        opportunity: {
          include: { rubrics: true },
        },
        submission: {
          include: {
            team: { select: { name: true } },
            user: { select: { displayName: true } },
            versions: { orderBy: { versionNumber: "desc" }, take: 1 },
            evaluations: { where: { evaluatorId: ctx.userId } },
          },
        },
      },
    })

    const maskedAssignments = assignments.map((a) => {
      const latestVersion = a.submission.versions[0] || null
      return {
        id: a.id,
        opportunityId: a.opportunityId,
        opportunityTitle: a.opportunity.title,
        blindMode: a.blindMode,
        coiDeclared: a.coiDeclared,
        coiHasConflict: a.coiHasConflict,
        status: a.status,
        rubrics: a.opportunity.rubrics.map((r) => ({
          ...r,
          criteria: safeParseJson(r.criteriaJson, []),
        })),
        submission: {
          id: a.submission.id,
          title: a.submission.title,
          trackName: a.submission.trackName,
          status: a.submission.status,
          currentVersionNumber: a.submission.currentVersionNumber,
          participantDisplay: a.blindMode
            ? `Anonymous Entry #${a.submission.id.slice(-6).toUpperCase()}`
            : a.submission.team?.name || a.submission.user.displayName,
          latestVersion,
          myEvaluation: a.submission.evaluations[0] || null,
        },
      }
    })

    return apiSuccess({ assignments: maskedAssignments })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const action = body.action as string

    if (action === "create_rubric") {
      const rubric = await createRubric(ctx, body)
      return apiSuccess({ rubric }, 201)
    }
    if (action === "assign_judge") {
      const assignment = await assignEvaluatorToSubmission(ctx, body)
      return apiSuccess({ assignment }, 201)
    }
    if (action === "evaluate") {
      const result = await submitJudgeEvaluation(ctx, body)
      return apiSuccess(result)
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported judging action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
