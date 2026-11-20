import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { EventRegistration } from "@/models/event-registration"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

export async function GET(request: Request) {
  try {
    // 1. Verify admin token from cookie
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    try {
      const decoded = verify(token, JWT_SECRET)
      if (typeof decoded !== "string" && (decoded as any).email !== "team@hackkro.com") {
        throw new Error("Invalid token")
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    // 2. Connect to Database
    await connectToDatabase()

    // 3. Query parameters
    const url = new URL(request.url)
    const search = url.searchParams.get("search") || ""
    const eventId = url.searchParams.get("eventId") || ""
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20"))
    const skip = (page - 1) * limit

    // 4. Build query
    const query: Record<string, any> = {}

    if (eventId && eventId !== "all") {
      query.eventId = eventId
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { college: { $regex: search, $options: "i" } },
        { teamName: { $regex: search, $options: "i" } },
        { registrationId: { $regex: search, $options: "i" } },
        { eventTitle: { $regex: search, $options: "i" } },
      ]
    }

    // 5. Fetch registrations and stats
    const [registrations, total, totalAll, teamCount, soloCount] = await Promise.all([
      EventRegistration.find(query).sort({ registeredAt: -1 }).skip(skip).limit(limit),
      EventRegistration.countDocuments(query),
      EventRegistration.countDocuments({}),
      EventRegistration.countDocuments({ participationType: "team" }),
      EventRegistration.countDocuments({ participationType: "solo" }),
    ])

    return NextResponse.json({
      success: true,
      registrations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
      stats: {
        totalAll,
        teamCount,
        soloCount,
      },
    })
  } catch (error: any) {
    console.error("Admin Registrations GET Error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load registrations" },
      { status: 500 }
    )
  }
}
