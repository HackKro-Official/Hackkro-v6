import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import { sanitizePlainText } from "@/backend/utils/sanitizer"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    const groups = await prisma.communityGroup.findMany({
      where: ctx ? undefined : { visibility: "public" },
      include: {
        organization: { select: { displayName: true, verificationStatus: true } },
        posts: {
          where: { isHidden: false },
          include: { author: { select: { id: true, displayName: true } } },
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    })
    return apiSuccess({ groups })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()

    if (body.action === "create_post") {
      const post = await prisma.communityPost.create({
        data: {
          groupId: body.groupId,
          authorId: ctx.userId,
          title: sanitizePlainText(body.title, 180),
          body: sanitizePlainText(body.body, 3000),
        },
        include: { author: { select: { id: true, displayName: true } } },
      })
      return apiSuccess({ post }, 201)
    }

    if (body.action === "report_post") {
      const report = await prisma.moderationReport.create({
        data: {
          reporterId: ctx.userId,
          targetType: "post",
          targetId: body.postId,
          reasonCategory: body.reasonCategory || "harassment",
          details: sanitizePlainText(body.details || "Flagged community post", 1000),
          status: "flagged",
        },
      })
      return apiSuccess({ report }, 201)
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported community action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
