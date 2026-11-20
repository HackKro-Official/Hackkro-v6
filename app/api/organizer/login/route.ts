import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Organizer } from "@/models/organizer"
import { sign } from "jsonwebtoken"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-organizer-secret-key"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide both email and password." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const cleanEmail = email.trim().toLowerCase()
    const organizer = await Organizer.findOne({ email: cleanEmail })

    if (!organizer) {
      return NextResponse.json(
        { success: false, message: "No organizer account found with this email. Please register first." },
        { status: 404 }
      )
    }

    // Check approval status
    const currentStatus = (organizer.status || "").toLowerCase()

    if (currentStatus === "pending") {
      return NextResponse.json(
        {
          success: false,
          pendingApproval: true,
          status: "pending",
          message:
            "Aapka account abhi admin approval ke liye pending hai. Admin team dwara approval milne ke baad aap login karke events & opportunities post kar paoge. Approval status ki jankari aapke registered email par update kar di jayegi.",
        },
        { status: 403 }
      )
    }

    if (currentStatus === "rejected") {
      return NextResponse.json(
        {
          success: false,
          status: "rejected",
          message:
            "Aapka organizer application approve nahi hua. More details ke liye team@hackkro.com par contact karein.",
        },
        { status: 403 }
      )
    }

    if (currentStatus === "suspended" || (organizer.active === false && currentStatus !== "approved" && currentStatus !== "active")) {
      return NextResponse.json(
        {
          success: false,
          status: "suspended",
          message: "Your organizer account is suspended. Please contact team@hackkro.com.",
        },
        { status: 403 }
      )
    }

    if (organizer.password !== password.trim()) {
      return NextResponse.json(
        { success: false, message: "Invalid password. Please check and try again." },
        { status: 401 }
      )
    }

    organizer.lastLogin = new Date()
    if (!organizer.active) {
      organizer.active = true
    }
    await organizer.save()

    const token = sign(
      {
        id: String(organizer._id),
        email: organizer.email,
        name: organizer.name,
        organization: organizer.organization,
        role: "organizer",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    const cookieStore = await cookies()
    cookieStore.set({
      name: "organizer-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    })

    return NextResponse.json({
      success: true,
      message: "Login successful!",
      organizer: {
        id: String(organizer._id),
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
      },
    })
  } catch (error: any) {
    console.error("Organizer login error:", error)
    return NextResponse.json({ success: false, message: error.message || "Login failed." }, { status: 500 })
  }
}
