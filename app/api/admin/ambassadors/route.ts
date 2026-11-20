import "@/lib/polyfill-buffer"
import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { CampusAmbassador } from "@/models/campus-ambassador"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"
import { sendApplicationStatusEmail } from "@/lib/ambassador-email"

export const dynamic = "force-dynamic"

// GET /api/admin/ambassadors - List all ambassador applications
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
        { mobile: searchRegex },
        { collegeName: searchRegex },
        { universityName: searchRegex },
        { collegeCity: searchRegex },
        { state: searchRegex },
        { applicationId: searchRegex },
        { ambassadorId: searchRegex },
      ]
    }

    const applications = await CampusAmbassador.find(query).sort({ createdAt: -1 }).lean()

    // Calculate counters
    const all = await CampusAmbassador.find().select("status").lean()
    const counts = {
      total: all.length,
      pending: all.filter((a) => a.status === "Pending").length,
      underReview: all.filter((a) => a.status === "Under Review").length,
      approved: all.filter((a) => a.status === "Approved").length,
      rejected: all.filter((a) => a.status === "Rejected").length,
    }

    return NextResponse.json({
      success: true,
      counts,
      applications: applications.map((a: any) => ({
        ...a,
        _id: a._id.toString(),
        password: undefined, // Never expose password hash
      })),
    })
  } catch (error: any) {
    console.error("Admin ambassadors GET error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// PUT /api/admin/ambassadors - Update status, notes, or role
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      applicationId,
      status,
      adminNotes,
      customPosition,
      team,
      notifyApplicant = true,
    } = body

    if (!applicationId) {
      return NextResponse.json({ success: false, message: "applicationId is required." }, { status: 400 })
    }

    await connectToDatabase()

    const ambassador = await CampusAmbassador.findOne({ applicationId })
    if (!ambassador) {
      return NextResponse.json({ success: false, message: "Application not found." }, { status: 404 })
    }

    const previousStatus = ambassador.status
    if (status) {
      ambassador.status = status
      ambassador.reviewedAt = new Date()
      ambassador.reviewedBy = auth.email || "admin"

      // If newly approved, generate ambassadorId and referralCode if missing
      if (status === "Approved" && !ambassador.ambassadorId) {
        const countApproved = await CampusAmbassador.countDocuments({ status: "Approved" })
        ambassador.ambassadorId = `AMB-HK-${1000 + countApproved + 1}`
        ambassador.approvedAt = new Date()

        const namePrefix = ambassador.name
          .replace(/[^a-zA-Z]/g, "")
          .substring(0, 4)
          .toUpperCase()
        ambassador.referralCode = `HK-${namePrefix || "AMB"}${Math.floor(100 + Math.random() * 900)}`
      }
    }

    if (typeof adminNotes === "string") {
      ambassador.adminNotes = adminNotes
    }

    if (customPosition) {
      ambassador.customPosition = customPosition
    }

    if (team) {
      ambassador.team = team
    }

    await ambassador.save()

    // Dispatch email notification if status changed and requested
    let notificationSent = false
    if (notifyApplicant && status && status !== previousStatus && status !== "Pending") {
      notificationSent = await sendApplicationStatusEmail(
        ambassador.email,
        ambassador.name,
        status as "Approved" | "Rejected" | "Under Review",
        ambassador.applicationId,
        ambassador.ambassadorId,
        ambassador.adminNotes
      )
    }

    return NextResponse.json({
      success: true,
      message: `Application ${applicationId} updated to ${ambassador.status}!`,
      notificationSent,
      ambassador: {
        applicationId: ambassador.applicationId,
        ambassadorId: ambassador.ambassadorId,
        name: ambassador.name,
        email: ambassador.email,
        status: ambassador.status,
        referralCode: ambassador.referralCode,
        adminNotes: ambassador.adminNotes,
      },
    })
  } catch (error: any) {
    console.error("Admin ambassadors PUT error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/ambassadors - Delete application record
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const applicationId = searchParams.get("applicationId")

    if (!applicationId) {
      return NextResponse.json({ success: false, message: "applicationId is required." }, { status: 400 })
    }

    await connectToDatabase()
    const result = await CampusAmbassador.deleteOne({ applicationId })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Application not found." }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Application ${applicationId} has been deleted.`,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
