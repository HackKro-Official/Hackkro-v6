import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Task } from "@/models/task"
import { TeamMember } from "@/models/team-member"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import nodemailer from "nodemailer"

import { getAppBaseUrl } from "@/lib/url-helper"

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

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    try {
      const decoded = verify(token, JWT_SECRET)
      if (typeof decoded !== "object" || decoded.email !== "team@hackkro.com") {
        throw new Error("Invalid token")
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    await connectToDatabase()

    const url = new URL(request.url)
    const search = url.searchParams.get("search") || ""
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    const query: any = {}
    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }, { assignedTo: { $regex: search, $options: "i" } }]
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    const total = await Task.countDocuments(query)

    return NextResponse.json({
      success: true,
      tasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error in tasks API:", error)
    return NextResponse.json({ success: false, message: "An error occurred while fetching tasks" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    try {
      const decoded = verify(token, JWT_SECRET)
      if (typeof decoded !== "object" || decoded.email !== "team@hackkro.com") {
        throw new Error("Invalid token")
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    const { title, description, assignedTo, priority, dueDate, notes } = await request.json()

    if (!title || !description || !assignedTo || !dueDate) {
      return NextResponse.json(
        { success: false, message: "Title, description, assignedTo, and dueDate are required fields" },
        { status: 400 },
      )
    }

    await connectToDatabase()

    const teamMember = await TeamMember.findOne({ email: assignedTo })
    if (!teamMember) {
      return NextResponse.json({ success: false, message: "The assigned team member does not exist" }, { status: 404 })
    }

    const newTask = new Task({
      title,
      description,
      assignedTo,
      priority: priority || "medium",
      dueDate: new Date(dueDate),
      notes: notes || "",
    })

    await newTask.save()

    // Send notification email safely
    try {
      const transporter = getTransporter()
      if (transporter) {
        const siteUrl = getAppBaseUrl(request)
        const taskUrl = `${siteUrl}/team/dashboard?task=${newTask._id}`

        const mailOptions = {
          from: `"HackKro Team Portal" <${process.env.EMAIL_USER || "team@hackkro.com"}>`,
          to: assignedTo,
          subject: `New Task Assigned: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">HackKro</h1>
                <p style="color: white; margin-top: 5px;"> HackKro </p>
              </div>
              
              <div style="padding: 20px;">
                <h2>New Task Assigned</h2>
                <p>Dear ${teamMember.name},</p>
                <p>A new task has been assigned to you:</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">${title}</h3>
                  <p><strong>Description:</strong> ${description}</p>
                  <p><strong>Priority:</strong> ${priority || "Medium"}</p>
                  <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
                  ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${taskUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">View Task</a>
                </div>
                
                <p>Please log in to your team dashboard to view and update this task.</p>
                
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
      console.warn("Failed to send task assignment email:", emailErr)
    }

    return NextResponse.json({
      success: true,
      message: "Task added successfully",
      task: newTask,
    })
  } catch (error) {
    console.error("Error in add task API:", error)
    return NextResponse.json({ success: false, message: "An error occurred while adding task" }, { status: 500 })
  }
}
