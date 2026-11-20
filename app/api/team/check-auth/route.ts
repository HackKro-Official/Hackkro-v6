
import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"
import { cookies } from "next/headers"
import { JwtPayload, verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

// This line is the fix:
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("team-token")?.value

    if (!token) {
      return NextResponse.json({ authenticated: false })
    }

    try {
      const decoded = verify(token, JWT_SECRET) as JwtPayload

      // Connect to the database
      await connectToDatabase()

      // Check if team member exists and is active
      const teamMember = await TeamMember.findOne({ email: decoded?.email, active: true })

      if (teamMember) {
        return NextResponse.json({
          authenticated: true,
          teamMember: {
            _id: teamMember._id,
            email: teamMember.email,
            name: teamMember.name,
            role: teamMember.role,
            addedAt: teamMember.addedAt,
            lastLogin: teamMember.lastLogin,
            active: teamMember.active,
          },
        })
      }
    } catch (error) {
      // Token verification failed or DB error
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({ authenticated: false })
  } catch (error) {
    console.error("Error checking authentication:", error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
