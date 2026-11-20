import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })

    const [
      user,
      applications,
      saved,
      followed,
      tasks,
      teamMemberships,
      attempts,
      enrollments,
      bookings,
      certificates,
      offers,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ctx.userId },
        include: { profile: true, skills: true, resumes: { where: { isArchived: false } }, portfolioProjects: true },
      }),
      prisma.application.findMany({
        where: { userId: ctx.userId },
        include: {
          opportunity: { include: { organization: { select: { displayName: true, verificationStatus: true } } } },
          statusHistory: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.savedOpportunity.findMany({
        where: { userId: ctx.userId },
        include: { opportunity: { include: { organization: { select: { displayName: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.followOrganization.findMany({
        where: { userId: ctx.userId },
        include: { organization: true },
      }),
      prisma.personalTask.findMany({
        where: { userId: ctx.userId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      prisma.teamMember.findMany({
        where: {
          OR: [
            { userId: ctx.userId },
            ...(ctx.primaryEmail ? [{ invitedEmail: ctx.primaryEmail.toLowerCase() }] : []),
          ],
          status: { in: ["invited", "accepted"] },
        },
        include: {
          team: {
            include: {
              opportunity: { select: { id: true, slug: true, title: true } },
              members: { include: { user: { select: { id: true, displayName: true, username: true } } } },
            },
          },
        },
      }),
      prisma.assessmentAttempt.findMany({
        where: { userId: ctx.userId },
        include: { assessment: { select: { id: true, slug: true, title: true, resultsPublished: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.enrollment.findMany({
        where: { userId: ctx.userId },
        include: { course: { select: { id: true, slug: true, title: true } } },
      }),
      prisma.booking.findMany({
        where: { menteeId: ctx.userId },
        include: {
          mentor: { include: { user: { select: { displayName: true } } } },
          slot: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.certificate.findMany({
        where: { userId: ctx.userId },
        orderBy: { issuedAt: "desc" },
      }),
      prisma.offer.findMany({
        where: { candidateId: ctx.userId },
        include: { requisition: { include: { opportunity: { select: { title: true } }, organization: { select: { displayName: true } } } } },
      }),
    ])

    // Compute profile completion dynamically
    const checks = [
      Boolean(user?.displayName),
      Boolean(user?.profile?.headline),
      Boolean(user?.profile?.collegeName),
      Boolean(user?.profile?.branch),
      Boolean(user?.skills && user.skills.length > 0),
      Boolean(user?.resumes && user.resumes.length > 0),
      Boolean(user?.profile?.githubUrl || user?.profile?.linkedinUrl),
    ]
    const profileCompletion = Math.round((checks.filter(Boolean).length / checks.length) * 100)

    return apiSuccess({
      profileCompletion,
      stats: {
        activeApplications: applications.filter((a) => !["withdrawn", "cancelled", "rejected"].includes(a.status)).length,
        savedCount: saved.length,
        pendingTasks: tasks.filter((t) => t.status === "pending").length,
        certificatesCount: certificates.filter((c) => c.status === "valid").length,
        points: user?.points || 0,
      },
      applications,
      saved,
      followed,
      tasks,
      teamInvites: teamMemberships.filter((m) => m.status === "invited"),
      teams: teamMemberships.filter((m) => m.status === "accepted").map((m) => m.team),
      assessments: attempts.map((a) => ({
        ...a,
        normalizedScore: a.assessment.resultsPublished ? a.normalizedScore : null,
      })),
      enrollments,
      bookings,
      certificates,
      offers,
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const taskId = body.taskId as string
    const status = body.status as "completed" | "dismissed"
    if (!taskId || !["completed", "dismissed"].includes(status)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Invalid task update.", 400)
    }

    const task = await prisma.personalTask.findUnique({ where: { id: taskId } })
    if (!task || task.userId !== ctx.userId) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Task not found.", 404)
    }

    const updated = await prisma.personalTask.update({
      where: { id: task.id },
      data: {
        status,
        completedAt: status === "completed" ? new Date() : null,
      },
    })
    return apiSuccess({ task: updated })
  } catch (err) {
    return apiError(err)
  }
}
