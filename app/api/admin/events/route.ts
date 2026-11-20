import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { EventModel } from "@/models/event"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"
import { generateEventSlug, seedEventsIfNeeded } from "@/lib/events-service"
import { EventRegistration } from "@/models/event-registration"

export const dynamic = "force-dynamic"

// GET /api/admin/events - List all events (including pending approval)
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()
    await seedEventsIfNeeded()

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("approvalStatus")

    const query: any = {}
    if (statusFilter && statusFilter !== "all") {
      query.approvalStatus = statusFilter
    }

    const events = await EventModel.find(query).sort({ createdAt: -1 }).lean()

    // Get live registration counts
    const counts = await EventRegistration.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
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
      pendingCount: events.filter((e: any) => e.approvalStatus === "pending").length,
    })
  } catch (error: any) {
    console.error("Admin Events GET error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// POST /api/admin/events - Create new event directly by Admin
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      id: customId,
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
      statusOverride = "live",
      featured = false,
      image,
      prizePool = "Certificates & Swags",
      teamSize = { min: 1, max: 4 },
      registrationFee = "Free",
      tracks = [],
      perks = [],
      eligibility = "Open to all students",
      rules = [],
      rounds = [],
      approvalStatus = "approved",
      winners = [],
      structuredWinners = [],
      resultsAnnounced = false,
      resultsUrl = "",
    } = body

    if (!title || !description || !date) {
      return NextResponse.json(
        { success: false, message: "Title, description, and event date are required." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Determine event slug ID
    let finalId = customId ? customId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : generateEventSlug(title)
    
    // Check if ID already exists, if so append random suffix
    const existingSlug = await EventModel.findOne({ id: finalId })
    if (existingSlug) {
      finalId = `${finalId}-${Math.floor(100 + Math.random() * 900)}`
    }

    // Determine numericId
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
      statusOverride,
      featured: !!featured,
      image: image || "https://res.cloudinary.com/payb7fsq/image/upload/v1793190149/1_1.png",
      prizePool,
      teamSize,
      registrationFee,
      tracks: Array.isArray(tracks) ? tracks : [],
      perks: Array.isArray(perks) ? perks : [],
      eligibility,
      rules: Array.isArray(rules) ? rules : [],
      winners: Array.isArray(winners) ? winners : [],
      structuredWinners: Array.isArray(structuredWinners) ? structuredWinners : [],
      resultsAnnounced: !!resultsAnnounced,
      resultsAnnouncedAt: resultsAnnounced ? new Date() : undefined,
      resultsUrl: resultsUrl || "",
      rounds: Array.isArray(rounds) ? rounds : [],
      approvalStatus: approvalStatus || "approved",
      organizerId: "admin",
      organizerName: "HackKro Admin",
      organizerEmail: auth.email || "team@hackkro.com",
      organizerOrganization: "HackKro Team",
      emailBroadcastsSent: 0,
      emailBroadcasts: [],
    })

    await newEvent.save()

    return NextResponse.json({
      success: true,
      message: "Event created successfully!",
      event: newEvent,
    })
  } catch (error: any) {
    console.error("Admin Events POST error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// PUT /api/admin/events - Update or approve/reject event
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, _id, numericId, ...updateFields } = body

    if (!id) {
      return NextResponse.json({ success: false, message: "Event ID is required." }, { status: 400 })
    }

    await connectToDatabase()

    // If approving event and statusOverride not explicitly specified, default to live
    if (updateFields.approvalStatus === "approved" && !updateFields.statusOverride) {
      updateFields.statusOverride = "live"
    }

    const updatedEvent = await EventModel.findOneAndUpdate(
      { id },
      { $set: updateFields },
      { new: true, runValidators: true }
    )

    if (!updatedEvent) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Event "${updatedEvent.title}" (${id}) updated successfully!`,
      event: updatedEvent,
    })
  } catch (error: any) {
    console.error("Admin Events PUT error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/events - Delete event
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, message: "Event ID is required" }, { status: 400 })
    }

    await connectToDatabase()
    const result = await EventModel.deleteOne({ id })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Event ${id} has been deleted successfully.`,
    })
  } catch (error: any) {
    console.error("Admin Events DELETE error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
