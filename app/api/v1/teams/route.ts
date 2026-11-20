import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import {
  createTeam,
  inviteTeamMember,
  lockTeamRoster,
  removeOrTransferTeamMember,
  respondToTeamInvite,
} from "@/backend/modules/teams.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { sanitizePlainText } from "@/backend/utils/sanitizer"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get("teamId")

    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          opportunity: { select: { id: true, slug: true, title: true, teamMin: true, teamMax: true } },
          members: { include: { user: { select: { id: true, displayName: true, username: true, primaryEmail: true } } } },
          tasks: { orderBy: { createdAt: "desc" } },
          discussions: {
            include: { author: { select: { id: true, displayName: true } } },
            orderBy: { createdAt: "asc" },
          },
          activityLogs: { orderBy: { createdAt: "desc" }, take: 30 },
        },
      })
      if (!team) throw new AppError(ERROR_CODES.NOT_FOUND, "Team not found.", 404)

      // Immediate access revocation check: removed/declined members cannot read team workspace
      const isActiveMember = team.members.some(
        (m) =>
          (m.userId === ctx.userId || (ctx.primaryEmail && m.invitedEmail === ctx.primaryEmail.toLowerCase())) &&
          ["accepted", "invited"].includes(m.status)
      )
      if (!isActiveMember && ctx.activeRole !== "platform_admin") {
        throw new AppError(ERROR_CODES.FORBIDDEN, "You do not have access to this team workspace.", 403)
      }
      return apiSuccess({ team })
    }

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            OR: [
              { userId: ctx.userId },
              ...(ctx.primaryEmail ? [{ invitedEmail: ctx.primaryEmail.toLowerCase() }] : []),
            ],
            status: { in: ["accepted", "invited"] },
          },
        },
      },
      include: {
        opportunity: { select: { id: true, slug: true, title: true, teamMin: true, teamMax: true } },
        members: { include: { user: { select: { id: true, displayName: true, username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess({ teams })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const action = body.action as string

    if (action === "create") {
      const team = await createTeam(ctx, {
        opportunityId: body.opportunityId,
        name: body.name,
        trackName: body.trackName,
      })
      return apiSuccess({ team }, 201)
    }

    if (action === "invite") {
      const member = await inviteTeamMember(ctx, {
        teamId: body.teamId,
        identifier: body.identifier,
      })
      return apiSuccess({ member }, 201)
    }

    if (action === "respond") {
      const member = await respondToTeamInvite(ctx, {
        teamId: body.teamId,
        accept: Boolean(body.accept),
      })
      return apiSuccess({ member })
    }

    if (action === "lock") {
      const team = await lockTeamRoster(ctx, body.teamId)
      return apiSuccess({ team })
    }

    if (action === "remove_member" || action === "transfer_captain") {
      const result = await removeOrTransferTeamMember(ctx, {
        teamId: body.teamId,
        memberId: body.memberId,
        action: action === "remove_member" ? "remove" : "transfer_captain",
      })
      return apiSuccess(result)
    }

    if (action === "add_task") {
      const member = await prisma.teamMember.findFirst({
        where: { teamId: body.teamId, userId: ctx.userId, status: "accepted" },
      })
      if (!member) throw new AppError(ERROR_CODES.FORBIDDEN, "Active team membership required.", 403)
      const task = await prisma.teamTask.create({
        data: {
          teamId: body.teamId,
          title: sanitizePlainText(body.title, 180),
          milestone: sanitizePlainText(body.milestone || "MVP", 80),
        },
      })
      return apiSuccess({ task }, 201)
    }

    if (action === "toggle_task") {
      const task = await prisma.teamTask.findUnique({ where: { id: body.taskId } })
      if (!task) throw new AppError(ERROR_CODES.NOT_FOUND, "Task not found.", 404)
      const member = await prisma.teamMember.findFirst({
        where: { teamId: task.teamId, userId: ctx.userId, status: "accepted" },
      })
      if (!member) throw new AppError(ERROR_CODES.FORBIDDEN, "Active team membership required.", 403)
      const updated = await prisma.teamTask.update({
        where: { id: task.id },
        data: { status: body.status || (task.status === "done" ? "todo" : "done") },
      })
      return apiSuccess({ task: updated })
    }

    if (action === "post_discussion") {
      const member = await prisma.teamMember.findFirst({
        where: { teamId: body.teamId, userId: ctx.userId, status: "accepted" },
      })
      if (!member) throw new AppError(ERROR_CODES.FORBIDDEN, "Active team membership required.", 403)
      const post = await prisma.teamDiscussion.create({
        data: {
          teamId: body.teamId,
          authorId: ctx.userId,
          message: sanitizePlainText(body.message, 2000),
        },
        include: { author: { select: { id: true, displayName: true } } },
      })
      return apiSuccess({ post }, 201)
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported team action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
