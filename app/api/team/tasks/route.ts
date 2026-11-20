import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Task } from "@/models/task"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

// This line tells Next.js to always render this route at request-time
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

export async function GET(request: Request) {
  try {
    // Verify team authentication
    const cookieStore = await cookies()
    const token = cookieStore.get("team-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    let decoded
    try {
      decoded = verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    // Connect to the database
    await connectToDatabase()

    // Get tasks assigned to the team member
    if (typeof decoded !== "object" || !("email" in decoded)) {
      return NextResponse.json({ success: false, message: "Invalid token payload" }, { status: 401 })
    }

    const tasks = await Task.find({ assignedTo: decoded.email }).sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      tasks,
    })
  } catch (error) {
    console.error("Error in team tasks API:", error)
    return NextResponse.json({ success: false, message: "An error occurred while fetching tasks" }, { status: 500 })
  }
}
