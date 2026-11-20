import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/user-auth-helper"
import connectToDatabase from "@/lib/mongoose"
import { User } from "@/models/user"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req)

    if (!auth) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 })
    }

    if (auth.role !== "student") {
      return NextResponse.json({ success: false, message: "Profile update only supported for participant accounts." }, { status: 403 })
    }

    await connectToDatabase()

    const body = await req.json()
    const user = await User.findById(auth._id)

    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found." }, { status: 404 })
    }

    if (body.name !== undefined) user.name = body.name.trim()
    if (body.mobile !== undefined) user.mobile = body.mobile.trim()
    if (body.avatar !== undefined) user.avatar = body.avatar.trim()
    if (body.college !== undefined) user.college = body.college.trim()
    if (body.degree !== undefined) user.degree = body.degree.trim()
    if (body.branch !== undefined) user.branch = body.branch.trim()
    if (body.graduationYear !== undefined) user.graduationYear = body.graduationYear.trim()
    if (body.bio !== undefined) user.bio = body.bio.trim()
    if (body.githubUrl !== undefined) user.githubUrl = body.githubUrl.trim()
    if (body.linkedinUrl !== undefined) user.linkedinUrl = body.linkedinUrl.trim()
    if (body.portfolioUrl !== undefined) user.portfolioUrl = body.portfolioUrl.trim()
    if (body.resumeUrl !== undefined) user.resumeUrl = body.resumeUrl.trim()

    if (body.skills !== undefined) {
      user.skills = Array.isArray(body.skills)
        ? body.skills.map((s: string) => s.trim()).filter(Boolean)
        : typeof body.skills === "string"
        ? body.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []
    }

    await user.save()

    const updatedUser = {
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
      role: user.role,
      points: user.points,
      badges: user.badges,
      certificates: user.certificates,
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully! ✨",
      user: updatedUser,
    })
  } catch (error: any) {
    console.error("Profile update error:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to update profile." }, { status: 500 })
  }
}
