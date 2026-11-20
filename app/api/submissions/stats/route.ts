import { NextResponse } from "next/server"
import mongoose from "mongoose"
import connectToDatabase from "@/lib/mongoose"
import { Task } from "@/models/task"
import { Submission } from "@/models/submission"
import { getInternUser } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const intern = await getInternUser()
    if (!intern) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 })
    }

    await connectToDatabase()

    const internObjectId = new mongoose.Types.ObjectId(intern.id)
    const internEmail = intern.email.toLowerCase()

    // 1. Find all tasks assigned to this intern
    const assignedTasks = await Task.find({
      $or: [
        { isAllInterns: true },
        { assignedTo: "all" },
        { assignedInterns: internObjectId },
        { assignedEmails: internEmail },
        { assignedTo: { $regex: new RegExp(`\\b${internEmail}\\b`, "i") } },
      ],
    }).select("_id points deadline dueDate").lean()

    const totalAssigned = assignedTasks.length
    const maxAchievablePoints = assignedTasks.reduce((sum, t) => sum + (t.points || 100), 0)

    // 2. Find all submissions by this intern
    const submissions = await Submission.find({ internId: internObjectId }).lean()

    const submitted = submissions.length
    let approved = 0
    let pending = 0
    let rejected = 0
    let totalPointsEarned = 0

    submissions.forEach((s) => {
      if (s.status === "approved") {
        approved++
        totalPointsEarned += s.pointsAwarded || 0
      } else if (s.status === "pending") {
        pending++
      } else if (s.status === "rejected") {
        rejected++
      }
    })

    const notSubmitted = Math.max(0, totalAssigned - submitted)
    const completionRate = totalAssigned > 0 ? Math.round((approved / totalAssigned) * 100) : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalAssigned,
        submitted,
        approved,
        pending,
        rejected,
        notSubmitted,
        totalPointsEarned,
        maxAchievablePoints,
        completionRate,
      },
      intern: {
        id: intern.id,
        name: intern.name,
        email: intern.email,
        role: intern.role,
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/submissions/stats:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to load stats" }, { status: 500 })
  }
}
