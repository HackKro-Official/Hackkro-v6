import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.set({
      name: "ambassador-token",
      value: "",
      maxAge: 0,
      path: "/",
    })

    return NextResponse.json({ success: true, message: "Logged out successfully" })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
