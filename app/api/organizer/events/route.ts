import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { EventModel } from "@/models/event"
import { EventRegistration } from "@/models/event-registration"
import { verifyOrganizerAuth } from "@/lib/organizer-auth-helper"
import { generateEventSlug } from "@/lib/events-service"

export const dynamic = "force-dynamic"

// GET /api/organizer/events - Get events submitted by this organizer
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyOrganizerAuth(req)
    if (!auth.authorized || !auth.organizer) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    const events = await EventModel.find({ organizerEmail: auth.organizer.email.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean()

    // Get registration counts
    const eventIds = events.map((e) => e.id)
    const counts = await EventRegistration.aggregate([
      { $match: { eventId: { $in: eventIds }, status: { $ne: "cancelled" } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ])

    const countMap: Record<string, number> = {}
    counts.forEach((c) => {
      countMap[c._id] = c.count
    })

    const enriched = events.map((e: any) => ({
      ...e,
      _id: e._id.toString(),
      registeredCount: countMap[e.id] || 0,
    }))

    return NextResponse.json({
      success: true,
      events: enriched,
    })
  } catch (error: any) {
    console.error("Organizer events GET error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// POST /api/organizer/events - Organizer submits a new event (pending approval)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyOrganizerAuth(req)
    if (!auth.authorized || !auth.organizer) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      category = "Hackathon",
      tagline = "",
      description,
      longDescription = "",
      date,
      endDate = "",
      mode = "Online",
      venue = "",
      location = "",
      registrationOpens = "",
      registrationDeadline = "",
      prizePool = "Recognition & Certificates",
      teamSize = { min: 1, max: 4 },
      registrationFee = "Free",
      tracks = [],
      perks = [],
      eligibility = "Open to all students",
      rules = [],
      image,
      rounds = [],
    } = body

    if (!title || !description || !date) {
      return NextResponse.json(
        { success: false, message: "Title, description, and event date are required." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Generate unique slug
    let finalId = generateEventSlug(title)
    const existingSlug = await EventModel.findOne({ id: finalId })
    if (existingSlug) {
      finalId = `${finalId}-${Math.floor(100 + Math.random() * 900)}`
    }

    // Generate numericId
    const highestNumeric = await EventModel.findOne().sort({ numericId: -1 }).select("numericId").lean()
    const numericId = (highestNumeric?.numericId || 100) + 1

    const newEvent = new EventModel({
      id: finalId,
      numericId,
      title: title.trim(),
      category,
      tagline,
      description,
      longDescription: longDescription || description,
      date,
      endDate: endDate || date,
      mode,
      venue,
      location,
      registrationOpens: registrationOpens || date,
      registrationDeadline: registrationDeadline || date,
      statusOverride: "coming-soon",
      featured: false,
      image: image || "https://res.cloudinary.com/payb7fsq/image/upload/v1793190149/1_1.png",
      prizePool,
      teamSize,
      registrationFee,
      tracks: Array.isArray(tracks) ? tracks : [],
      perks: Array.isArray(perks) ? perks : [],
      eligibility,
      rules: Array.isArray(rules) ? rules : [],
      rounds: Array.isArray(rounds) && rounds.length > 0 ? rounds : [
        {
          roundNumber: 1,
          title: "Round 1: Screening & Evaluation",
          testId: `TEST-${finalId.slice(0, 8).toUpperCase()}`,
          description: "Assessment round for registered participants",
          scheduledDate: date,
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          durationMinutes: 30,
          mode: "online",
          status: "scheduled",
        }
      ],
      approvalStatus: "pending", // ALWAYS pending approval for organizer submissions!
      organizerId: auth.organizer.email.toLowerCase(),
      organizerName: auth.organizer.name,
      organizerEmail: auth.organizer.email.toLowerCase(),
      organizerOrganization: auth.organizer.organization,
      emailBroadcastsSent: 0,
      emailBroadcasts: [],
    })

    await newEvent.save()

    return NextResponse.json({
      success: true,
      message: "Event submitted successfully! It has been sent to Admin for approval.",
      event: newEvent,
    })
  } catch (error: any) {
    console.error("Organizer events POST error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// PUT /api/organizer/events - Organizer updates their event
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyOrganizerAuth(req)
    if (!auth.authorized || !auth.organizer) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updateFields } = body

    if (!id) {
      return NextResponse.json({ success: false, message: "Event ID is required." }, { status: 400 })
    }

    await connectToDatabase()

    const event = await EventModel.findOne({ id, organizerEmail: auth.organizer.email.toLowerCase() })
    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found or you do not have permission to edit it." },
        { status: 404 }
      )
    }

    // Do not allow organizer to change approvalStatus directly
    delete updateFields.approvalStatus
    delete updateFields.id
    delete updateFields.numericId

    if (updateFields.resultsAnnounced && !updateFields.resultsAnnouncedAt) {
      updateFields.resultsAnnouncedAt = new Date()
    }

    const updated = await EventModel.findOneAndUpdate(
      { id, organizerEmail: auth.organizer.email.toLowerCase() },
      { $set: updateFields },
      { new: true, runValidators: true }
    )

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Event not found or you do not have permission to edit it." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Event updated successfully!",
      event: updated,
    })
  } catch (error: any) {
    console.error("Organizer events PUT error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
