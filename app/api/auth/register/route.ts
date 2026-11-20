import { NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { User } from "@/models/user"
import { hashPassword } from "@/lib/password-utils"
import { createToken, setUserCookies } from "@/lib/user-auth-helper"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, mobile, college, graduationYear, branch, degree } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Please provide your full name." }, { status: 400 })
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Please provide a valid email address." }, { status: 400 })
    }

    if (!password || password.trim().length < 6) {
      return NextResponse.json({ success: false, message: "Password must be at least 6 characters long." }, { status: 400 })
    }

    await connectToDatabase()

    const cleanEmail = email.trim().toLowerCase()
    const existingUser = await User.findOne({ email: cleanEmail })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "USER_EXISTS",
          message: "An account with this email already exists. Please log in instead.",
        },
        { status: 409 }
      )
    }

    const hashedPassword = hashPassword(password.trim())

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      mobile: mobile ? mobile.trim() : "",
      college: college ? college.trim() : "",
      graduationYear: graduationYear ? graduationYear.trim() : "2026",
      branch: branch ? branch.trim() : "",
      degree: degree ? degree.trim() : "B.Tech",
      role: "student",
      points: 100, // 100 points welcome bonus!
      isEmailVerified: true,
      lastLogin: new Date(),
    })

    const tokenPayload = {
      userId: String(newUser._id),
      email: newUser.email,
      role: "student" as const,
      name: newUser.name,
    }

    const token = createToken(tokenPayload)

    const userResponse = {
      _id: String(newUser._id),
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      college: newUser.college,
      degree: newUser.degree,
      branch: newUser.branch,
      graduationYear: newUser.graduationYear,
      avatar: newUser.avatar,
      bio: newUser.bio,
      skills: newUser.skills,
      githubUrl: newUser.githubUrl,
      linkedinUrl: newUser.linkedinUrl,
      portfolioUrl: newUser.portfolioUrl,
      resumeUrl: newUser.resumeUrl,
      role: newUser.role,
      points: newUser.points,
      badges: newUser.badges,
      certificates: newUser.certificates,
    }

    const response = NextResponse.json({
      success: true,
      message: "Welcome to HackKro! Your account has been created successfully. 🚀",
      user: userResponse,
      token,
    })

    return setUserCookies(response, token, "student")
  } catch (error: any) {
    console.error("User registration error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create account. Please try again." },
      { status: 500 }
    )
  }
}
