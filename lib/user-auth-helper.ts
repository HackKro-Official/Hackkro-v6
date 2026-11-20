import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sign, verify } from "jsonwebtoken"
import connectToDatabase from "@/lib/mongoose"
import { User } from "@/models/user"
import { CampusAmbassador } from "@/models/campus-ambassador"
import { Organizer } from "@/models/organizer"

const JWT_SECRET = process.env.JWT_SECRET || "hackkro-user-secret-key-2026"
export const USER_TOKEN_COOKIE = "hackkro_user_token"
export const USER_ROLE_COOKIE = "hackkro_user_role"

export interface UserTokenPayload {
  userId: string
  email: string
  role: "student" | "ambassador" | "organizer"
  name: string
}

export function createToken(payload: UserTokenPayload, expiresIn: string = "30d"): string {
  return sign(payload, JWT_SECRET, { expiresIn: expiresIn as any })
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET) as UserTokenPayload
    return decoded
  } catch {
    return null
  }
}

export async function getAuthenticatedUser(req?: NextRequest) {
  try {
    let token = ""

    if (req) {
      const authHeader = req.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1]
      }
    }

    if (!token) {
      const cookieStore = await cookies()
      token =
        cookieStore.get(USER_TOKEN_COOKIE)?.value ||
        cookieStore.get("organizer_token")?.value ||
        cookieStore.get("ambassador-token")?.value ||
        ""
    }

    if (!token) return null

    const decoded = verifyToken(token)
    if (!decoded) return null

    await connectToDatabase()

    if (decoded.role === "student" || !decoded.role) {
      const user = await User.findById(decoded.userId).select("-password").lean()
      if (!user) return null
      return {
        ...user,
        _id: user._id.toString(),
        role: "student",
      }
    }

    if (decoded.role === "ambassador") {
      const ambassador = await CampusAmbassador.findById(decoded.userId).select("-password").lean()
      if (!ambassador) return null
      return {
        ...ambassador,
        _id: ambassador._id.toString(),
        role: "ambassador",
      }
    }

    if (decoded.role === "organizer") {
      const organizer = await Organizer.findById(decoded.userId).select("-password").lean()
      if (!organizer) return null
      return {
        ...organizer,
        _id: organizer._id.toString(),
        role: "organizer",
      }
    }

    return null
  } catch (error) {
    console.error("Error retrieving authenticated user:", error)
    return null
  }
}

export function setUserCookies(
  res: NextResponse,
  token: string,
  role: string = "student"
) {
  const isProduction = process.env.NODE_ENV === "production"
  const maxAge = 60 * 60 * 24 * 30 // 30 days

  res.cookies.set(USER_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  })

  res.cookies.set(USER_ROLE_COOKIE, role, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  })

  return res
}

export function clearUserCookies(res: NextResponse) {
  res.cookies.set(USER_TOKEN_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  })

  res.cookies.set(USER_ROLE_COOKIE, "", {
    httpOnly: false,
    path: "/",
    maxAge: 0,
  })

  return res
}
