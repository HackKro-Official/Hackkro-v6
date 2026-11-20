import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { normalizeEmail } from "@/backend/utils/phone"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { email, reason, additionalFeedback } = await req.json()
    if (!email) return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 })
    const cleanEmail = normalizeEmail(email)

    await prisma.newsletterSubscriber.updateMany({
      where: { email: cleanEmail },
      data: { active: false },
    })
    if (reason) {
      await prisma.feedbackEntry.create({
        data: {
          email: cleanEmail,
          reason: String(reason),
          additionalFeedback: String(additionalFeedback || ""),
        },
      })
    }

    return NextResponse.json({ success: true, message: "You have been unsubscribed." })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Failed to unsubscribe" }, { status: 400 })
  }
}
