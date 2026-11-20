import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { normalizeEmail } from "@/backend/utils/phone"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 })
    const cleanEmail = normalizeEmail(email)

    await prisma.newsletterSubscriber.upsert({
      where: { email: cleanEmail },
      update: { active: true },
      create: { email: cleanEmail, active: true },
    })

    return NextResponse.json({ success: true, message: "Subscribed to HackKro updates!" })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Subscription failed" }, { status: 400 })
  }
}
