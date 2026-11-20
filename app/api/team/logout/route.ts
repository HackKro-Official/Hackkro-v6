import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    // Clear the team token cookie
    (await
      // Clear the team token cookie
      cookies()).delete("team-token")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging out:", error)
    return NextResponse.json({ success: false, message: "An error occurred while logging out" }, { status: 500 })
  }
}
