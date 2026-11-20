import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { Organizer } from "@/models/organizer"
import {
  sendOrganizerRegistrationReceivedEmail,
  sendOrganizerAdminAlertEmail,
} from "@/lib/organizer-email"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, organization, designation, phone, website, description } = await req.json()

    if (!name || !email || !password || !organization) {
      return NextResponse.json(
        { success: false, message: "Please provide Name, Email, Password, and Organization Name." },
        { status: 400 }
      )
    }

    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ success: false, message: "Please enter a valid email address." }, { status: 400 })
    }

    await connectToDatabase()

    const cleanEmail = email.trim().toLowerCase()
    const existing = await Organizer.findOne({ email: cleanEmail })

    if (existing) {
      return NextResponse.json(
        { success: false, message: "An organizer account with this email already exists. Please log in or check status." },
        { status: 409 }
      )
    }

    // Save with status 'pending' and active false until admin approves
    const organizer = new Organizer({
      name: name.trim(),
      email: cleanEmail,
      password: password.trim(),
      organization: organization.trim(),
      designation: designation?.trim() || "Event Organizer",
      phone: phone?.trim() || "",
      website: website?.trim() || "",
      description: description?.trim() || "",
      status: "pending",
      active: false,
    })

    await organizer.save()

    // Send confirmation email to the organizer
    await sendOrganizerRegistrationReceivedEmail(cleanEmail, organizer.name, organizer.organization)

    // Notify HackKro admin team
    await sendOrganizerAdminAlertEmail(organizer.name, organizer.organization, cleanEmail, organizer.phone)

    return NextResponse.json({
      success: true,
      pendingApproval: true,
      message:
        "Aapka registration submit ho gaya hai! Admin team verify karegi aur approval milne ke baad aap login karke opportunities & events post kar paoge.",
      organizer: {
        id: String(organizer._id),
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
        status: organizer.status,
      },
    })
  } catch (error: any) {
    console.error("Organizer registration error:", error)
    return NextResponse.json({ success: false, message: error.message || "Registration failed." }, { status: 500 })
  }
}
