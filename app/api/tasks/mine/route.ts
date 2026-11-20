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
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in to your team account." }, { status: 401 })
    }

    await connectToDatabase()

    const internObjectId = new mongoose.Types.ObjectId(intern.id)
    const internEmail = intern.email.toLowerCase()

    // Find tasks assigned to this intern:
    // 1. isAllInterns: true
    // 2. assignedInterns contains internObjectId
    // 3. assignedEmails contains internEmail
    // 4. assignedTo === internEmail or assignedTo === "all"
    const query = {
      $or: [
        { isAllInterns: true },
        { assignedTo: "all" },
        { assignedInterns: internObjectId },
        { assignedEmails: internEmail },
        { assignedTo: { $regex: new RegExp(`\\b${internEmail}\\b`, "i") } },
      ],
    }

    const tasks = await Task.find(query).sort({ deadline: 1, createdAt: -1 }).lean()
    const taskIds = tasks.map((t: any) => t._id)

    // Find all submissions by this intern for these tasks
    const submissions = await Submission.find({
      taskId: { $in: taskIds },
      internId: internObjectId,
    }).lean()

    const submissionMap: Record<string, any> = {}
    submissions.forEach((s: any) => {
      submissionMap[s.taskId.toString()] = {
        _id: s._id.toString(),
        submissionUrl: s.submissionUrl,
        notes: s.notes,
        status: s.status, // 'pending' | 'approved' | 'rejected'
        pointsAwarded: s.pointsAwarded || 0,
        feedback: s.feedback,
        reviewedAt: s.reviewedAt,
        reviewedBy: s.reviewedBy,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }
    })

    const enrichedTasks = tasks.map((t: any) => {
      const sub = submissionMap[t._id.toString()] || null
      let submissionState: "not_submitted" | "pending" | "approved" | "rejected" = "not_submitted"
      if (sub) {
        submissionState = sub.status
      }

      return {
        _id: t._id.toString(),
        title: t.title,
        description: t.description,
        deadline: t.deadline || t.dueDate,
        points: t.points || 100,
        priority: t.priority || "medium",
        status: t.status || "active",
        createdAt: t.createdAt,
        mySubmission: sub,
        submissionState,
      }
    })

    return NextResponse.json({
      success: true,
      tasks: enrichedTasks,
      total: enrichedTasks.length,
      intern: {
        name: intern.name,
        email: intern.email,
        role: intern.role,
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/tasks/mine:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to load assigned tasks" }, { status: 500 })
  }
}
