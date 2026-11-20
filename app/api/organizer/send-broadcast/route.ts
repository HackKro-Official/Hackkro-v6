import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { EventModel } from "@/models/event"
import { EventRegistration } from "@/models/event-registration"
import { verifyOrganizerAuth } from "@/lib/organizer-auth-helper"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyOrganizerAuth(req)
    if (!auth.authorized || !auth.organizer) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const { eventId, subject, message } = await req.json()

    if (!eventId || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, message: "Event ID, Subject line, and Message content are required." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const event = await EventModel.findOne({
      id: eventId,
      organizerEmail: auth.organizer.email.toLowerCase(),
    })

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found or unauthorized to broadcast." },
        { status: 403 }
      )
    }

    // Strict 3-Email Limit Check
    const currentSent = event.emailBroadcastsSent || 0
    if (currentSent >= 3) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Limit reached! You have already sent the maximum allowed 3 broadcast emails to registered participants for this event.",
          broadcastsSent: currentSent,
          maxAllowed: 3,
        },
        { status: 429 }
      )
    }

    // Fetch all confirmed registered participants for this event
    const participants = await EventRegistration.find({
      eventId,
      status: { $ne: "cancelled" },
    }).select("name email registrationId participationType teamName")

    if (participants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No registered participants found for this event to send emails to.",
        },
        { status: 400 }
      )
    }

    const transporter = getTransporter()
    let sentCount = 0
    let failedCount = 0

    // Send personalized emails
    for (const participant of participants) {
      try {
        const personalizedSubject = subject
          .replace(/\{name\}/gi, participant.name)
          .replace(/\{registrationId\}/gi, participant.registrationId)
          .replace(/\{eventTitle\}/gi, event.title)

        const personalizedMessage = message
          .replace(/\{name\}/gi, participant.name)
          .replace(/\{registrationId\}/gi, participant.registrationId)
          .replace(/\{eventTitle\}/gi, event.title)

        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
              .header { background: linear-gradient(135deg, #004aad 0%, #1e40af 100%); padding: 24px; text-align: center; color: white; }
              .header h2 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
              .header p { margin: 0; font-size: 13px; opacity: 0.9; }
              .content { padding: 28px 24px; line-height: 1.6; }
              .user-badge { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin: 18px 0; font-size: 13px; }
              .user-id { font-weight: bold; color: #1e40af; font-family: monospace; font-size: 14px; }
              .organizer-info { margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
              .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Official Update: ${event.title}</h2>
                <p>Organizer Communication • HackKro Official</p>
              </div>
              <div class="content">
                <p>Dear <strong>${participant.name}</strong>,</p>

                <div class="user-badge">
                  <strong>Registered Participant:</strong> ${participant.name}<br/>
                  <strong>Unique Pass ID:</strong> <span class="user-id">${participant.registrationId}</span>
                </div>

                <div style="font-size: 15px; color: #334155; white-space: pre-wrap;">
${personalizedMessage}
                </div>

                <div class="organizer-info">
                  <p style="margin: 0;">
                    Broadcasted by <strong>${event.organizerName || auth.organizer.name}</strong><br/>
                    <em>${event.organizerOrganization || auth.organizer.organization}</em>
                  </p>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 HackKro Platform. You received this email because you are registered for ${event.title}.</p>
              </div>
            </div>
          </body>
          </html>
        `

        await transporter.sendMail({
          from: `"HackKro - ${event.title}" <${process.env.EMAIL_USER || "events@hackkro.com"}>`,
          to: participant.email,
          subject: personalizedSubject,
          html: htmlBody,
        })
        sentCount++
      } catch (err) {
        console.error(`Failed to send email to ${participant.email}:`, err)
        failedCount++
      }
    }

    // Increment email broadcast count and append to log
    event.emailBroadcastsSent = currentSent + 1
    event.emailBroadcasts.push({
      subject,
      message,
      sentAt: new Date(),
      recipientCount: sentCount,
      sentBy: auth.organizer.email,
    })

    await event.save()

    return NextResponse.json({
      success: true,
      message: `Broadcast successfully sent to ${sentCount} participant(s)! (${failedCount} failed)`,
      broadcastsSent: event.emailBroadcastsSent,
      remainingBroadcasts: 3 - event.emailBroadcastsSent,
      recipientCount: sentCount,
    })
  } catch (error: any) {
    console.error("Broadcast email error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
