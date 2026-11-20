import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { CampusAmbassador } from "@/models/campus-ambassador"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 })
    }

    await connectToDatabase()

    const cleanEmail = email.trim().toLowerCase()
    const ambassador = await CampusAmbassador.findOne({ email: cleanEmail })

    if (!ambassador) {
      // Return success even if email not found to prevent user enumeration
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification code has been dispatched.",
      })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    ambassador.resetOtp = otp
    ambassador.resetOtpExpiry = Date.now() + 15 * 60 * 1000 // 15 mins
    await ambassador.save()

    // Send email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === "465",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      })

      const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Campus Ambassador Password Reset</h2>
          <p>Hello ${ambassador.name},</p>
          <p>You requested to reset your HackKro Campus Ambassador password. Your One-Time Code is:</p>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 26px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a; border-radius: 6px;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #64748b; margin-top: 16px;">This OTP is valid for 15 minutes. If you did not make this request, please disregard this email.</p>
        </div>
      `

      await transporter.sendMail({
        from: `"HackKro Support" <${process.env.EMAIL_USER}>`,
        to: cleanEmail,
        subject: "HackKro Campus Ambassador Password Reset Code",
        html,
      })
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a verification code has been dispatched.",
    })
  } catch (error: any) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
