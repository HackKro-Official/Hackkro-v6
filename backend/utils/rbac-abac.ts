import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import prisma, { safeParseJson } from "@/lib/db"
import {
  ALLOWED_RETURN_ROUTES,
} from "@/config/taxonomies"
import {
  ROLE_PERMISSION_MATRIX,
  type PermissionKey,
  type RoleKey,
} from "@/config/permissions"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { sha256Hex, constantTimeEqual } from "@/backend/utils/crypto"

export const SESSION_COOKIE_NAME = "hackkro_session"
export const CSRF_COOKIE_NAME = "hackkro_csrf"

export interface AuthContext {
  userId: string
  sessionId: string
  csrfToken: string
  displayName: string
  primaryEmail: string | null
  primaryPhoneE164: string | null
  status: string
  primaryIntent: string
  activeRole: RoleKey
  activeOrganizationId: string | null
  lastReauthAt: Date
  locale: string
  timezone: string
  memberships: Array<{
    organizationId: string
    organizationName: string
    organizationSlug: string
    organizationType: string
    verificationStatus: string
    roleKey: RoleKey
    status: string
    customPermissions: string[]
  }>
}

export function validateReturnToUrl(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/dashboard"
  const trimmed = raw.trim()
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("://") ||
    trimmed.toLowerCase().includes("javascript:")
  ) {
    return "/dashboard"
  }
  const pathOnly = trimmed.split("?")[0].split("#")[0]
  const allowed = ALLOWED_RETURN_ROUTES.some(
    (prefix) => pathOnly === prefix || (prefix !== "/" && pathOnly.startsWith(`${prefix}/`))
  )
  return allowed ? trimmed : "/dashboard"
}

export function getClientMeta(req?: NextRequest) {
  if (!req) {
    return { ipAddress: "127.0.0.1", userAgent: "unknown" }
  }
  const forwarded = req.headers.get("x-forwarded-for")
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1"
  const userAgent = req.headers.get("user-agent") || "unknown"
  return { ipAddress, userAgent }
}

export function verifyCsrfIfCookieAuth(req: NextRequest, sessionCsrfToken: string): void {
  const method = req.method.toUpperCase()
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return

  // Fetch Metadata cross-site check (browser protection)
  const fetchSite = req.headers.get("sec-fetch-site")
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    throw new AppError(ERROR_CODES.CSRF_INVALID, "Cross-site state-changing request rejected.", 403)
  }

  // Bearer token callers aren't ambient cookie credentials
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) return

  // Enforce double-submit CSRF token when client supplies X-CSRF-Token or cookie
  const headerToken = req.headers.get("x-csrf-token")
  const cookieCsrf = req.cookies.get(CSRF_COOKIE_NAME)?.value
  if (headerToken) {
    if (!constantTimeEqual(headerToken, sessionCsrfToken)) {
      throw new AppError(ERROR_CODES.CSRF_INVALID, "Invalid security CSRF token.", 403)
    }
    return
  }

  // If browser has CSRF cookie, check origin/referer matches allowed origin
  const origin = req.headers.get("origin")
  const host = req.headers.get("host")
  if (origin && host) {
    try {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        throw new AppError(ERROR_CODES.CSRF_INVALID, "Origin mismatch on mutation.", 403)
      }
      if (cookieCsrf && !constantTimeEqual(cookieCsrf, sessionCsrfToken)) {
        throw new AppError(ERROR_CODES.CSRF_INVALID, "CSRF cookie mismatch.", 403)
      }
      return
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(ERROR_CODES.CSRF_INVALID, "Invalid request origin.", 403)
    }
  }
}

export async function getAuthContext(req?: NextRequest): Promise<AuthContext | null> {
  let rawToken = ""
  if (req) {
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      rawToken = authHeader.slice(7).trim()
    } else {
      rawToken = req.cookies.get(SESSION_COOKIE_NAME)?.value || ""
    }
  } else {
    try {
      const cookieStore = await cookies()
      rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value || ""
    } catch {
      rawToken = ""
    }
  }

  if (!rawToken) return null

  const tokenHash = sha256Hex(rawToken)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: {
            where: { status: "active" },
            include: { organization: true },
          },
        },
      },
    },
  })

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null
  }

  const user = session.user
  if (!user || ["closed", "anonymized"].includes(user.status)) {
    return null
  }

  // Idle timeout update (best-effort)
  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    prisma.session
      .update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => {})
  }

  const memberships = user.memberships.map((m) => ({
    organizationId: m.organizationId,
    organizationName: m.organization.displayName,
    organizationSlug: m.organization.slug,
    organizationType: m.organization.type,
    verificationStatus: m.organization.verificationStatus,
    roleKey: m.roleKey as RoleKey,
    status: m.status,
    customPermissions: safeParseJson<string[]>(m.customPermissionsJson, []),
  }))

  return {
    userId: user.id,
    sessionId: session.id,
    csrfToken: session.csrfToken,
    displayName: user.displayName,
    primaryEmail: user.primaryEmail,
    primaryPhoneE164: user.primaryPhoneE164,
    status: user.status,
    primaryIntent: user.primaryIntent,
    activeRole: session.activeRole as RoleKey,
    activeOrganizationId: session.activeOrganizationId,
    lastReauthAt: session.lastReauthAt,
    locale: user.locale,
    timezone: user.timezone,
    memberships,
  }
}

export async function requireAuth(req?: NextRequest, options?: { allowRestricted?: boolean }): Promise<AuthContext> {
  const ctx = await getAuthContext(req)
  if (!ctx) {
    throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Authentication required. Please sign in.", 401)
  }
  if (req) {
    verifyCsrfIfCookieAuth(req, ctx.csrfToken)
  }
  if (ctx.status === "suspended") {
    throw new AppError(
      ERROR_CODES.AUTH_ACCOUNT_RESTRICTED,
      "Your account is currently suspended. Contact support for review.",
      403
    )
  }
  if (ctx.status === "restricted" && !options?.allowRestricted) {
    throw new AppError(
      ERROR_CODES.AUTH_ACCOUNT_RESTRICTED,
      "Your account is restricted. You may access appeals and data export.",
      403
    )
  }
  return ctx
}

export function hasPermission(
  ctx: AuthContext,
  permission: PermissionKey,
  organizationId?: string | null
): boolean {
  // Platform-wide admins always hold platform roles regardless of active tenant
  if (ctx.activeRole === "platform_admin") return true

  const activePerms = ROLE_PERMISSION_MATRIX[ctx.activeRole] || []
  if (organizationId) {
    const membership = ctx.memberships.find(
      (m) => m.organizationId === organizationId && m.status === "active"
    )
    if (!membership) {
      // Allow platform roles like support/moderator/admin if activeRole holds the permission
      if (["platform_admin", "security_admin", "moderator", "support_agent"].includes(ctx.activeRole)) {
        return activePerms.includes(permission)
      }
      return false
    }
    const rolePerms = ROLE_PERMISSION_MATRIX[membership.roleKey] || []
    return rolePerms.includes(permission) || membership.customPermissions.includes(permission)
  }

  return activePerms.includes(permission)
}

export function assertPermission(
  ctx: AuthContext,
  permission: PermissionKey,
  organizationId?: string | null
): void {
  if (!hasPermission(ctx, permission, organizationId)) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      `You do not have the required permission (${permission}) for this workspace or resource.`,
      403
    )
  }
}

export function assertRecentReauth(ctx: AuthContext, maxAgeMinutes = 15): void {
  const ageMs = Date.now() - ctx.lastReauthAt.getTime()
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    throw new AppError(
      ERROR_CODES.AUTH_REAUTH_REQUIRED,
      "Please verify your password or OTP again before performing this sensitive action.",
      403
    )
  }
}
