import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { EventModel } from "@/models/event"
import { EventRegistration } from "@/models/event-registration"
import { verifyOrganizerAuth } from "@/lib/organizer-auth-helper"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyOrganizerAuth(req)
    if (!auth.authorized || !auth.organizer) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get("eventId")

    if (!eventId) {
      return NextResponse.json({ success: false, message: "eventId parameter is required" }, { status: 400 })
    }

    await connectToDatabase()

    // Verify ownership of the event
    const event = await EventModel.findOne({
      id: eventId,
      organizerEmail: auth.organizer.email.toLowerCase(),
    })

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found or unauthorized to view registrations." },
        { status: 403 }
      )
    }

    // Query registrations
    const registrations = await EventRegistration.find({ eventId })
      .sort({ registeredAt: -1 })
      .select(
        "registrationId name email phone college branch graduationYear participationType teamName teamMembers status domain githubUrl linkedinUrl registeredAt"
      )
      .lean()

    return NextResponse.json({
      success: true,
      eventTitle: event.title,
      eventId: event.id,
      emailBroadcastsSent: event.emailBroadcastsSent || 0,
      totalRegistrations: registrations.length,
      registrations,
    })
  } catch (error: any) {
    console.error("Organizer registrations GET error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
