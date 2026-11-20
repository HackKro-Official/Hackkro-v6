import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"
import { Submission } from "@/models/submission"
import { getAdminUser } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    // Fetch all active members
    const allMembers = await TeamMember.find({ active: true })
      .select("_id name email role position profilePhoto phone college bio skills mentorId mentorName mentorEmail addedAt lastLogin")
      .sort({ addedAt: -1 })
      .lean()

    const mentorsList = allMembers
      .filter((m: any) => !m.role?.toLowerCase().includes("intern"))
      .map((m: any) => ({
        _id: m._id.toString(),
        name: m.name || m.email.split("@")[0],
        email: m.email,
        role: m.role || "Team Member",
        position: m.position || "Core Team",
        profilePhoto: m.profilePhoto || "",
      }))

    const rawInterns = allMembers.filter((m: any) => m.role?.toLowerCase().includes("intern"))
    const internIds = rawInterns.map((i: any) => i._id)

    // Aggregate points and approved submissions count for all interns
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
    approvedSubmissions.forEach((s) => {
      statsMap[s._id.toString()] = {
        pointsEarned: s.pointsEarned || 0,
        completedTasks: s.completedTasks || 0,
      }
    })

    const interns = rawInterns.map((i: any) => ({
      _id: i._id.toString(),
      name: i.name || i.email.split("@")[0],
      email: i.email,
      role: i.role || "Intern",
      position: i.position || "Tech Intern",
      profilePhoto: i.profilePhoto || "",
      phone: i.phone || "",
      college: i.college || "",
      bio: i.bio || "",
      skills: i.skills || [],
      mentorId: i.mentorId ? i.mentorId.toString() : null,
      mentorName: i.mentorName || "",
      mentorEmail: i.mentorEmail || "",
      pointsEarned: statsMap[i._id.toString()]?.pointsEarned || 0,
      completedTasks: statsMap[i._id.toString()]?.completedTasks || 0,
      addedAt: i.addedAt,
      isIntern: true,
    }))

    return NextResponse.json({
      success: true,
      interns,
      mentors: mentorsList,
      totalInterns: interns.length,
      totalMentors: mentorsList.length,
    })
  } catch (error: any) {
    console.error("Error fetching interns & mentors:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to load interns" }, { status: 500 })
  }
}
