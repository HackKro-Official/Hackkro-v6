import { NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"
import { Submission } from "@/models/submission"
import { getInternUser } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const auth = await getInternUser()
    if (!auth) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 })
    }

    await connectToDatabase()

    const member = (await TeamMember.findById(auth.id).lean()) as any
    if (!member) {
      return NextResponse.json({ success: false, message: "Member account not found." }, { status: 404 })
    }

    const isIntern = member.role?.toLowerCase().includes("intern")

    let mentorInfo: any = null
    let assignedInterns: any[] = []

    if (isIntern) {
      // Find assigned team leader / mentor
      if (member.mentorId) {
        const mentor = (await TeamMember.findById(member.mentorId).select("name email role position profilePhoto phone linkedinUrl").lean()) as any
        if (mentor) {
          mentorInfo = {
            _id: mentor._id.toString(),
            name: mentor.name || "Team Leader",
            email: mentor.email,
            role: mentor.role || "Lead",
            position: mentor.position || "Technical Lead",
            profilePhoto: mentor.profilePhoto || "",
            phone: mentor.phone || "",
            linkedinUrl: mentor.linkedinUrl || "",
          }
        }
      } else if (member.mentorEmail) {
        const mentor = (await TeamMember.findOne({ email: member.mentorEmail.toLowerCase() }).select("name email role position profilePhoto phone linkedinUrl").lean()) as any
        if (mentor) {
          mentorInfo = {
            _id: mentor._id.toString(),
            name: mentor.name || "Team Leader",
            email: mentor.email,
            role: mentor.role || "Lead",
            position: mentor.position || "Technical Lead",
            profilePhoto: mentor.profilePhoto || "",
            phone: mentor.phone || "",
            linkedinUrl: mentor.linkedinUrl || "",
          }
        }
      }

      // Default mentor fallback if unassigned
      if (!mentorInfo) {
        mentorInfo = {
          name: "HackKro Core Engineering",
          email: "team@hackkro.com",
          role: "Platform Leads",
          position: "Technical Mentorship Team",
          profilePhoto: "https://res.cloudinary.com/payb7fsq/image/upload/v1791981789/Hack_Kro_Logo.png",
          phone: "+91 95484 01726",
          linkedinUrl: "https://linkedin.com/company/hackkro",
        }
      }
    } else {
      // User is a Team Leader / Core Member: Find all interns assigned under them
      const rawInterns = await TeamMember.find({
        $or: [
          { mentorId: member._id },
          { mentorEmail: member.email.toLowerCase() },
        ],
        active: true,
      }).select("_id name email role position profilePhoto phone college githubUrl linkedinUrl").lean()

      // Calculate progress stats for each intern
      const internIds = rawInterns.map((i: any) => i._id)
      const approvedSubmissions = await Submission.aggregate([
        { $match: { internId: { $in: internIds }, status: "approved" } },
        {
          $group: {
            _id: "$internId",
            pointsEarned: { $sum: "$pointsAwarded" },
            completedTasks: { $sum: 1 },
          },
        },
      ])

      const statsMap: Record<string, { pointsEarned: number; completedTasks: number }> = {}
      approvedSubmissions.forEach((s: any) => {
        statsMap[s._id.toString()] = {
          pointsEarned: s.pointsEarned || 0,
          completedTasks: s.completedTasks || 0,
        }
      })

      assignedInterns = rawInterns.map((i: any) => ({
        ...i,
        _id: i._id.toString(),
        pointsEarned: statsMap[i._id.toString()]?.pointsEarned || 0,
        completedTasks: statsMap[i._id.toString()]?.completedTasks || 0,
      }))
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: member._id.toString(),
        name: member.name,
        email: member.email,
        role: member.role,
        position: member.position,
        profilePhoto: member.profilePhoto || "",
        phone: member.phone || "",
        bio: member.bio || "",
        college: member.college || "",
        githubUrl: member.githubUrl || "",
        linkedinUrl: member.linkedinUrl || "",
        portfolioUrl: member.portfolioUrl || "",
        skills: member.skills || [],
        isIntern,
        mentorId: member.mentorId?.toString(),
        mentorName: member.mentorName || "",
        mentorEmail: member.mentorEmail || "",
        addedAt: member.addedAt,
      },
      mentor: mentorInfo,
      assignedInterns,
    })
  } catch (error: any) {
    console.error("Error fetching team profile:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to load profile" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getInternUser()
    if (!auth) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 })
    }

    await connectToDatabase()

    const body = await req.json()
    const member = (await TeamMember.findById(auth.id)) as any
    if (!member) {
      return NextResponse.json({ success: false, message: "Member account not found." }, { status: 404 })
    }

    if (body.name !== undefined) member.name = body.name.trim()
    if (body.profilePhoto !== undefined) member.profilePhoto = body.profilePhoto.trim()
    if (body.phone !== undefined) member.phone = body.phone.trim()
    if (body.bio !== undefined) member.bio = body.bio.trim()
    if (body.college !== undefined) member.college = body.college.trim()
    if (body.githubUrl !== undefined) member.githubUrl = body.githubUrl.trim()
    if (body.linkedinUrl !== undefined) member.linkedinUrl = body.linkedinUrl.trim()
    if (body.portfolioUrl !== undefined) member.portfolioUrl = body.portfolioUrl.trim()
    if (body.skills !== undefined) {
      member.skills = Array.isArray(body.skills)
        ? body.skills.map((s: string) => s.trim()).filter(Boolean)
        : typeof body.skills === "string"
        ? body.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []
    }

    await member.save()

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully! ✨",
      user: member,
    })
  } catch (error: any) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to update profile" }, { status: 500 })
  }
}
