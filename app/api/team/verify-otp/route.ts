import { cookies } from "next/headers";
import { sign } from "jsonwebtoken";
import { NextResponse } from "next/server";
import { otpStore } from "@/lib/otp"; // Correct import path
import connectToDatabase from "@/lib/mongoose";
import { TeamMember } from "@/models/team-member";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "your-default-secret";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: "Email and OTP are required" }, { status: 400 });
    }

    const storedOTP = otpStore[email];

    if (!storedOTP) {
      return NextResponse.json({ success: false, message: "Invalid or expired OTP. Please request a new one." }, { status: 400 });
    }

    if (Date.now() > storedOTP.expiry) {
      delete otpStore[email];
      return NextResponse.json({ success: false, message: "OTP has expired. Please request a new OTP." }, { status: 400 });
    }

    if (storedOTP.otp !== otp) {
      return NextResponse.json({ success: false, message: "Invalid OTP. Please try again." }, { status: 400 });
    }

    // OTP is correct, delete it so it can't be reused
    delete otpStore[email];

    await connectToDatabase();

    const teamMember = await TeamMember.findOne({ email, active: true });
    if (!teamMember) {
      return NextResponse.json({ success: false, message: "Email not found or account is inactive" }, { status: 404 });
    }

    teamMember.lastLogin = new Date();
    await teamMember.save();

    const token = sign({ id: teamMember._id, email: teamMember.email, role: teamMember.role, name: teamMember.name }, JWT_SECRET, { expiresIn: "24h" });

    // Corrected the cookie setting syntax
    cookies().set({
      name: "team-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
    });

  } catch (error) {
    console.error("Error in verify-otp API:", error);
    return NextResponse.json({ success: false, message: "An error occurred while verifying OTP" }, { status: 500 });
  }
}