import { NextRequest } from "next/server"
import prisma, { safeParseJson } from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import {
  autosaveOrSubmitAttempt,
  recordProctorSignal,
  startAssessmentAttempt,
  submitProctorAppeal,
} from "@/backend/modules/assessments-judging.service"
import { runSandboxedJavaScript } from "@/backend/adapters/code-sandbox.adapter"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const action = body.action as string

    if (action === "start") {
      const session = await startAssessmentAttempt(ctx, {
        assessmentId: params.id,
        proctoringConsented: Boolean(body.proctoringConsented),
        accommodationExtraMinutes: Number(body.accommodationExtraMinutes || 0),
      })
      return apiSuccess(session)
    }

    if (action === "autosave" || action === "submit") {
      const result = await autosaveOrSubmitAttempt(ctx, {
        attemptId: body.attemptId,
        answers: body.answers || {},
        submitFinal: action === "submit",
      })
      return apiSuccess(result)
    }

    if (action === "proctor_signal") {
      const result = await recordProctorSignal(ctx, {
        attemptId: body.attemptId,
        signalType: body.signalType,
        details: body.details,
      })
      return apiSuccess(result)
    }

    if (action === "appeal") {
      const updated = await submitProctorAppeal(ctx, body.attemptId, body.appealNotes || "")
      return apiSuccess({ attempt: updated })
    }

    if (action === "run_code") {
      const question = await prisma.question.findUnique({ where: { id: body.questionId } })
      if (!question) throw new AppError(ERROR_CODES.NOT_FOUND, "Question not found.", 404)
      const correct = safeParseJson<{ functionName?: string }>(question.correctAnswerJson, {})
      const publicCases = safeParseJson<Array<{ input: unknown; expectedOutput: unknown; isHidden?: boolean }>>(
        question.testCasesJson,
        []
      ).filter((tc) => !tc.isHidden)

      const exec = runSandboxedJavaScript(
        String(body.code || ""),
        correct.functionName || "solution",
        publicCases
      )
      return apiSuccess({ execution: exec })
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported assessment action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
