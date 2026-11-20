import crypto from "crypto"
import prisma from "@/lib/db"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { AuthContext } from "@/backend/utils/rbac-abac"
import { createNotification } from "@/backend/modules/notifications.service"
import { normalizeEmail } from "@/backend/utils/phone"

export async function createTeam(
  ctx: AuthContext,
  input: { opportunityId: string; name: string; trackName?: string }
) {
  const op = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } })
  if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)

  // Check conflicting active teams for the same opportunity
  const existingConflict = await prisma.teamMember.findFirst({
    where: {
      userId: ctx.userId,
      status: "accepted",
      team: { opportunityId: op.id },
    },
  })
  if (existingConflict) {
    throw new AppError(
      ERROR_CODES.CONFLICT,
      "You are already an accepted member of another team for this opportunity.",
      409
    )
  }

  const inviteToken = `TM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`

  const team = await prisma.$transaction(async (tx) => {
    const t = await tx.team.create({
      data: {
        opportunityId: op.id,
        name: input.name.trim(),
        trackName: input.trackName || "",
        captainId: ctx.userId,
        inviteToken,
      },
    })

    await tx.teamMember.create({
      data: {
        teamId: t.id,
        userId: ctx.userId,
        invitedEmail: ctx.primaryEmail || `${ctx.userId}@hackkro.local`,
        role: "captain",
        status: "accepted",
        joinedAt: new Date(),
      },
    })

    await tx.teamActivityLog.create({
      data: {
        teamId: t.id,
        actorId: ctx.userId,
        action: "team_created",
        details: `Team "${t.name}" created for ${op.title}.`,
      },
    })

    return t
  })

  return team
}

export async function inviteTeamMember(
  ctx: AuthContext,
  input: { teamId: string; identifier: string }
) {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    include: { opportunity: true, members: true },
  })
  if (!team) throw new AppError(ERROR_CODES.NOT_FOUND, "Team not found.", 404)
  if (team.captainId !== ctx.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Only the team captain can invite members.", 403)
  }
  if (team.isLocked) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Team roster is locked.", 400)
  }

  const activeCount = team.members.filter((m) => m.status === "accepted").length
  if (activeCount >= team.opportunity.teamMax) {
    throw new AppError(
      ERROR_CODES.CAPACITY_REACHED,
      `Team has reached the maximum size of ${team.opportunity.teamMax} members.`,
      409
    )
  }

  const raw = input.identifier.trim()
  const targetUser = raw.includes("@")
    ? await prisma.user.findUnique({ where: { primaryEmail: normalizeEmail(raw) } })
    : await prisma.user.findUnique({ where: { username: raw.toLowerCase() } })

  const invitedEmail = targetUser?.primaryEmail || (raw.includes("@") ? normalizeEmail(raw) : `${raw}@pending.hackkro`)

  const member = await prisma.teamMember.upsert({
    where: { teamId_invitedEmail: { teamId: team.id, invitedEmail } },
    update: {
      userId: targetUser?.id ?? null,
      status: "invited",
      removedAt: null,
    },
    create: {
      teamId: team.id,
      userId: targetUser?.id ?? null,
      invitedEmail,
      role: "member",
      status: "invited",
    },
  })

  await prisma.teamActivityLog.create({
    data: {
      teamId: team.id,
      actorId: ctx.userId,
      action: "member_invited",
      details: `Invited ${invitedEmail} to join ${team.name}.`,
    },
  })

  if (targetUser) {
    await prisma.personalTask.create({
      data: {
        userId: targetUser.id,
        title: `Team invitation: ${team.name}`,
        description: `${ctx.displayName} invited you to join ${team.name} for ${team.opportunity.title}.`,
        sourceType: "team_invite",
        sourceId: member.id,
        actionUrl: `/team?teamId=${team.id}`,
        priority: "high",
      },
    })
    await createNotification({
      userId: targetUser.id,
      category: "transactional",
      title: `Team invitation from ${team.name}`,
      body: `You were invited to join team "${team.name}" for ${team.opportunity.title}.`,
      actionUrl: `/team?teamId=${team.id}`,
    })
  }

  return member
}

export async function respondToTeamInvite(
  ctx: AuthContext,
  input: { teamId: string; accept: boolean }
) {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    include: { opportunity: true, members: true },
  })
  if (!team) throw new AppError(ERROR_CODES.NOT_FOUND, "Team not found.", 404)
  if (team.isLocked) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Team roster is already locked.", 400)
  }

  const membership = team.members.find(
    (m) =>
      m.userId === ctx.userId ||
      (ctx.primaryEmail && m.invitedEmail.toLowerCase() === ctx.primaryEmail.toLowerCase())
  )
  if (!membership) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "No invitation found for your account.", 404)
  }

  if (input.accept) {
    const conflict = await prisma.teamMember.findFirst({
      where: {
        userId: ctx.userId,
        status: "accepted",
        team: { opportunityId: team.opportunityId, id: { not: team.id } },
      },
    })
    if (conflict) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        "You already belong to another team for this opportunity.",
        409
      )
    }

    const acceptedCount = team.members.filter((m) => m.status === "accepted").length
    if (acceptedCount >= team.opportunity.teamMax) {
      throw new AppError(ERROR_CODES.CAPACITY_REACHED, "This team is already full.", 409)
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.teamMember.update({
      where: { id: membership.id },
      data: {
        userId: ctx.userId,
        status: input.accept ? "accepted" : "declined",
        joinedAt: input.accept ? new Date() : null,
      },
    })

    await tx.personalTask.updateMany({
      where: { userId: ctx.userId, sourceType: "team_invite", sourceId: membership.id },
      data: { status: "completed", completedAt: new Date() },
    })

    await tx.teamActivityLog.create({
      data: {
        teamId: team.id,
        actorId: ctx.userId,
        action: input.accept ? "invite_accepted" : "invite_declined",
        details: `${ctx.displayName} ${input.accept ? "joined" : "declined"} ${team.name}.`,
      },
    })
    return m
  })

  return updated
}

export async function removeOrTransferTeamMember(
  ctx: AuthContext,
  input: { teamId: string; memberId: string; action: "remove" | "transfer_captain" }
) {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    include: { members: true },
  })
  if (!team) throw new AppError(ERROR_CODES.NOT_FOUND, "Team not found.", 404)
  if (team.captainId !== ctx.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Only the team captain can manage members.", 403)
  }

  const targetMember = team.members.find((m) => m.id === input.memberId)
  if (!targetMember) throw new AppError(ERROR_CODES.NOT_FOUND, "Team member not found.", 404)

  if (input.action === "remove") {
    if (targetMember.userId === team.captainId) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Transfer captaincy before leaving.", 400)
    }
    await prisma.$transaction(async (tx) => {
      await tx.teamMember.update({
        where: { id: targetMember.id },
        data: { status: "removed", removedAt: new Date() },
      })
      await tx.teamActivityLog.create({
        data: {
          teamId: team.id,
          actorId: ctx.userId,
          action: "member_removed",
          details: `Member ${targetMember.invitedEmail} removed; workspace access revoked immediately.`,
        },
      })
    })
    return { removed: true }
  }

  if (targetMember.status !== "accepted" || !targetMember.userId) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Captaincy can only transfer to an accepted member.", 400)
  }

  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: team.id }, data: { captainId: targetMember.userId! } })
    await tx.teamMember.updateMany({
      where: { teamId: team.id, userId: ctx.userId },
      data: { role: "member" },
    })
    await tx.teamMember.update({
      where: { id: targetMember.id },
      data: { role: "captain" },
    })
    await tx.teamActivityLog.create({
      data: {
        teamId: team.id,
        actorId: ctx.userId,
        action: "captain_transferred",
        details: `Captaincy transferred to ${targetMember.invitedEmail}.`,
      },
    })
  })

  return { transferred: true, newCaptainId: targetMember.userId }
}

export async function lockTeamRoster(ctx: AuthContext, teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { opportunity: true, members: true },
  })
  if (!team) throw new AppError(ERROR_CODES.NOT_FOUND, "Team not found.", 404)
  if (team.captainId !== ctx.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Only the team captain can lock the roster.", 403)
  }

  const accepted = team.members.filter((m) => m.status === "accepted").length
  if (accepted < team.opportunity.teamMin || accepted > team.opportunity.teamMax) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      `Team size (${accepted}) must be between ${team.opportunity.teamMin} and ${team.opportunity.teamMax}.`,
      400
    )
  }

  const locked = await prisma.team.update({
    where: { id: team.id },
    data: { isLocked: true, lockedAt: new Date() },
  })
  await prisma.teamActivityLog.create({
    data: {
      teamId: team.id,
      actorId: ctx.userId,
      action: "roster_locked",
      details: `Team roster locked with ${accepted} verified member(s).`,
    },
  })
  return locked
}
