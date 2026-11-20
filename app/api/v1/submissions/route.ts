import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import {
  appealSubmissionStatus,
  createOrUpdateSubmission,
} from "@/backend/modules/events-submissions.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const opportunityId = searchParams.get("opportunityId")

    const submissions = await prisma.submission.findMany({
      where: {
        userId: ctx.userId,
        ...(opportunityId ? { opportunityId } : {}),
      },
      include: {
        opportunity: { select: { id: true, slug: true, title: true } },
        versions: { orderBy: { versionNumber: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    })
    return apiSuccess({ submissions })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    if (body.action === "appeal") {
      const updated = await appealSubmissionStatus(ctx, body.submissionId, body.appealText)
      return apiSuccess({ submission: updated })
    }
    const submission = await createOrUpdateSubmission(ctx, body)
    return apiSuccess({ submission }, 201)
  } catch (err) {
    return apiError(err)
  }
}
