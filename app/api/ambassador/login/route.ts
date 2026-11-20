import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { CampusAmbassador } from "@/models/campus-ambassador"
import { verifyPassword } from "@/lib/password-utils"
import { sign } from "jsonwebtoken"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-ambassador-secret-key"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide both registered email and password." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const cleanEmail = email.trim().toLowerCase()
    const ambassador = await CampusAmbassador.findOne({ email: cleanEmail })

    if (!ambassador) {
      return NextResponse.json(
        {
          success: false,
          message: "No Campus Ambassador account found with this email. Please apply first.",
        },
        { status: 404 }
      )
    }

    // Verify Password
    const isMatch = verifyPassword(password.trim(), ambassador.password)
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Incorrect password. Please try again." },
        { status: 401 }
      )
    }

    // Role & Approval Enforcement: Only APPROVED ambassadors can access dashboard
    if (ambassador.status !== "Approved") {
      let statusMsg = "Your application is not approved yet."
      if (ambassador.status === "Pending") {
        statusMsg = "Your Campus Ambassador application is currently Pending review by the HackKro Team. Dashboard access will be activated upon approval."
      } else if (ambassador.status === "Under Review") {
        statusMsg = "Your application is currently Under Review by the HackKro Core Team. We will notify you via email shortly."
      } else if (ambassador.status === "Rejected") {
        statusMsg = "Your application was not approved for this cohort. Only active approved ambassadors have dashboard access."
      }

      return NextResponse.json(
        {
          success: false,
          status: ambassador.status,
          message: statusMsg,
          applicationId: ambassador.applicationId,
        },
        { status: 403 }
      )
    }

    if (ambassador.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          message: "Your ambassador account is currently deactivated. Please contact campus@hackkro.com",
        },
        { status: 403 }
      )
    }

    // Update last login
    ambassador.lastLogin = new Date()
    await ambassador.save()

    // Sign session token
    const token = sign(
      {
        id: String(ambassador._id),
        email: ambassador.email,
        name: ambassador.name,
        applicationId: ambassador.applicationId,
        ambassadorId: ambassador.ambassadorId || ambassador.applicationId,
        role: "ambassador",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    const cookieStore = await cookies()
    cookieStore.set({
      name: "ambassador-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    })

    return NextResponse.json({
      success: true,
      message: "Authentication successful! Welcome to the Ambassador Hub.",
      ambassador: {
        id: String(ambassador._id),
        applicationId: ambassador.applicationId,
        ambassadorId: ambassador.ambassadorId || ambassador.applicationId,
        name: ambassador.name,
        email: ambassador.email,
        collegeName: ambassador.collegeName,
        status: ambassador.status,
      },
    })
  } catch (error: any) {
    console.error("Ambassador login error:", error)
    return NextResponse.json({ success: false, message: error.message || "Login failed." }, { status: 500 })
  }
}
