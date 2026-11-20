// app/api/admin/verify-otp/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sign } from "jsonwebtoken";
import { verifyOTP } from "@/lib/otp"; // Correctly imports from the shared file

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key";
const TOKEN_EXPIRY = "7d"; // Token valid for 7 days

// Allowed admin emails
const allowedAdmins = [
  "team@hackkro.com"
  // You can add other admin emails here
]; 

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    // Validate email against the allowed list
    if (!allowedAdmins.includes(email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized admin email address" },
        { status: 403 } // 403 Forbidden is more appropriate
      );
    }

    // Verify OTP from the shared otpStore in lib/otp.ts
    const isValid = verifyOTP(email, otp);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Generate JWT token
    const token = sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    // Set cookie with the corrected syntax
    cookies().set({
      name: "admin-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return NextResponse.json({ success: true, message: "Admin OTP verified successfully" });
  } catch (error) {
    console.error("❌ Error in admin verify-otp API:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
