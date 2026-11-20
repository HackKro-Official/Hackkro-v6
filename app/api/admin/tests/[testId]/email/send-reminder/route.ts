import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Test } from "@/models/test"
import { TestCandidate } from "@/models/test-candidate"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"
import { send24hReminderEmail } from "@/lib/test-email"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    const { candidateIds } = await request.json().catch(() => ({}))

    await connectToDatabase()

    const test = await Test.findOne({ testId: params.testId })
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found." }, { status: 404 })
    }

    const query: Record<string, any> = {
      testId: params.testId,
      isEligible: true, // Only approved candidates
    }

    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      query._id = { $in: candidateIds }
    }

    const candidates = await TestCandidate.find(query)

    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, message: "No eligible candidates found matching the criteria." },
        { status: 404 }
      )
    }

    let successCount = 0
    let failCount = 0

    // Send emails in batches of 5 to avoid rate-limiting
    for (let i = 0; i < candidates.length; i += 5) {
      const batch = candidates.slice(i, i + 5)
      await Promise.all(
        batch.map(async (cand) => {
          const res = await send24hReminderEmail({
            toEmail: cand.email,
            candidateName: cand.name,
            testTitle: test.title,
            eventTitle: test.eventTitle,
            scheduledDate: test.scheduledDate || "Tomorrow",
            startTime: test.startTime || "As scheduled",
            durationMinutes: test.durationMinutes || 30,
            totalMarks: test.totalMarks || 10,
          })

          if (res.success) {
            cand.reminderEmailSent = true
            await cand.save()
            successCount++
          } else {
            failCount++
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      message: `24-Hour Reminder: Sent to ${successCount} candidates (${failCount} failed or credentials unconfigured).`,
      successCount,
      failCount,
      total: candidates.length,
    })
  } catch (error: any) {
    console.error("Send reminder error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to send reminder emails" },
      { status: 500 }
    )
  }
}
