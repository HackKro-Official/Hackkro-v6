import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { CampusAmbassador } from "@/models/campus-ambassador"
import { hashPassword } from "@/lib/password-utils"
import { sendApplicationReceivedEmail } from "@/lib/ambassador-email"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      email,
      mobile,
      password,
      collegeName,
      universityName,
      collegeCity,
      state,
      courseBranch,
      currentYearSemester,
      collegeStudentId = "",
      profilePhoto = "",
      linkedinUrl = "",
      instagramUrl = "",
      whyJoin,
    } = body

    // 1. Validation
    if (
      !name ||
      !email ||
      !mobile ||
      !password ||
      !collegeName ||
      !universityName ||
      !collegeCity ||
      !state ||
      !courseBranch ||
      !currentYearSemester ||
      !whyJoin
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill in all required fields marked with an asterisk (*).",
        },
        { status: 400 }
      )
    }

    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const cleanEmail = email.trim().toLowerCase()
    const cleanMobile = mobile.trim().replace(/[^0-9+]/g, "")

    // 2. Prevent duplicate applications by email or mobile
    const existing = await CampusAmbassador.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    })

    if (existing) {
      const matchField = existing.email === cleanEmail ? "email address" : "mobile number"
      return NextResponse.json(
        {
          success: false,
          message: `An application with this ${matchField} already exists with status: ${existing.status}. (Ref ID: ${existing.applicationId})`,
          existingApplicationId: existing.applicationId,
          status: existing.status,
        },
        { status: 409 }
      )
    }

    // 3. Generate Application Reference ID (e.g. HK-CA-2026-7819)
    const currentYear = new Date().getFullYear()
    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    const applicationId = `HK-CA-${currentYear}-${randomDigits}`

    // 4. Hash password
    const hashedPassword = hashPassword(password)

    // 5. Create new Campus Ambassador applicant record
    const newAmbassador = new CampusAmbassador({
      applicationId,
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password: hashedPassword,
      collegeName: collegeName.trim(),
      universityName: universityName.trim(),
      collegeCity: collegeCity.trim(),
      state: state.trim(),
      courseBranch: courseBranch.trim(),
      currentYearSemester: currentYearSemester.trim(),
      collegeStudentId: collegeStudentId?.trim() || "",
      profilePhoto: profilePhoto?.trim() || "",
      linkedinUrl: linkedinUrl?.trim() || "",
      instagramUrl: instagramUrl?.trim() || "",
      whyJoin: whyJoin.trim(),
      status: "Pending",
      points: 0,
      isActive: true,
    })

    await newAmbassador.save()

    // 6. Send acknowledgement email asynchronously
    sendApplicationReceivedEmail(cleanEmail, name.trim(), applicationId, collegeName.trim()).catch((err) => {
      console.warn("Could not dispatch applicant receipt email:", err)
    })

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully! Your application is now Pending admin review.",
      applicationId,
      applicant: {
        applicationId,
        name: newAmbassador.name,
        email: newAmbassador.email,
        collegeName: newAmbassador.collegeName,
        status: newAmbassador.status,
      },
    })
  } catch (error: any) {
    console.error("Campus Ambassador Application error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit application. Please try again." },
      { status: 500 }
    )
  }
}
