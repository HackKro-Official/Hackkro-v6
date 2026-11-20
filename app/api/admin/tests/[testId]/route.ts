import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Test } from "@/models/test"
import { TestCandidate } from "@/models/test-candidate"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    await connectToDatabase()

    const test = await Test.findOne({ testId: params.testId })
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, test })
  } catch (error: any) {
    console.error("Admin GET testId error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch test" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    const updates = await request.json()
    await connectToDatabase()

    const updated = await Test.findOneAndUpdate({ testId: params.testId }, { $set: updates }, { new: true })

    if (!updated) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Test updated successfully", test: updated })
  } catch (error: any) {
    console.error("Admin PUT testId error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update test" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    await connectToDatabase()

    await Test.findOneAndDelete({ testId: params.testId })
    await TestCandidate.deleteMany({ testId: params.testId })

    return NextResponse.json({ success: true, message: "Test and candidate records deleted successfully" })
  } catch (error: any) {
    console.error("Admin DELETE testId error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete test" },
      { status: 500 }
    )
  }
}
