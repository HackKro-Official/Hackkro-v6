import "@/lib/polyfill-buffer"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import connectToDatabase from "./mongoose"
import { TeamMember } from "@/models/team-member"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-admin-secret-key"

export async function verifyAdminAuth(request?: Request): Promise<{ authorized: boolean; email?: string; error?: string }> {
  try {
    const cookieStore = await cookies()
    let token = cookieStore.get("admin-token")?.value

    if (!token && request) {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return { authorized: false, error: "Authentication required. Admin token missing." }
    }

    const decoded = verify(token, JWT_SECRET)
    const email = typeof decoded !== "string" && "email" in decoded ? (decoded.email as string) : null

    if (!email) {
      return { authorized: false, error: "Invalid token payload." }
    }

    if (email === "team@hackkro.com") {
      return { authorized: true, email }
    }

    await connectToDatabase()
    const member = await TeamMember.findOne({ email, active: true, isAdmin: true })
    if (member) {
      return { authorized: true, email }
    }

    return { authorized: false, error: "Unauthorized. Admin permissions required." }
  } catch (err: any) {
    return { authorized: false, error: err?.message || "Invalid or expired admin token." }
  }
}
