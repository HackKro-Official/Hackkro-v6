import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { TestCandidate } from "@/models/test-candidate"
import { Test } from "@/models/test"
import { formatTimeTaken } from "@/lib/test-evaluator"
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

    const leaderboard = await TestCandidate.find({
      testId: params.testId,
      status: "submitted",
    })
      .sort({ rank: 1, score: -1, timeTakenSeconds: 1 })
      .select("name email college score rank timeTakenSeconds submittedAt tabSwitches answers")

    const formattedLeaderboard = leaderboard.map((c) => ({
      id: c._id,
      name: c.name,
      email: c.email,
      college: c.college,
      score: c.score,
      totalMarks: test.totalMarks,
      rank: c.rank,
      timeTakenSeconds: c.timeTakenSeconds,
      timeTakenFormatted: formatTimeTaken(c.timeTakenSeconds),
      submittedAt: c.submittedAt,
      tabSwitches: c.tabSwitches || 0,
      totalAnswered: c.answers?.length || 0,
    }))

    return NextResponse.json({
      success: true,
      testTitle: test.title,
      totalMarks: test.totalMarks,
      totalSubmissions: formattedLeaderboard.length,
      leaderboard: formattedLeaderboard,
    })
  } catch (error: any) {
    console.error("Leaderboard GET error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch leaderboard" },
      { status: 500 }
    )
  }
}
