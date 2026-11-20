import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Test } from "@/models/test"
import { TestCandidate } from "@/models/test-candidate"
import { seedDefaultTestIfNeeded } from "@/lib/test-library"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    await connectToDatabase()
    await seedDefaultTestIfNeeded()

    const tests = await Test.find({}).sort({ createdAt: -1 })

    // Enhance tests with live counts
    const enhancedTests = await Promise.all(
      tests.map(async (t) => {
        const totalCandidates = await TestCandidate.countDocuments({ testId: t.testId })
        const eligibleCandidates = await TestCandidate.countDocuments({ testId: t.testId, isEligible: true })
        const submittedCandidates = await TestCandidate.countDocuments({ testId: t.testId, status: "submitted" })

        return {
          ...t.toObject(),
          stats: {
            totalCandidates,
            eligibleCandidates,
            submittedCandidates,
            questionCount: t.questions?.length || 0,
          },
        }
      })
    )

    return NextResponse.json({ success: true, tests: enhancedTests })
  } catch (error: any) {
    console.error("Admin GET tests error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch tests" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    const data = await request.json()
    if (!data.testId || !data.title || !data.eventId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: testId, title, and eventId are required." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const cleanTestId = data.testId.trim().toLowerCase().replace(/\s+/g, "-")

    const existing = await Test.findOne({ testId: cleanTestId })
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A test with this testId already exists." },
        { status: 409 }
      )
    }

    const newTest = await Test.create({
      testId: cleanTestId,
      title: data.title,
      eventId: data.eventId,
      eventTitle: data.eventTitle || data.title,
      description: data.description || "",
      instructions: data.instructions || [],
      durationMinutes: data.durationMinutes || 30,
      totalMarks: data.totalMarks || 10,
      passingMarks: data.passingMarks || 4,
      scheduledDate: data.scheduledDate || "",
      startTime: data.startTime || "",
      endTime: data.endTime || "",
      isActive: data.isActive !== false,
      isResultDeclared: data.isResultDeclared !== false,
      questions: data.questions || [],
    })

    return NextResponse.json({ success: true, message: "Test created successfully", test: newTest })
  } catch (error: any) {
    console.error("Admin POST test error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create test" },
      { status: 500 }
    )
  }
}
