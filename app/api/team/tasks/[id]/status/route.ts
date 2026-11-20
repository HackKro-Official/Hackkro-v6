import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Task } from "@/models/task"
import { TeamMember } from "@/models/team-member"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("team-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    const { status, notes } = await request.json()

    if (!status || !["pending", "process", "complete", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Valid status is required (pending, process, complete, rejected)" },
        { status: 400 },
      )
    }

    await connectToDatabase()

    const task = await Task.findById(params.id)
    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 })
    }

    // Check if task is assigned to the team member
    if (task.assignedTo !== (typeof decoded !== "string" ? decoded.email : undefined)) {
      return NextResponse.json(
        { success: false, message: "You can only update tasks assigned to you" },
        { status: 403 },
      )
    }

    const oldStatus = task.status
    task.status = status
    if (notes) {
      task.notes = notes
    }
    task.updatedAt = new Date()

    await task.save()

    // Send notification email to admin safely
    try {
      const transporter = getTransporter()
      if (transporter) {
        const teamMember = await TeamMember.findOne({
          email: typeof decoded !== "string" ? decoded.email : undefined,
        })

        const mailOptions = {
          from: process.env.EMAIL_FROM || "adarshshuklakota18@gmail.com",
          to: "team@hackkro.com",
          subject: `Task Status Updated: ${task.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">HackKro</h1>
                <p style="color: white; margin-top: 5px;">HackKro</p>
              </div>
              
              <div style="padding: 20px;">
                <h2>Task Status Updated</h2>
                <p>Hello Admin,</p>
                <p>${teamMember?.name || (typeof decoded !== "string" && decoded.email)} has updated the status of a task:</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">${task.title}</h3>
                  <p><strong>Previous Status:</strong> ${oldStatus}</p>
                  <p><strong>New Status:</strong> ${status}</p>
                  <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
                  ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
                </div>
                
                <p>You can view the task details in the admin dashboard.</p>
                
                <p>Best regards,<br>Team<br>HackKro</p>
              </div>
              
              <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
                <p>This is an automated email from HackKro. Please do not reply to this email.</p>
                <p>HackKro, NH-58, Delhi-Roorkee Highway, Meerut, Uttar Pradesh - 250002</p>
              </div>
            </div>
          `,
        }

        await transporter.sendMail(mailOptions)
      }
    } catch (emailErr) {
      console.warn("Failed to send task status update email to admin:", emailErr)
    }

    return NextResponse.json({
      success: true,
      message: "Task status updated successfully",
      task,
    })
  } catch (error) {
    console.error("Error updating task status:", error)
    return NextResponse.json({ success: false, message: "Failed to update task status" }, { status: 500 })
  }
}
