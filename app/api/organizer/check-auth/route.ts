import { type NextRequest, NextResponse } from "next/server"
import { verifyOrganizerAuth } from "@/lib/organizer-auth-helper"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyOrganizerAuth(req)
    if (!auth.authorized || !auth.organizer) {
      return NextResponse.json({ authenticated: false, message: auth.error || "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      organizer: auth.organizer,
    })
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, message: error.message }, { status: 500 })
  }
}
