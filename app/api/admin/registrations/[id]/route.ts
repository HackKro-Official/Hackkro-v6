import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { EventRegistration } from "@/models/event-registration"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

async function verifyAdminAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin-token")?.value

  if (!token) {
    throw new Error("Authentication required")
  }

  const decoded = verify(token, JWT_SECRET)
  if (typeof decoded !== "string" && (decoded as any).email !== "team@hackkro.com") {
    throw new Error("Invalid token")
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth()
    await connectToDatabase()

    const { id } = params
    const deleted = await EventRegistration.findByIdAndDelete(id)

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Registration not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Registration deleted successfully",
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete registration" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth()
    await connectToDatabase()

    const { id } = params
    const body = await request.json()
    const { status } = body

    if (!["confirmed", "waitlist", "cancelled"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status value" },
        { status: 400 }
      )
    }

    const updated = await EventRegistration.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Registration not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Registration status updated",
      registration: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update registration" },
      { status: 500 }
    )
  }
}
