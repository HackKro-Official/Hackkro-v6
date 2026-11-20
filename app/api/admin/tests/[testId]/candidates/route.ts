import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { TestCandidate } from "@/models/test-candidate"
import { Test } from "@/models/test"
import { verifyAdminAuth } from "@/lib/admin-auth-helper"
import { generateCandidatePassword } from "@/lib/test-library"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    await connectToDatabase()

    const url = new URL(request.url)
    const search = url.searchParams.get("search") || ""
    const status = url.searchParams.get("status") || "all"
    const eligible = url.searchParams.get("eligible") || "all"

    const query: Record<string, any> = { testId: params.testId }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { loginId: { $regex: search, $options: "i" } },
        { college: { $regex: search, $options: "i" } },
        { registrationId: { $regex: search, $options: "i" } },
      ]
    }

    if (status !== "all") {
      query.status = status
    }

    if (eligible === "yes") {
      query.isEligible = true
    } else if (eligible === "no") {
      query.isEligible = false
    }

    const candidates = await TestCandidate.find(query).sort({ rank: 1, score: -1, createdAt: -1 })

    return NextResponse.json({ success: true, candidates })
  } catch (error: any) {
    console.error("Admin GET candidates error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch candidates" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    const data = await request.json()
    if (!data.name || !data.email) {
      return NextResponse.json(
        { success: false, message: "Candidate name and email are required." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const test = await Test.findOne({ testId: params.testId })
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found." }, { status: 404 })
    }

    const cleanEmail = data.email.trim().toLowerCase()
    const password = data.password?.trim() || generateCandidatePassword()
    const loginId = data.loginId?.trim().toLowerCase() || cleanEmail

    const existing = await TestCandidate.findOne({ testId: params.testId, email: cleanEmail })
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A candidate with this email is already registered for this test." },
        { status: 409 }
      )
    }

    const candidate = await TestCandidate.create({
      testId: params.testId,
      eventId: test.eventId,
      registrationId: data.registrationId || "",
      name: data.name.trim(),
      email: cleanEmail,
      loginId,
      password,
      phone: data.phone || "",
      college: data.college || "",
      isEligible: data.isEligible !== false,
      status: "not-started",
    })

    return NextResponse.json({
      success: true,
      message: "Candidate registered for test successfully",
      candidate,
    })
  } catch (error: any) {
    console.error("Admin POST candidate error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create candidate" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: { params: { testId: string } }) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 })
    }

    const { candidateId, updates, action } = await request.json()

    await connectToDatabase()

    if (action === "delete") {
      await TestCandidate.findByIdAndDelete(candidateId)
      return NextResponse.json({ success: true, message: "Candidate deleted successfully" })
    }

    if (action === "toggle-eligibility") {
      const cand = await TestCandidate.findById(candidateId)
      if (!cand) {
        return NextResponse.json({ success: false, message: "Candidate not found" }, { status: 404 })
      }
      cand.isEligible = !cand.isEligible
      await cand.save()
      return NextResponse.json({
        success: true,
        message: `Candidate eligibility set to ${cand.isEligible}`,
        candidate: cand,
      })
    }

    if (action === "reset-password") {
      const newPassword = generateCandidatePassword()
      const cand = await TestCandidate.findByIdAndUpdate(
        candidateId,
        { $set: { password: newPassword, passwordEmailSent: false } },
        { new: true }
      )
      return NextResponse.json({
        success: true,
        message: "Password reset successfully",
        newPassword,
        candidate: cand,
      })
    }

    if (action === "bulk-toggle-eligibility") {
      const { candidateIds, isEligible } = updates
      if (Array.isArray(candidateIds) && candidateIds.length > 0) {
        await TestCandidate.updateMany(
          { _id: { $in: candidateIds }, testId: params.testId },
          { $set: { isEligible } }
        )
      }
      return NextResponse.json({ success: true, message: "Bulk eligibility updated" })
    }

    if (candidateId && updates) {
      const updated = await TestCandidate.findByIdAndUpdate(candidateId, { $set: updates }, { new: true })
      return NextResponse.json({ success: true, message: "Candidate updated", candidate: updated })
    }

    return NextResponse.json({ success: false, message: "No valid action provided" }, { status: 400 })
  } catch (error: any) {
    console.error("Admin PATCH candidate error:", error)
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update candidate" },
      { status: 500 }
    )
  }
}
