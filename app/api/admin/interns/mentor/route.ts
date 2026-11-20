import { NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"
import { getAdminUser } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    const body = await req.json()
    const { internId, mentorId } = body

    if (!internId) {
      return NextResponse.json({ success: false, message: "Intern ID is required." }, { status: 400 })
    }

    const intern = await TeamMember.findById(internId)
    if (!intern) {
      return NextResponse.json({ success: false, message: "Intern not found." }, { status: 404 })
    }

    if (!mentorId || mentorId === "unassigned") {
      intern.mentorId = undefined
      intern.mentorName = ""
      intern.mentorEmail = ""
      await intern.save()
      return NextResponse.json({ success: true, message: "Mentor unassigned successfully.", intern })
    }

    const mentor = await TeamMember.findById(mentorId)
    if (!mentor) {
      return NextResponse.json({ success: false, message: "Team Lead / Mentor not found." }, { status: 404 })
    }

    intern.mentorId = mentor._id
    intern.mentorName = mentor.name || mentor.email.split("@")[0]
    intern.mentorEmail = mentor.email
    await intern.save()

    return NextResponse.json({
      success: true,
      message: `${intern.name} successfully assigned under Team Lead ${mentor.name}!`,
      intern,
    })
  } catch (error: any) {
    console.error("Error assigning mentor:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
