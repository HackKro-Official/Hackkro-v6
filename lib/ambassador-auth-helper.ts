import "@/lib/polyfill-buffer"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import connectToDatabase from "./mongoose"
import { CampusAmbassador, type ICampusAmbassador } from "@/models/campus-ambassador"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-ambassador-secret-key"

export interface AmbassadorAuthResult {
  authorized: boolean
  ambassador?: {
    id: string
    applicationId: string
    ambassadorId: string
    name: string
    email: string
    mobile: string
    collegeName: string
    universityName: string
    collegeCity: string
    state: string
    courseBranch: string
    currentYearSemester: string
    profilePhoto: string
    status: string
    referralCode: string
    customPosition: string
    team: string
    points: number
  }
  status?: string
  error?: string
}

export async function verifyAmbassadorAuth(request?: Request): Promise<AmbassadorAuthResult> {
  try {
    const cookieStore = await cookies()
    let token = cookieStore.get("ambassador-token")?.value

    if (!token && request) {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return { authorized: false, error: "Authentication required. Please sign in." }
    }

    const decoded: any = verify(token, JWT_SECRET)
    if (!decoded || !decoded.id) {
      return { authorized: false, error: "Invalid ambassador token payload." }
    }

    await connectToDatabase()
    const ambassador = await CampusAmbassador.findById(decoded.id)

    if (!ambassador) {
      return { authorized: false, error: "Ambassador record not found." }
    }

    if (ambassador.status !== "Approved") {
      return {
        authorized: false,
        status: ambassador.status,
        error:
          ambassador.status === "Pending"
            ? "Your Campus Ambassador application is pending admin review."
            : ambassador.status === "Under Review"
            ? "Your application is currently under review by the HackKro Core Team."
            : "Your application was not approved. Dashboard access is restricted to approved ambassadors.",
      }
    }

    if (ambassador.isActive === false) {
      return { authorized: false, error: "Your ambassador account has been deactivated." }
    }

    return {
      authorized: true,
      ambassador: {
        id: String(ambassador._id),
        applicationId: ambassador.applicationId,
        ambassadorId: ambassador.ambassadorId || ambassador.applicationId,
        name: ambassador.name,
        email: ambassador.email,
        mobile: ambassador.mobile,
        collegeName: ambassador.collegeName,
        universityName: ambassador.universityName,
        collegeCity: ambassador.collegeCity,
        state: ambassador.state,
        courseBranch: ambassador.courseBranch,
        currentYearSemester: ambassador.currentYearSemester,
        profilePhoto: ambassador.profilePhoto || "",
        status: ambassador.status,
        referralCode: ambassador.referralCode || "",
        customPosition: ambassador.customPosition || "Campus Ambassador",
        team: ambassador.team || "General Outreach",
        points: ambassador.points || 0,
      },
    }
  } catch (err: any) {
    return { authorized: false, error: err?.message || "Invalid or expired session. Please sign in again." }
  }
}
