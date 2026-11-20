import { NextRequest } from "next/server"
import prisma, { toJsonString } from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import {
  advanceOfferWorkflow,
  moveCandidateStage,
  scheduleInterviewWithConflictCheck,
} from "@/backend/modules/hiring.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const action = body.action as string

    if (action === "move_stage") {
      const stage = await moveCandidateStage(ctx, body)
      return apiSuccess({ stage })
    }

    if (action === "schedule_interview") {
      const interview = await scheduleInterviewWithConflictCheck(ctx, body)
      return apiSuccess({ interview }, 201)
    }

    if (action === "submit_scorecard") {
      const interview = await prisma.interview.findUnique({
        where: { id: body.interviewId },
        include: { requisition: true },
      })
      if (!interview) throw new AppError(ERROR_CODES.NOT_FOUND, "Interview not found.", 404)
      assertPermission(ctx, "scorecard:submit", interview.requisition.organizationId)

      const scorecard = await prisma.scorecard.upsert({
        where: {
          interviewId_interviewerId: {
            interviewId: interview.id,
            interviewerId: ctx.userId,
          },
        },
        update: {
          competenciesJson: toJsonString(body.competencies || []),
          overallRecommendation: body.overallRecommendation,
          evidenceNotes: body.evidenceNotes || "",
          submittedAt: new Date(),
        },
        create: {
          interviewId: interview.id,
          interviewerId: ctx.userId,
          competenciesJson: toJsonString(body.competencies || []),
          overallRecommendation: body.overallRecommendation,
          evidenceNotes: body.evidenceNotes || "",
        },
      })
      return apiSuccess({ scorecard }, 201)
    }

    if (action === "offer") {
      const offer = await advanceOfferWorkflow(ctx, {
        applicationId: body.applicationId,
        action: body.offerAction,
        compensationSummary: body.compensationSummary,
        termsText: body.termsText,
      })
      return apiSuccess({ offer })
    }

    if (action === "ai_summary") {
      const stage = await prisma.candidateStage.findUnique({
        where: { applicationId: body.applicationId },
        include: {
          requisition: true,
          application: {
            include: { user: { include: { profile: true, skills: true } }, resumeVersion: true },
          },
        },
      })
      if (!stage) throw new AppError(ERROR_CODES.NOT_FOUND, "Candidate not found.", 404)
      assertPermission(ctx, "candidate:read", stage.requisition.organizationId)

      const summary = {
        isAiGenerated: true,
        requiresHumanReview: true,
        modelVersion: "hackkro-advisory-v1",
        promptVersion: "resume_summary_v1",
        generatedAt: new Date().toISOString(),
        humanReviewedBy: body.humanReviewed ? ctx.userId : null,
        overrideReason: body.overrideReason || "",
        highlights: [
          `Skills: ${stage.application.user.skills.map((s) => s.name).join(", ") || "Listed on profile"}`,
          `Education: ${stage.application.user.profile?.degree || ""} ${stage.application.user.profile?.collegeName || ""}`,
          `Experience: ${stage.application.user.profile?.experienceYears ?? 0} year(s)`,
        ],
      }

      await prisma.candidateStage.update({
        where: { id: stage.id },
        data: { aiSummaryJson: toJsonString(summary) },
      })
      return apiSuccess({ aiSummary: summary })
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported pipeline action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
