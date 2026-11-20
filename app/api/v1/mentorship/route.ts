import { NextRequest } from "next/server"
import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import { bookMentorSlotAtomic } from "@/backend/modules/learning-mentorship.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    const mentors = await prisma.mentorProfile.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        slots: {
          where: { status: "available", startAt: { gt: new Date() } },
          orderBy: { startAt: "asc" },
        },
      },
    })

    const myBookings = ctx
      ? await prisma.booking.findMany({
          where: { OR: [{ menteeId: ctx.userId }, { mentor: { userId: ctx.userId } }] },
          include: {
            mentor: { include: { user: { select: { displayName: true } } } },
            mentee: { select: { displayName: true } },
            slot: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : []

    return apiSuccess({
      mentors: mentors.map((m) => ({
        ...m,
        expertise: safeParseJson(m.expertiseJson, []),
        verifiedFacts: safeParseJson(m.verifiedFactsJson, []),
        selfReported: safeParseJson(m.selfReportedJson, []),
        sessionTypes: safeParseJson(m.sessionTypesJson, []),
      })),
      myBookings,
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()

    if (body.action === "book") {
      const booking = await bookMentorSlotAtomic(ctx, body)
      return apiSuccess({ booking }, 201)
    }

    if (body.action === "add_slot") {
      const mentor = await prisma.mentorProfile.findUnique({ where: { userId: ctx.userId } })
      if (!mentor) throw new AppError(ERROR_CODES.FORBIDDEN, "Mentor profile required.", 403)
      const slot = await prisma.mentorSlot.create({
        data: {
          mentorId: mentor.id,
          startAt: new Date(body.startAt),
          endAt: new Date(body.endAt),
          timezone: body.timezone || ctx.timezone,
        },
      })
      return apiSuccess({ slot }, 201)
    }

    if (body.action === "complete_booking") {
      const booking = await prisma.booking.findUnique({
        where: { id: body.bookingId },
        include: { mentor: true },
      })
      if (!booking || (booking.mentor.userId !== ctx.userId && booking.menteeId !== ctx.userId)) {
        throw new AppError(ERROR_CODES.FORBIDDEN, "Not authorized for this booking.", 403)
      }
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "completed" },
      })
      return apiSuccess({ booking: updated })
    }

    if (body.action === "review") {
      const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } })
      if (!booking || booking.menteeId !== ctx.userId || booking.status !== "completed") {
        throw new AppError(
          ERROR_CODES.VALIDATION_FAILED,
          "Reviews can only be submitted after a completed booking.",
          400
        )
      }
      const rating = Math.max(1, Math.min(5, Number(body.rating || 5)))
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { rating, reviewText: String(body.reviewText || "") },
      })
      return apiSuccess({ booking: updated })
    }

    if (body.action === "cancel") {
      const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } })
      if (!booking || booking.menteeId !== ctx.userId) {
        throw new AppError(ERROR_CODES.FORBIDDEN, "Only the mentee can cancel here.", 403)
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.mentorSlot.update({
          where: { id: booking.slotId },
          data: { status: "available" },
        })
        return tx.booking.update({
          where: { id: booking.id },
          data: { status: "cancelled" },
        })
      })
      return apiSuccess({ booking: updated })
    }

    if (body.action === "upsert_mentor_profile") {
      const profile = await prisma.mentorProfile.upsert({
        where: { userId: ctx.userId },
        update: {
          headline: body.headline,
          bio: body.bio,
          expertiseJson: toJsonString(body.expertise || []),
          company: body.company || "",
          roleTitle: body.roleTitle || "",
          hourlyRate: Number(body.hourlyRate || 0),
        },
        create: {
          userId: ctx.userId,
          headline: body.headline || `${ctx.displayName} — Mentor`,
          bio: body.bio || "",
          expertiseJson: toJsonString(body.expertise || []),
          company: body.company || "",
          roleTitle: body.roleTitle || "",
          hourlyRate: Number(body.hourlyRate || 0),
        },
      })
      return apiSuccess({ mentorProfile: profile })
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported mentorship action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
