import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { TeamMember } from "@/models/team-member";
import { generateOTP, sendOTP, saveOTP } from "@/lib/otp"; // Import saveOTP

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();
    const teamMember = await TeamMember.findOne({ email, active: true });

    if (!teamMember) {
      return NextResponse.json({ success: false, message: "Email not found or account is inactive" }, { status: 404 });
    }

    const otp = generateOTP();

    // Use the shared saveOTP function from lib/otp.ts
    saveOTP(email, otp);

    const sent = await sendOTP(email, otp);

    if (sent) {
      return NextResponse.json({
        success: true,
        message: "OTP sent successfully",
      });
    } else {
      return NextResponse.json({ success: false, message: "Failed to send OTP" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in send-otp API:", error);
    return NextResponse.json({ success: false, message: "An error occurred while sending OTP" }, { status: 500 });
  }
}