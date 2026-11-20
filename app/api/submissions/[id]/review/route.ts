import { NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Submission } from "@/models/submission"
import { Task } from "@/models/task"
import { getAdminUser } from "@/lib/auth-helpers"
import { sendSubmissionReviewedEmail } from "@/lib/intern-email"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    const body = await req.json()
    const { status, pointsAwarded = 0, feedback = "" } = body

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status. Must be either 'approved' or 'rejected'." },
        { status: 400 }
      )
    }

    const submission = await Submission.findById(params.id).populate("taskId")
    if (!submission) {
      return NextResponse.json({ success: false, message: "Submission not found." }, { status: 404 })
    }

    const task: any = submission.taskId
    const maxPoints = task ? (task.points || 100) : 100

    let score = Number(pointsAwarded) || 0
    if (score < 0) score = 0
    if (score > maxPoints) score = maxPoints

    submission.status = status
    submission.pointsAwarded = status === "approved" ? score : 0
    submission.feedback = feedback.trim()
    submission.reviewedAt = new Date()
    submission.reviewedBy = admin.email

    await submission.save()

    // Send evaluation email to the intern in the background
    if (submission.internEmail) {
      sendSubmissionReviewedEmail(submission.internEmail, {
        internName: submission.internName,
        taskTitle: task?.title || "Assigned Task",
        status,
        pointsAwarded: submission.pointsAwarded,
        maxPoints,
        feedback: submission.feedback,
      }).catch((err) => console.warn("Review notification background error:", err))
    }

    return NextResponse.json({
      success: true,
      message: `Submission ${status === "approved" ? "approved" : "rejected"} successfully!`,
      submission,
    })
  } catch (error: any) {
    console.error("Error in review submission API:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to review submission" }, { status: 500 })
  }
}
