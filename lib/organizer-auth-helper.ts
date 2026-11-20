import "@/lib/polyfill-buffer"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import connectToDatabase from "./mongoose"
import { Organizer } from "@/models/organizer"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-organizer-secret-key"

export interface OrganizerAuthResult {
  authorized: boolean
  organizer?: {
    id: string
    email: string
    name: string
    organization: string
  }
  error?: string
}

export async function verifyOrganizerAuth(request?: Request): Promise<OrganizerAuthResult> {
  try {
    const cookieStore = await cookies()
    let token = cookieStore.get("organizer-token")?.value

    if (!token && request) {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return { authorized: false, error: "Organizer authentication required. Please log in." }
    }

    const decoded: any = verify(token, JWT_SECRET)
    if (!decoded || !decoded.email) {
      return { authorized: false, error: "Invalid organizer token payload." }
    }

    await connectToDatabase()
    const organizer = await Organizer.findOne({ email: decoded.email.toLowerCase(), active: true })
    if (!organizer) {
      return { authorized: false, error: "Organizer account not found or suspended." }
    }

    return {
      authorized: true,
      organizer: {
        id: String(organizer._id),
        email: organizer.email,
        name: organizer.name,
        organization: organizer.organization,
      },
    }
  } catch (err: any) {
    return { authorized: false, error: err?.message || "Invalid or expired session. Please log in again." }
  }
}
