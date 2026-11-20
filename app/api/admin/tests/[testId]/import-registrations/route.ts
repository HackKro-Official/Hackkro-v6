import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { EventRegistration } from "@/models/event-registration"
import { Test } from "@/models/test"
import { TestCandidate } from "@/models/test-candidate"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"
import { generateCandidatePassword } from "@/lib/test-library"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    const { eventId, selectedRegistrationIds, defaultEligible } = await request.json()

    await connectToDatabase()

    const test = await Test.findOne({ testId: params.testId })
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found." }, { status: 404 })
    }

    const targetEventId = eventId || test.eventId

    // Query registrations
    const regQuery: Record<string, any> = { eventId: targetEventId }
    if (Array.isArray(selectedRegistrationIds) && selectedRegistrationIds.length > 0) {
      regQuery._id = { $in: selectedRegistrationIds }
    }

    const registrations = await EventRegistration.find(regQuery)

    if (registrations.length === 0) {
      return NextResponse.json(
        { success: false, message: `No registrations found for event ID "${targetEventId}"` },
        { status: 404 }
      )
    }

    let importedCount = 0
    let skippedCount = 0

    for (const reg of registrations) {
      const email = reg.email.trim().toLowerCase()

      // Check if already in test candidates
      const exists = await TestCandidate.findOne({ testId: params.testId, email })
      if (exists) {
        skippedCount++
        continue
      }

      const generatedPassword = generateCandidatePassword()

      await TestCandidate.create({
        testId: params.testId,
        eventId: targetEventId,
        registrationId: reg.registrationId || String(reg._id || ""),
        name: reg.name,
        email,
        loginId: email,
        password: generatedPassword,
        phone: reg.phone || "",
        college: reg.college || "",
        isEligible: defaultEligible !== false,
        status: "not-started",
      })

      importedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${importedCount} candidates added, ${skippedCount} already existed.`,
      importedCount,
      skippedCount,
      totalProcessed: registrations.length,
    })
  } catch (error: any) {
    console.error("Import registrations error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to import registrations" },
      { status: 500 }
    )
  }
}
