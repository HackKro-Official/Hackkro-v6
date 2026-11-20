import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { sendEmailAdapter } from "@/backend/adapters/email.adapter"
import { createSupportTicketRecord } from "@/backend/modules/ecosystem-platform.service"
import { sanitizePlainText } from "@/backend/utils/sanitizer"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json()
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const cleanName = sanitizePlainText(name, 120)
    const cleanEmail = sanitizePlainText(email, 160).toLowerCase()
    const cleanSubject = sanitizePlainText(subject, 200)
    const cleanMessage = sanitizePlainText(message, 4000)

    await prisma.contactMessage.create({
      data: { name: cleanName, email: cleanEmail, subject: cleanSubject, message: cleanMessage },
    })

    const ticket = await createSupportTicketRecord(null, {
      email: cleanEmail,
      category: "contact_inquiry",
      subject: cleanSubject,
      message: cleanMessage,
    })

    await sendEmailAdapter({
      to: cleanEmail,
      subject: `We've received your message [${ticket.referenceId}]`,
      html: `<p>Hi ${cleanName},</p><p>Thanks for contacting HackKro regarding "${cleanSubject}". Your support reference ID is <strong>${ticket.referenceId}</strong>.</p>`,
      category: "transactional",
    })

    return NextResponse.json({ success: true, referenceId: ticket.referenceId })
  } catch (error) {
    console.error("Contact API error:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
