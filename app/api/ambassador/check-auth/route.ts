import { type NextRequest, NextResponse } from "next/server"
import { verifyAmbassadorAuth } from "@/lib/ambassador-auth-helper"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAmbassadorAuth(req)
    if (!auth.authorized || !auth.ambassador) {
      return NextResponse.json(
        { authenticated: false, status: auth.status, message: auth.error || "Not authenticated" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      ambassador: auth.ambassador,
    })
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, message: error.message }, { status: 500 })
  }
}
