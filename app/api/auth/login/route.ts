import { NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { User } from "@/models/user"
import { CampusAmbassador } from "@/models/campus-ambassador"
import { Organizer } from "@/models/organizer"
import { verifyPassword } from "@/lib/password-utils"
import { createToken, setUserCookies } from "@/lib/user-auth-helper"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, role = "student" } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide both email and password." },
        { status: 400 }
      )
    }

    await connectToDatabase()
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    // ----------------- 1. STUDENT / PARTICIPANT LOGIN -----------------
    if (role === "student" || role === "participant") {
      const user = await User.findOne({ email: cleanEmail })
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            errorCode: "USER_NOT_FOUND",
            message: "User Not Found! No student account exists with this email address. Please click 'Create Account' to register.",
          },
          { status: 404 }
        )
      }

      const isMatch = verifyPassword(cleanPassword, user.password)
      if (!isMatch) {
        return NextResponse.json(
          {
            success: false,
            errorCode: "INCORRECT_PASSWORD",
            message: "Security Alert: Incorrect password entered! Please verify your password and try again.",
          },
          { status: 401 }
        )
      }

      user.lastLogin = new Date()
      await user.save()

      const token = createToken({
        userId: String(user._id),
        email: user.email,
        role: "student",
        name: user.name,
      })

      const userResponse = {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        college: user.college,
        degree: user.degree,
        branch: user.branch,
        graduationYear: user.graduationYear,
        avatar: user.avatar,
        bio: user.bio,
        skills: user.skills,
        githubUrl: user.githubUrl,
        linkedinUrl: user.linkedinUrl,
        portfolioUrl: user.portfolioUrl,
        resumeUrl: user.resumeUrl,
        role: "student",
        points: user.points,
        badges: user.badges,
        certificates: user.certificates,
      }

      const response = NextResponse.json({
        success: true,
        message: `Welcome back, ${user.name}! 👋`,
        user: userResponse,
        token,
      })

      return setUserCookies(response, token, "student")
    }

    // ----------------- 2. CAMPUS AMBASSADOR LOGIN -----------------
    if (role === "ca" || role === "ambassador") {
      const ambassador = await CampusAmbassador.findOne({ email: cleanEmail })
      if (!ambassador) {
        return NextResponse.json(
          {
            success: false,
            errorCode: "USER_NOT_FOUND",
            message: "User Not Found! No Campus Ambassador account found with this email. Please apply first.",
          },
          { status: 404 }
        )
      }

      const isMatch = verifyPassword(cleanPassword, ambassador.password)
      if (!isMatch) {
        return NextResponse.json(
          {
            success: false,
            errorCode: "INCORRECT_PASSWORD",
            message: "Security Alert: Incorrect password entered for Ambassador account.",
          },
          { status: 401 }
        )
      }

      if (ambassador.status !== "Approved") {
        return NextResponse.json(
          {
            success: false,
            message: `Your Campus Ambassador application is currently '${ambassador.status}'. Dashboard access is granted upon approval.`,
          },
          { status: 403 }
        )
      }

      ambassador.lastLogin = new Date()
      await ambassador.save()

      const token = createToken({
        userId: String(ambassador._id),
        email: ambassador.email,
        role: "ambassador",
        name: ambassador.name,
      })

      const userResponse = {
        _id: String(ambassador._id),
        name: ambassador.name,
        email: ambassador.email,
        mobile: ambassador.mobile,
        college: ambassador.collegeName,
        role: "ambassador",
        referralCode: ambassador.referralCode,
        points: (ambassador as any).points || 0,
      }

      const response = NextResponse.json({
        success: true,
        message: `Welcome back, Ambassador ${ambassador.name}! 🌟`,
        user: userResponse,
        token,
      })

      return setUserCookies(response, token, "ambassador")
    }

    // ----------------- 3. ORGANIZER / CLUB LOGIN -----------------
    if (role === "organizer" || role === "club") {
      const organizer = await Organizer.findOne({ email: cleanEmail })
      if (!organizer) {
        return NextResponse.json(
          {
            success: false,
            errorCode: "USER_NOT_FOUND",
            message: "User Not Found! No organizer account found with this email. Please register your club first.",
          },
          { status: 404 }
        )
      }

      if (organizer.status === "pending") {
        return NextResponse.json(
          { success: false, errorCode: "STATUS_PENDING", message: "Your organizer registration is pending admin approval." },
          { status: 403 }
        )
      }

      if (organizer.status === "rejected") {
        return NextResponse.json(
          { success: false, errorCode: "STATUS_REJECTED", message: "Your organizer application was not approved. Please contact team@hackkro.com." },
          { status: 403 }
        )
      }

      if (organizer.password !== cleanPassword) {
        return NextResponse.json(
          {
            success: false,
            errorCode: "INCORRECT_PASSWORD",
            message: "Security Alert: Incorrect password entered for Organizer account.",
          },
          { status: 401 }
        )
      }

      organizer.lastLogin = new Date()
      await organizer.save()

      const token = createToken({
        userId: String(organizer._id),
        email: organizer.email,
        role: "organizer",
        name: organizer.name,
      })

      const userResponse = {
        _id: String(organizer._id),
        name: organizer.name,
        email: organizer.email,
        mobile: organizer.phone,
        college: organizer.organization,
        role: "organizer",
        organization: organizer.organization,
      }

      const response = NextResponse.json({
        success: true,
        message: `Welcome back, ${organizer.name}! 🏛️`,
        user: userResponse,
        token,
      })

      return setUserCookies(response, token, "organizer")
    }

    return NextResponse.json({ success: false, message: "Invalid role specified." }, { status: 400 })
  } catch (error: any) {
    console.error("Login API error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process login." },
      { status: 500 }
    )
  }
}
