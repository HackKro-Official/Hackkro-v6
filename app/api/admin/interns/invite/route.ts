import { NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"
import { getAdminUser } from "@/lib/auth-helpers"
import { sendInternWelcomeEmail } from "@/lib/intern-email"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    const body = await req.json()
    const { email, name, position = "Tech & Engineering Intern" } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "A valid email address is required." }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name ? name.trim() : cleanEmail.split("@")[0]

    let member = await TeamMember.findOne({ email: cleanEmail })

    if (member) {
      member.role = "Intern"
      if (position) member.position = position.trim()
      member.active = true
      await member.save()
    } else {
      member = await TeamMember.create({
        email: cleanEmail,
        name: cleanName,
        role: "Intern",
        position: position.trim(),
        active: true,
      })
    }

    // Trigger dedicated, unique Intern Onboarding email
    await sendInternWelcomeEmail(cleanEmail, cleanName, position, req)

    return NextResponse.json({
      success: true,
      message: `Intern onboarding email sent successfully to ${cleanEmail}!`,
      intern: {
        _id: member._id.toString(),
        name: member.name,
        email: member.email,
        role: member.role,
        position: member.position,
      },
    })
  } catch (error: any) {
    console.error("Error in intern invite API:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to send intern invite" }, { status: 500 })
  }
}
