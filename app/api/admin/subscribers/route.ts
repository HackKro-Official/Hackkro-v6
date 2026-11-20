import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Subscriber } from "@/models/subscriber"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

// This prevents the "Dynamic server usage" error during build
export const dynamic = 'force-dynamic' 

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

export async function GET(request: Request) {
  try {
    // 1. Verify admin authentication
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    try {
      const decoded = verify(token, JWT_SECRET)
      if (typeof decoded !== "string" && (decoded as any).email !== "team@hackkro.com") {
        throw new Error("Invalid token")
      }
    } catch (error) {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 })
    }

    // 2. Connect to the database
    await connectToDatabase()

    // 3. Get query parameters
    const url = new URL(request.url)
    const search = url.searchParams.get("search") || ""
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.max(1, Number.parseInt(url.searchParams.get("limit") || "10"))
    const skip = (page - 1) * limit

    // 4. Build query
    const query: Record<string, any> = { active: true }
    if (search) {
      query.email = { $regex: search, $options: "i" }
    }

    // 5. Execute DB operations
    const [subscribers, total] = await Promise.all([
      Subscriber.find(query).sort({ subscribeDate: -1 }).skip(skip).limit(limit),
      Subscriber.countDocuments(query)
    ])

    return NextResponse.json({
      success: true,
      subscribers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error in subscribers API:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred while fetching subscribers" },
      { status: 500 },
    )
  }
}
