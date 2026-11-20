import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { CampusAmbassador } from "@/models/campus-ambassador"
import { hashPassword } from "@/lib/password-utils"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Email, OTP, and new password are required." },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 6 characters long." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const cleanEmail = email.trim().toLowerCase()
    const ambassador = await CampusAmbassador.findOne({ email: cleanEmail })

    if (!ambassador) {
      return NextResponse.json({ success: false, message: "Invalid email or expired OTP." }, { status: 400 })
    }

    if (!ambassador.resetOtp || ambassador.resetOtp !== otp.trim()) {
      return NextResponse.json({ success: false, message: "Invalid verification code (OTP)." }, { status: 400 })
    }

    if (ambassador.resetOtpExpiry && Date.now() > ambassador.resetOtpExpiry) {
      return NextResponse.json(
        { success: false, message: "Verification code has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Update password
    ambassador.password = hashPassword(newPassword.trim())
    ambassador.resetOtp = ""
    ambassador.resetOtpExpiry = 0
    await ambassador.save()

    return NextResponse.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    })
  } catch (error: any) {
    console.error("Reset password error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
