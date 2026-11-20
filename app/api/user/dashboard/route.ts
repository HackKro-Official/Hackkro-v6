import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/user-auth-helper"
import connectToDatabase from "@/lib/mongoose"
import { User } from "@/models/user"
import { EventRegistration } from "@/models/event-registration"
import { EventModel } from "@/models/event"

export const dynamic = "force-dynamic"

function calculateProfileCompletion(user: any): { percentage: number; missingFields: string[] } {
  const fields = [
    { key: "name", label: "Full Name", weight: 10 },
    { key: "email", label: "Email Address", weight: 10 },
    { key: "mobile", label: "Phone Number", weight: 10 },
    { key: "college", label: "College / University", weight: 10 },
    { key: "degree", label: "Degree Course", weight: 5 },
    { key: "branch", label: "Branch / Specialization", weight: 5 },
    { key: "graduationYear", label: "Graduation Year", weight: 5 },
    { key: "bio", label: "About Bio", weight: 10 },
    { key: "skills", label: "Skills (at least 1)", weight: 10, check: (u: any) => u.skills && u.skills.length > 0 },
    { key: "githubUrl", label: "GitHub Profile", weight: 10 },
    { key: "linkedinUrl", label: "LinkedIn Profile", weight: 10 },
    { key: "resumeUrl", label: "Resume Link", weight: 5 },
  ]

  let score = 0
  const missingFields: string[] = []

  fields.forEach((f) => {
    const isPresent = f.check ? f.check(user) : user[f.key] && String(user[f.key]).trim().length > 0
    if (isPresent) {
      score += f.weight
    } else {
      missingFields.push(f.label)
    }
  })

  return { percentage: Math.min(100, score), missingFields }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req)

    if (!auth) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 })
    }

    await connectToDatabase()

    let userData: any = auth
    if (auth.role === "student") {
      userData = await User.findById(auth._id).select("-password").lean()
    }

    const { percentage: profileCompletion, missingFields } = calculateProfileCompletion(userData)

    // 1. Fetch user event registrations
    const registrations = await EventRegistration.find({
      $or: [
        { email: auth.email.toLowerCase() },
        ...(auth._id ? [{ userId: String(auth._id) }] : []),
      ],
    })
      .sort({ registeredAt: -1 })
      .lean()

    // 2. Fetch event metadata for all registered eventIds
    const eventIds = registrations.map((r: any) => r.eventId)
    const events = await EventModel.find({ id: { $in: eventIds } }).lean()
    const eventMap: Record<string, any> = {}
    events.forEach((evt: any) => {
      eventMap[evt.id] = evt
    })

    const now = new Date()

    // 3. Format Competitions list
    let ongoingUpcomingCount = 0
    const competitions = registrations.map((reg: any) => {
      const eventDetails = eventMap[reg.eventId] || {}
      const eventDate = eventDetails.date ? new Date(eventDetails.date) : new Date(reg.registeredAt)
      const isPast = eventDate < now || eventDetails.statusOverride === "past"
      const isLive = eventDetails.statusOverride === "live"

      if (!isPast) {
        ongoingUpcomingCount++
      }

      // Check if user or team is in winners
      let winnerStatus: any = null
      if (eventDetails.structuredWinners && Array.isArray(eventDetails.structuredWinners)) {
        const found = eventDetails.structuredWinners.find((w: any) => {
          const leaderMatch = w.leaderName && w.leaderName.toLowerCase() === reg.name.toLowerCase()
          const teamMatch = reg.teamName && w.teamName && w.teamName.toLowerCase() === reg.teamName.toLowerCase()
          return leaderMatch || teamMatch
        })
        if (found) {
          winnerStatus = {
            rank: found.rank,
            title: found.title,
            prizeWon: found.prizeWon,
          }
        }
      }

      return {
        _id: reg._id.toString(),
        registrationId: reg.registrationId,
        eventId: reg.eventId,
        eventTitle: reg.eventTitle || eventDetails.title || "Hackathon Challenge",
        eventImage:
          eventDetails.image ||
          "https://res.cloudinary.com/payb7fsq/image/upload/v1791981789/Hack_Kro_Logo.png",
        category: eventDetails.category || "Hackathon",
        mode: eventDetails.mode || "Online",
        date: eventDetails.date || reg.registeredAt,
        endDate: eventDetails.endDate,
        participationType: reg.participationType || "solo",
        teamName: reg.teamName,
        teamMembers: reg.teamMembers || [],
        domain: reg.domain,
        status: reg.status || "confirmed",
        isPast,
        isLive,
        registeredAt: reg.registeredAt,
        winnerStatus,
        venue: eventDetails.venue,
        location: eventDetails.location,
        prizePool: eventDetails.prizePool,
      }
    })

    // 4. Generate/aggregate Certificates
    // Every confirmed registration gets an official verifiable HackKro certificate
    const certificates: any[] = []

    competitions.forEach((comp: any) => {
      const isEligible = comp.status === "confirmed"

      if (isEligible) {
        const isWinner = !!comp.winnerStatus
        const certType = isWinner
          ? comp.winnerStatus.rank === 1
            ? "winner"
            : "runner_up"
          : "participation"

        certificates.push({
          id: `CERT-${comp.registrationId}`,
          verificationId: `HK-VERIFY-${comp.registrationId.replace(/[^A-Za-z0-9]/g, "")}`,
          eventTitle: comp.eventTitle,
          eventId: comp.eventId,
          participantName: auth.name,
          participationType: comp.participationType,
          teamName: comp.teamName,
          issueDate: comp.registeredAt,
          type: certType,
          rankTitle: isWinner ? comp.winnerStatus.title : "Verified Participant",
          certificateUrl: `/api/certificates/verify?id=HK-VERIFY-${comp.registrationId.replace(/[^A-Za-z0-9]/g, "")}`,
        })
      }
    })

    // Any manual certificates on user model
    if (userData.certificates && Array.isArray(userData.certificates)) {
      userData.certificates.forEach((c: any) => {
        if (!certificates.find((existing) => existing.verificationId === c.verificationId)) {
          certificates.push({
            id: c.id || c.verificationId,
            verificationId: c.verificationId,
            eventTitle: c.eventTitle,
            eventId: c.eventId,
            participantName: auth.name,
            issueDate: c.issueDate,
            type: c.type || "participation",
            rankTitle: c.type === "winner" ? "Winner / Champion" : "Official Recognition",
          })
        }
      })
    }

    const quickStats = {
      totalCompetitions: competitions.length,
      ongoingUpcoming: ongoingUpcomingCount,
      certificatesCount: certificates.length,
      points: userData.points || 100,
      badgesCount: userData.badges ? userData.badges.length : 1,
    }

    return NextResponse.json({
      success: true,
      user: {
        ...userData,
        _id: userData._id ? userData._id.toString() : auth._id,
        role: auth.role || "student",
      },
      profileCompletion,
      missingFields,
      stats: quickStats,
      competitions,
      certificates,
    })
  } catch (error: any) {
    console.error("User dashboard API error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load dashboard data." },
      { status: 500 }
    )
  }
}
