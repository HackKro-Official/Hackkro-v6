import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"

// --- ADD THIS LINE ---
export const dynamic = 'force-dynamic';
// ---------------------

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value

    if (!token) {
      return NextResponse.json({ authenticated: false })
    }

    try {
      const decoded = verify(token, JWT_SECRET)
      const email = typeof decoded !== "string" && "email" in decoded ? (decoded.email as string) : null

      if (email === "team@hackkro.com") {
        return NextResponse.json({
          authenticated: true,
          isMainAdmin: true,
          adminInfo: {
            email: "team@hackkro.com",
            name: "HackKro Admin",
            role: "Super Admin",
          },
        })
      }

      await connectToDatabase()
      const teamMember = await TeamMember.findOne({ email, active: true, isAdmin: true })

      if (teamMember) {
        return NextResponse.json({
          authenticated: true,
          isMainAdmin: false,
          adminInfo: {
            email: teamMember.email,
            name: teamMember.name,
            role: teamMember.role,
            id: teamMember._id,
          },
        })
      }
    } catch (error) {
      // Token verification failed or DB error
      console.error("Auth verification failed:", error)
    }

    return NextResponse.json({ authenticated: false })
  } catch (error) {
    console.error("Error checking authentication:", error)
    return NextResponse.json({ authenticated: false })
  }
}
