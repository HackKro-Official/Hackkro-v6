import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Organizer } from "@/models/organizer"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"
import { sendOrganizerStatusEmail } from "@/lib/organizer-email"

export const dynamic = "force-dynamic"

// GET /api/admin/organizers - List organizers with filters and counts
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")?.trim()

    const query: any = {}

    if (status && status !== "all") {
      query.status = status
    }

    if (search) {
      const searchRegex = new RegExp(search, "i")
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { organization: searchRegex },
        { phone: searchRegex },
        { designation: searchRegex },
      ]
    }

    const organizers = await Organizer.find(query).sort({ createdAt: -1 }).lean()

    // Calculate counters
    const all = await Organizer.find().select("status").lean()
    const counts = {
      total: all.length,
      pending: all.filter((o) => (o.status || "").toLowerCase() === "pending").length,
      approved: all.filter((o) => (o.status || "").toLowerCase() === "approved" || (o.status || "").toLowerCase() === "active").length,
      rejected: all.filter((o) => (o.status || "").toLowerCase() === "rejected").length,
    }

    return NextResponse.json({
      success: true,
      counts,
      organizers: organizers.map((o: any) => ({
        ...o,
        _id: o._id.toString(),
        password: undefined, // Never expose password hash
      })),
    })
  } catch (error: any) {
    console.error("Admin organizers GET error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// PUT /api/admin/organizers - Update status, notes, or approval
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { organizerId, status, adminNotes, notifyOrganizer = true } = body

    if (!organizerId) {
      return NextResponse.json({ success: false, message: "organizerId is required." }, { status: 400 })
    }

    await connectToDatabase()

    const organizer = await Organizer.findById(organizerId)
    if (!organizer) {
      return NextResponse.json({ success: false, message: "Organizer not found." }, { status: 404 })
    }

    const previousStatus = organizer.status
    if (status) {
      organizer.status = status
      organizer.reviewedAt = new Date()
      organizer.reviewedBy = auth.email || "admin"

      if (status.toLowerCase() === "approved") {
        organizer.active = true
      } else if (status.toLowerCase() === "rejected" || status.toLowerCase() === "suspended") {
        organizer.active = false
      }
    }

    if (typeof adminNotes === "string") {
      organizer.adminNotes = adminNotes
    }

    await organizer.save()

    // Dispatch email notification if requested and status changed
    let notificationSent = false
    if (notifyOrganizer && status && status !== previousStatus && status !== "pending") {
      notificationSent = await sendOrganizerStatusEmail(
        organizer.email,
        organizer.name,
        organizer.organization,
        status as "approved" | "rejected",
        organizer.adminNotes
      )
    }

    return NextResponse.json({
      success: true,
      message: `Organizer ${organizer.organization} updated to ${organizer.status}!`,
      notificationSent,
      organizer: {
        id: String(organizer._id),
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
        status: organizer.status,
        active: organizer.active,
        adminNotes: organizer.adminNotes,
      },
    })
  } catch (error: any) {
    console.error("Admin organizers PUT error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/organizers - Delete organizer account
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const organizerId = searchParams.get("organizerId")

    if (!organizerId) {
      return NextResponse.json({ success: false, message: "organizerId is required." }, { status: 400 })
    }

    await connectToDatabase()
    const result = await Organizer.findByIdAndDelete(organizerId)

    if (!result) {
      return NextResponse.json({ success: false, message: "Organizer not found." }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Organizer has been deleted successfully.`,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
