import { NextResponse } from "next/server"
import { recalculateTestRanks } from "@/lib/test-evaluator"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    const updatedCount = await recalculateTestRanks(params.testId)

    return NextResponse.json({
      success: true,
      message: `Ranks recalculated for ${updatedCount} candidates based on score and completion speed.`,
      updatedCount,
    })
  } catch (error: any) {
    console.error("Recalculate ranks error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to recalculate ranks" },
      { status: 500 }
    )
  }
}
