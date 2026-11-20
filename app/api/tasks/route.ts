import { NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Task } from "@/models/task"
import { Submission } from "@/models/submission"
import { TeamMember } from "@/models/team-member"
import { getAdminUser } from "@/lib/auth-helpers"
import { sendTaskAssignedEmail } from "@/lib/intern-email"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const priority = searchParams.get("priority")
    const status = searchParams.get("status")
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20))
    const skip = (page - 1) * limit

    const query: any = {}
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { assignedTo: { $regex: search, $options: "i" } },
      ]
    }
    if (priority && priority !== "all") {
      query.priority = priority
    }
    if (status && status !== "all") {
      query.status = status
    }

    const [tasks, total] = await Promise.all([
      Task.find(query).populate("assignedInterns", "name email role position").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Task.countDocuments(query),
    ])

    // Get submission counts for each task
    const taskIds = tasks.map((t: any) => t._id)
    const submissionStats = await Submission.aggregate([
      { $match: { taskId: { $in: taskIds } } },
      {
        $group: {
          _id: "$taskId",
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ])

    const statsMap: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {}
    submissionStats.forEach((s) => {
      statsMap[s._id.toString()] = {
        total: s.total,
        pending: s.pending,
        approved: s.approved,
        rejected: s.rejected,
      }
    })

    const enrichedTasks = tasks.map((t: any) => ({
      ...t,
      _id: t._id.toString(),
      deadline: t.deadline || t.dueDate,
      stats: statsMap[t._id.toString()] || { total: 0, pending: 0, approved: 0, rejected: 0 },
    }))

    return NextResponse.json({
      success: true,
      tasks: enrichedTasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/tasks:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    const body = await req.json()
    const {
      title,
      description,
      deadline,
      dueDate,
      points = 100,
      assignedTo = "all", // 'all' or array of member IDs or comma-separated emails
      priority = "medium",
      notes = "",
    } = body

    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: "Task title and description are required." },
        { status: 400 }
      )
    }

    const taskDeadline = deadline ? new Date(deadline) : dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 86400000)
    const taskPoints = Math.max(0, Number(points) || 100)

    let isAllInterns = false
    const assignedInterns: any[] = []
    const assignedEmails: string[] = []

    if (assignedTo === "all" || assignedTo === "" || !assignedTo) {
      isAllInterns = true
      // Fetch all active interns to notify via email
      const activeMembers = await TeamMember.find({ active: true }).select("email").lean()
      activeMembers.forEach((m: any) => {
        if (m.email) assignedEmails.push(m.email.toLowerCase())
      })
    } else if (Array.isArray(assignedTo)) {
      // Array of intern IDs or emails
      for (const item of assignedTo) {
        if (typeof item === "string" && item.includes("@")) {
          assignedEmails.push(item.toLowerCase().trim())
          const member = await TeamMember.findOne({ email: item.toLowerCase().trim() })
          if (member) assignedInterns.push(member._id)
        } else {
          // treat as ObjectId
          const member = await TeamMember.findById(item)
          if (member) {
            assignedInterns.push(member._id)
            if (member.email) assignedEmails.push(member.email.toLowerCase().trim())
          }
        }
      }
    } else if (typeof assignedTo === "string") {
      const parts = assignedTo.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      for (const p of parts) {
        if (p === "all") {
          isAllInterns = true
        } else if (p.includes("@")) {
          assignedEmails.push(p)
          const member = await TeamMember.findOne({ email: p })
          if (member) assignedInterns.push(member._id)
        } else {
          const member = await TeamMember.findById(p)
          if (member) {
            assignedInterns.push(member._id)
            if (member.email) assignedEmails.push(member.email.toLowerCase())
          }
        }
      }
    }

    const newTask = new Task({
      title: title.trim(),
      description: description.trim(),
      deadline: taskDeadline,
      dueDate: taskDeadline,
      points: taskPoints,
      assignedTo: isAllInterns ? "all" : assignedEmails.join(", "),
      assignedInterns,
      assignedEmails,
      isAllInterns,
      priority,
      notes: notes?.trim() || "",
      createdBy: admin.email,
      status: "pending",
    })

    await newTask.save()

    // Trigger email notification to assigned interns in the background
    if (assignedEmails.length > 0) {
      sendTaskAssignedEmail(assignedEmails, {
        title: newTask.title,
        description: newTask.description,
        deadline: taskDeadline,
        points: taskPoints,
      }).catch((err) => console.warn("Task notification background error:", err))
    }

    return NextResponse.json({
      success: true,
      message: "Task created and assigned successfully!",
      task: newTask,
    })
  } catch (error: any) {
    console.error("Error in POST /api/tasks:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to create task" }, { status: 500 })
  }
}
