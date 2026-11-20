import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"
import { Submission } from "@/models/submission"
import { Task } from "@/models/task"
import { getInternUser } from "@/lib/auth-helpers"
import { sendSubmissionReviewedEmail } from "@/lib/intern-email"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await getInternUser()
    if (!auth) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 })
    }

    await connectToDatabase()

    // 1. Verify this user is a Team Lead / Core Member (not an intern)
    const lead = await TeamMember.findById(auth.id)
    if (!lead || lead.role?.toLowerCase().includes("intern")) {
      return NextResponse.json({ success: false, message: "Access restricted to Team Leads and Core Staff." }, { status: 403 })
    }

    // 2. Find all interns assigned under this Team Lead
    const interns = await TeamMember.find({
      $or: [
        { mentorId: lead._id },
        { mentorEmail: lead.email.toLowerCase() },
      ],
      active: true,
    }).select("_id name email role position profilePhoto").lean()

    const internIds = interns.map((i: any) => i._id)

    // 3. Find submissions by these assigned interns
    const submissions = await Submission.find({ internId: { $in: internIds } })
      .populate("taskId", "title points deadline priority")
      .populate("internId", "name email role position profilePhoto")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      submissions,
      internsCount: interns.length,
    })
  } catch (error: any) {
    console.error("Error fetching mentor intern submissions:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getInternUser()
    if (!auth) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 })
    }

    await connectToDatabase()

    const lead = await TeamMember.findById(auth.id)
    if (!lead || lead.role?.toLowerCase().includes("intern")) {
      return NextResponse.json({ success: false, message: "Access restricted to Team Leads." }, { status: 403 })
    }

    const body = await req.json()
    const { submissionId, status, pointsAwarded = 0, feedback = "" } = body

    if (!submissionId || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, message: "Submission ID and valid status are required." }, { status: 400 })
    }

    const submission = await Submission.findById(submissionId).populate("taskId")
    if (!submission) {
      return NextResponse.json({ success: false, message: "Submission not found." }, { status: 404 })
    }

    // Verify submission belongs to an intern under this team lead
    const intern = await TeamMember.findById(submission.internId)
    const isUnderLead =
      intern &&
      (intern.mentorId?.toString() === lead._id.toString() ||
        intern.mentorEmail?.toLowerCase() === lead.email.toLowerCase() ||
        lead.isAdmin)

    if (!isUnderLead) {
      return NextResponse.json({ success: false, message: "You can only evaluate your assigned interns." }, { status: 403 })
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
    submission.reviewedBy = `${lead.name} (${lead.role || "Lead"})`

    await submission.save()

    // Notify intern via email
    if (submission.internEmail) {
      sendSubmissionReviewedEmail(submission.internEmail, {
        internName: submission.internName,
        taskTitle: task?.title || "Milestone Task",
        status,
        pointsAwarded: submission.pointsAwarded,
        maxPoints,
        feedback: submission.feedback,
      }, req).catch((err) => console.warn("Mentor review email failed:", err))
    }

    return NextResponse.json({
      success: true,
      message: `Intern submission ${status === "approved" ? "approved" : "marked for revision"} successfully!`,
      submission,
    })
  } catch (error: any) {
    console.error("Error evaluating intern submission by lead:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
