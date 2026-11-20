import { cookies } from "next/headers"
import { verify, JwtPayload } from "jsonwebtoken"
import connectToDatabase from "@/lib/mongoose"
import { TeamMember } from "@/models/team-member"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

export interface AdminAuthPayload {
  email: string
  role: string
  isMainAdmin?: boolean
}

export interface InternAuthPayload {
  id: string
  email: string
  name: string
  role: string
}

/**
 * Verify Admin Authorization from cookies or headers
 */
export async function getAdminUser(): Promise<AdminAuthPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin-token")?.value

    if (!token) return null

    const decoded = verify(token, JWT_SECRET) as any
    if (!decoded || typeof decoded !== "object") return null

    const email = decoded.email?.toLowerCase()
    if (!email) return null

    if (email === "team@hackkro.com") {
      return {
        email: "team@hackkro.com",
        role: "Super Admin",
        isMainAdmin: true,
      }
    }

    await connectToDatabase()
    const member = await TeamMember.findOne({ email, active: true, isAdmin: true })
    if (member) {
      return {
        email: member.email,
        role: member.role || "Admin",
        isMainAdmin: false,
      }
    }

    return null
  } catch (err) {
    return null
  }
}

/**
 * Verify Team / Intern Authorization from cookies or headers
 */
export async function getInternUser(): Promise<InternAuthPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("team-token")?.value

    if (!token) return null

    const decoded = verify(token, JWT_SECRET) as JwtPayload
    if (!decoded || typeof decoded !== "object") return null

    const email = decoded.email?.toLowerCase()
    if (!email) return null

    await connectToDatabase()
    const member = await TeamMember.findOne({ email, active: true })
    if (!member) return null

    return {
      id: member._id.toString(),
      email: member.email,
      name: member.name || member.email.split("@")[0],
      role: member.role || "Member",
    }
  } catch (err) {
    return null
  }
}
