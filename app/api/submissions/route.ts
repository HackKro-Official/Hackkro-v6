import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectToDatabase from "@/lib/mongoose"
import { Submission } from "@/models/submission"
import { Task } from "@/models/task"
import { getAdminUser, getInternUser } from "@/lib/auth-helpers"
import { sendTaskSubmittedEmail } from "@/lib/intern-email"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get("taskId")
    const status = searchParams.get("status")
    const search = searchParams.get("search")?.trim() || ""
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25))
    const skip = (page - 1) * limit

    const query: any = {}
    if (taskId && mongoose.Types.ObjectId.isValid(taskId)) {
      query.taskId = new mongoose.Types.ObjectId(taskId)
    }
    if (status && status !== "all") {
      query.status = status
    }
    if (search) {
      query.$or = [
        { internName: { $regex: search, $options: "i" } },
        { internEmail: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ]
    }

    const [submissions, total, counts] = await Promise.all([
      Submission.find(query)
        .populate("taskId", "title points deadline dueDate priority status")
        .populate("internId", "name email role position")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Submission.countDocuments(query),
      Submission.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ])

    const countByStatus = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    }

    counts.forEach((c) => {
      if (c._id in countByStatus) {
        (countByStatus as any)[c._id] = c.count
      }
      countByStatus.total += c.count
    })

    return NextResponse.json({
      success: true,
      submissions: submissions.map((s: any) => ({
        ...s,
        _id: s._id.toString(),
      })),
      counts: countByStatus,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/submissions:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to load submissions" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternUser()
    if (!intern) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in as an intern/team member." }, { status: 401 })
    }

    await connectToDatabase()

    const body = await req.json()
    const { taskId, submissionUrl, notes = "" } = body

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ success: false, message: "Valid Task ID is required." }, { status: 400 })
    }

    if (!submissionUrl || typeof submissionUrl !== "string" || !submissionUrl.trim().startsWith("http")) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid URL (starting with http:// or https://)." },
        { status: 400 }
      )
    }

    // Verify task exists
    const task = await Task.findById(taskId)
    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found." }, { status: 404 })
    }

    // Check if task is assigned to this intern
    const internObjectId = new mongoose.Types.ObjectId(intern.id)
    const internEmail = intern.email.toLowerCase()
    const isAssigned =
      task.isAllInterns ||
      task.assignedTo === "all" ||
      (task.assignedEmails && task.assignedEmails.includes(internEmail)) ||
      (task.assignedInterns && task.assignedInterns.some((id: any) => id.toString() === intern.id)) ||
      (task.assignedTo && task.assignedTo.toLowerCase().includes(internEmail))

    if (!isAssigned) {
      return NextResponse.json(
        { success: false, message: "This task has not been assigned to your account." },
        { status: 403 }
      )
    }

    // Check existing submission
    let submission = await Submission.findOne({ taskId, internId: internObjectId })

    if (submission && submission.status === "approved") {
      return NextResponse.json(
        {
          success: false,
          message: "This submission has already been approved and evaluated. Contact admin if you need a re-evaluation.",
        },
        { status: 400 }
      )
    }

    if (submission) {
      // Update existing submission for re-review
      submission.submissionUrl = submissionUrl.trim()
      submission.notes = notes.trim()
      submission.status = "pending"
      submission.internName = intern.name
      submission.internEmail = internEmail
      submission.reviewedAt = undefined
      submission.reviewedBy = undefined
      await submission.save()
    } else {
      submission = await Submission.create({
        taskId,
        internId: internObjectId,
        internEmail,
        internName: intern.name,
        submissionUrl: submissionUrl.trim(),
        notes: notes.trim(),
        status: "pending",
        pointsAwarded: 0,
      })
    }

    // Notify admin via email in background
    sendTaskSubmittedEmail(process.env.EMAIL_USER || "team@hackkro.com", {
      internName: intern.name,
      internEmail,
      taskTitle: task.title,
      submissionUrl: submission.submissionUrl,
      notes: submission.notes,
    }).catch((err) => console.warn("Admin submission notification error:", err))

    return NextResponse.json({
      success: true,
      message: "Solution submitted successfully! It is now pending admin review.",
      submission,
    })
  } catch (error: any) {
    console.error("Error in POST /api/submissions:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to submit task" }, { status: 500 })
  }
}
