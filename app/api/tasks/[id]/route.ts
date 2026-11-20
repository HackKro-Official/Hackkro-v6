import { NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Task } from "@/models/task"
import { Submission } from "@/models/submission"
import { TeamMember } from "@/models/team-member"
import { getAdminUser } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase()
    const task = await Task.findById(params.id)
      .populate("assignedInterns", "name email role position")
      .lean()

    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, task })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    const task = await Task.findById(params.id)
    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 })
    }

    await Promise.all([
      Task.findByIdAndDelete(params.id),
      Submission.deleteMany({ taskId: params.id }),
    ])

    return NextResponse.json({
      success: true,
      message: "Task and its submissions deleted successfully.",
    })
  } catch (error: any) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 })
    }

    await connectToDatabase()

    const body = await req.json()
    const task = await Task.findById(params.id)
    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 })
    }

    if (body.title) task.title = body.title.trim()
    if (body.description) task.description = body.description.trim()
    if (body.points !== undefined) task.points = Math.max(0, Number(body.points))
    if (body.priority) task.priority = body.priority
    if (body.status) task.status = body.status
    if (body.notes !== undefined) task.notes = body.notes
    if (body.deadline) {
      task.deadline = new Date(body.deadline)
      task.dueDate = new Date(body.deadline)
    }

    if (body.assignedTo !== undefined) {
      if (body.assignedTo === "all" || body.assignedTo === "" || !body.assignedTo) {
        task.isAllInterns = true
        task.assignedTo = "all"
        task.assignedInterns = []
        task.assignedEmails = []
      } else if (Array.isArray(body.assignedTo)) {
        task.isAllInterns = false
        const assignedInterns: any[] = []
        const assignedEmails: string[] = []
        for (const item of body.assignedTo) {
          if (typeof item === "string" && item.includes("@")) {
            assignedEmails.push(item.toLowerCase().trim())
            const member = await TeamMember.findOne({ email: item.toLowerCase().trim() })
            if (member) assignedInterns.push(member._id)
          } else {
            const member = await TeamMember.findById(item)
            if (member) {
              assignedInterns.push(member._id)
              if (member.email) assignedEmails.push(member.email.toLowerCase().trim())
            }
          }
        }
        task.assignedInterns = assignedInterns
        task.assignedEmails = assignedEmails
        task.assignedTo = assignedEmails.join(", ")
      }
    }

    await task.save()

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
      task,
    })
  } catch (error: any) {
    console.error("Error updating task:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
