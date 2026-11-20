import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { sendInternWelcomeEmail, sendTeamWelcomeEmail } from "@/lib/intern-email"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    try {
      const decoded = verify(token, JWT_SECRET)
      if (typeof decoded !== "string" && decoded.email !== "team@hackkro.com") {
        throw new Error("Invalid token")
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    await connectToDatabase()

    const url = new URL(request.url)
    const search = url.searchParams.get("search") || ""
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Number.parseInt(url.searchParams.get("limit") || "50")
    const type = url.searchParams.get("type") || ""
    const skip = (page - 1) * limit

    const query: any = {}
    if (search) {
      query.$or = [{ email: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }]
    }

    if (type === "core") {
      query.role = { $not: { $regex: "intern", $options: "i" } }
    } else if (type === "interns") {
      query.role = { $regex: "intern", $options: "i" }
    }

    const rawMembers = await TeamMember.find(query).sort({ addedAt: -1 }).skip(skip).limit(limit).lean()
    const total = await TeamMember.countDocuments(query)

    // Calculate count of interns assigned under each member
    const internCounts = await TeamMember.aggregate([
      { $match: { role: { $regex: "intern", $options: "i" }, mentorId: { $exists: true, $ne: null } } },
      { $group: { _id: "$mentorId", count: { $sum: 1 } } }
    ])

    const countMap: Record<string, number> = {}
    internCounts.forEach((c: any) => {
      countMap[c._id.toString()] = c.count
    })

    const teamMembers = rawMembers.map((m: any) => ({
      ...m,
      assignedInternsCount: countMap[m._id.toString()] || 0,
    }))

    return NextResponse.json({
      success: true,
      teamMembers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error in team-members API:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred while fetching team members" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    try {
      const decoded = verify(token, JWT_SECRET)
      if (typeof decoded !== "string" && decoded.email !== "team@hackkro.com") {
        throw new Error("Invalid token")
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    const { email, name, role, position, phone, bio } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ success: false, message: "Email and name are required fields" }, { status: 400 })
    }

    await connectToDatabase()

    const cleanEmail = email.trim().toLowerCase()
    const existingMember = await TeamMember.findOne({ email: cleanEmail })
    if (existingMember) {
      return NextResponse.json(
        { success: false, message: "A team member with this email already exists" },
        { status: 409 },
      )
    }

    const newTeamMember = new TeamMember({
      email: cleanEmail,
      name: name.trim(),
      role: role || "Developer",
      position: position || "Core Team Member",
      phone: phone ? phone.trim() : "",
      bio: bio ? bio.trim() : "",
      active: true,
    })

    await newTeamMember.save()

    // Send dedicated invitation / onboarding email
    const memberRole = role || "Developer"
    if (memberRole.toLowerCase().includes("intern")) {
      await sendInternWelcomeEmail(cleanEmail, name, position, request)
    } else {
      await sendTeamWelcomeEmail(cleanEmail, name, memberRole, position, request)
    }

    return NextResponse.json({
      success: true,
      message: `${memberRole.toLowerCase().includes("intern") ? "Intern" : "Team Member"} added and invitation dispatched!`,
      teamMember: newTeamMember,
    })
  } catch (error) {
    console.error("Error in add team member API:", error)
    return NextResponse.json({ success: false, message: "An error occurred while adding team member" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    try {
      const decoded = verify(token, JWT_SECRET)
      if (typeof decoded !== "object" || decoded.email !== "team@hackkro.com") {
        throw new Error("Invalid token")
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    const { id, name, role, position, isAdmin, active, phone, bio } = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, message: "Team member ID is required" }, { status: 400 })
    }

    await connectToDatabase()

    const member = await TeamMember.findById(id)
    if (!member) {
      return NextResponse.json({ success: false, message: "Team member not found" }, { status: 404 })
    }

    if (name) member.name = name.trim()
    if (role) member.role = role
    if (position !== undefined) member.position = position.trim()
    if (phone !== undefined) member.phone = phone.trim()
    if (bio !== undefined) member.bio = bio.trim()
    if (isAdmin !== undefined) member.isAdmin = isAdmin
    if (active !== undefined) member.active = active

    await member.save()

    return NextResponse.json({
      success: true,
      message: "Team member updated successfully",
      teamMember: member,
    })
  } catch (err: any) {
    console.error("Error in team-members PUT API:", err)
    return NextResponse.json({ success: false, message: err.message || "Failed to update team member" }, { status: 500 })
  }
}
