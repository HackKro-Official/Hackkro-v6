import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import {
  generateOpaqueToken,
  generateOtpCode,
  hashPassword,
  sha256Hex,
  validatePasswordStrength,
  verifyPassword,
  constantTimeEqual,
} from "@/backend/utils/crypto"
import {
  maskEmail,
  maskPhone,
  normalizeEmail,
  normalizePhoneE164,
  parseLoginIdentifier,
} from "@/backend/utils/phone"
import { enforceRateLimit, clearRateLimit } from "@/backend/utils/rate-limiter"
import {
  AuthContext,
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  assertRecentReauth,
  validateReturnToUrl,
} from "@/backend/utils/rbac-abac"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { createNotification } from "@/backend/modules/notifications.service"
import { sendEmailAdapter, isEmailConfigured } from "@/backend/adapters/email.adapter"
import { sendSmsOtpAdapter, isSmsConfigured } from "@/backend/adapters/sms.adapter"
import { RoleKey } from "@/config/permissions"

const SESSION_SHORT_MS = 24 * 60 * 60 * 1000
const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000

export function resolveDashboardForRole(role: string, intent?: string): string {
  switch (role) {
    case "platform_admin":
    case "security_admin":
    case "moderator":
    case "support_agent":
      return "/admin/dashboard"
    case "organizer_owner":
    case "organizer_manager":
      return "/organizer/dashboard"
    case "recruiter":
    case "recruiter_admin":
      return "/recruiter"
    case "evaluator":
      return "/judge"
    case "college_admin":
      return "/institution"
    case "mentor":
      return "/mentorship"
    case "campus_ambassador":
      return "/campus-ambassador/dashboard"
    default:
      if (intent === "organizer") return "/organizer/dashboard"
      if (intent === "recruiter") return "/recruiter"
      if (intent === "college") return "/institution"
      return "/dashboard"
  }
}

export function attachSessionCookies(
  res: NextResponse,
  rawToken: string,
  csrfToken: string,
  rememberDevice: boolean
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const isSecureCookie = process.env.COOKIE_SECURE === "true" || appUrl.startsWith("https://")
  const maxAge = rememberDevice ? 30 * 24 * 60 * 60 : 24 * 60 * 60

  res.cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/",
    maxAge,
  })
  res.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/",
    maxAge,
  })
  return res
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 })
  res.cookies.set(CSRF_COOKIE_NAME, "", { httpOnly: false, path: "/", maxAge: 0 })
  res.headers.set("Clear-Site-Data", '"cookies", "storage"')
  return res
}

async function createRotatedSession(params: {
  userId: string
  activeRole: string
  activeOrganizationId?: string | null
  rememberDevice: boolean
  ipAddress: string
  userAgent: string
}) {
  const rawToken = generateOpaqueToken(36)
  const tokenHash = sha256Hex(rawToken)
  const csrfToken = generateOpaqueToken(24)
  const expiresAt = new Date(
    Date.now() + (params.rememberDevice ? SESSION_REMEMBER_MS : SESSION_SHORT_MS)
  )

  const deviceLabel = parseDeviceLabel(params.userAgent)

  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash,
      csrfToken,
      activeRole: params.activeRole,
      activeOrganizationId: params.activeOrganizationId ?? null,
      deviceLabel,
      userAgent: params.userAgent.slice(0, 300),
      ipAddress: params.ipAddress,
      rememberDevice: params.rememberDevice,
      expiresAt,
      lastReauthAt: new Date(),
    },
  })

  return { session, rawToken, csrfToken }
}

function parseDeviceLabel(ua: string): string {
  if (!ua) return "Web Browser"
  const browser = ua.includes("Edg")
    ? "Edge"
    : ua.includes("Chrome")
    ? "Chrome"
    : ua.includes("Firefox")
    ? "Firefox"
    : ua.includes("Safari")
    ? "Safari"
    : "Browser"
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Android")
    ? "Android"
    : ua.includes("iPhone") || ua.includes("iPad")
    ? "iOS"
    : ua.includes("Mac")
    ? "macOS"
    : ua.includes("Linux")
    ? "Linux"
    : "Device"
  return `${browser} on ${os}`
}

async function resolveDefaultWorkspace(userId: string, primaryIntent: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId, status: "active" },
    orderBy: { createdAt: "asc" },
  })
  if (memberships.length > 0) {
    return {
      activeRole: memberships[0].roleKey,
      activeOrganizationId: memberships[0].organizationId,
    }
  }
  const ambassador = await prisma.ambassadorProfile.findUnique({ where: { userId } })
  if (ambassador && ambassador.status === "approved" && primaryIntent === "ambassador") {
    return { activeRole: "campus_ambassador", activeOrganizationId: null }
  }
  const mentor = await prisma.mentorProfile.findUnique({ where: { userId } })
  if (mentor && primaryIntent === "mentor") {
    return { activeRole: "mentor", activeOrganizationId: null }
  }
  return { activeRole: "participant", activeOrganizationId: null }
}

export async function identifyStep(
  rawIdentifier: string,
  countryDialCode: string,
  ipAddress: string
) {
  enforceRateLimit({ key: `identify:${ipAddress}`, limit: 40, windowMs: 10 * 60 * 1000 })
  const parsed = parseLoginIdentifier(rawIdentifier, countryDialCode)

  // Anti-enumeration: always return the exact same neutral response structure
  return {
    identifierType: parsed.kind,
    maskedDestination: parsed.masked,
    availableMethods: ["password", "otp"],
    message: "If an account matches these details, we'll send the next step.",
  }
}

export async function loginWithPassword(params: {
  identifier: string
  countryDialCode: string
  password: string
  rememberDevice: boolean
  returnTo?: string
  ipAddress: string
  userAgent: string
}) {
  const parsed = parseLoginIdentifier(params.identifier, params.countryDialCode)
  enforceRateLimit({
    key: `pwd_login:ip:${params.ipAddress}`,
    limit: 25,
    windowMs: 15 * 60 * 1000,
    blockMs: 120 * 1000,
  })
  enforceRateLimit({
    key: `pwd_login:id:${sha256Hex(parsed.normalized)}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
    blockMs: 90 * 1000,
  })

  const user = await prisma.user.findFirst({
    where:
      parsed.kind === "email"
        ? { primaryEmail: parsed.normalized }
        : { primaryPhoneE164: parsed.normalized },
    include: { passwordCredential: true },
  })

  // Equalized failure response: never disclose whether user exists
  if (!user || !user.passwordCredential) {
    throw new AppError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Invalid credentials. Please verify your email/phone and password.",
      401
    )
  }

  if (["suspended", "closed", "anonymized"].includes(user.status)) {
    throw new AppError(
      ERROR_CODES.AUTH_ACCOUNT_RESTRICTED,
      "This account is restricted or suspended. Contact support for assistance.",
      403
    )
  }

  const ok = verifyPassword(params.password, user.passwordCredential.passwordHash)
  if (!ok) {
    await recordAuditEvent({
      actorId: user.id,
      actorRole: "anonymous",
      action: "auth.login_failed",
      resourceType: "user",
      resourceId: user.id,
      ipRiskMeta: { ip: params.ipAddress },
    })
    throw new AppError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Invalid credentials. Please verify your email/phone and password.",
      401
    )
  }

  // Transparently upgrade legacy PBKDF2 hash to scrypt_v1
  if (!user.passwordCredential.passwordHash.startsWith("scrypt$")) {
    await prisma.passwordCredential.update({
      where: { userId: user.id },
      data: {
        passwordHash: hashPassword(params.password),
        hashVersion: "scrypt_v1",
        changedAt: new Date(),
      },
    })
  }

  clearRateLimit(`pwd_login:id:${sha256Hex(parsed.normalized)}`)

  const workspace = await resolveDefaultWorkspace(user.id, user.primaryIntent)
  const { session, rawToken, csrfToken } = await createRotatedSession({
    userId: user.id,
    activeRole: workspace.activeRole,
    activeOrganizationId: workspace.activeOrganizationId,
    rememberDevice: params.rememberDevice,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  await recordAuditEvent({
    actorId: user.id,
    actorRole: workspace.activeRole,
    tenantId: workspace.activeOrganizationId,
    action: "auth.login_password",
    resourceType: "session",
    resourceId: session.id,
    ipRiskMeta: { ip: params.ipAddress, device: session.deviceLabel },
  })

  await createNotification({
    userId: user.id,
    category: "security",
    title: "New sign-in detected",
    body: `Signed in from ${session.deviceLabel} (${params.ipAddress}). If this wasn't you, revoke your sessions immediately.`,
    actionUrl: "/settings/security",
  })

  const safeReturnTo = params.returnTo
    ? validateReturnToUrl(params.returnTo)
    : resolveDashboardForRole(workspace.activeRole, user.primaryIntent)

  return {
    user: sanitizePublicUser(user, workspace.activeRole, workspace.activeOrganizationId),
    sessionId: session.id,
    rawToken,
    csrfToken,
    destination: safeReturnTo,
  }
}

export async function requestOtpChallenge(params: {
  identifier: string
  countryDialCode: string
  purpose: "login" | "signup" | "verify_contact" | "link_identity" | "step_up"
  ipAddress: string
}) {
  const parsed = parseLoginIdentifier(params.identifier, params.countryDialCode)
  const destHash = sha256Hex(parsed.normalized)

  enforceRateLimit({
    key: `otp_req:ip:${params.ipAddress}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
    blockMs: 60 * 1000,
  })
  enforceRateLimit({
    key: `otp_req:dest:${destHash}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
    blockMs: 60 * 1000,
  })

  const user = await prisma.user.findFirst({
    where:
      parsed.kind === "email"
        ? { primaryEmail: parsed.normalized }
        : { primaryPhoneE164: parsed.normalized },
    select: { id: true, status: true },
  })

  // Supersede previous active OTP challenges for this destination & purpose
  await prisma.otpChallenge.updateMany({
    where: {
      destinationHash: destHash,
      purpose: params.purpose,
      consumedAt: null,
      supersededAt: null,
    },
    data: { supersededAt: new Date() },
  })

  const code = generateOtpCode()
  const codeHash = sha256Hex(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  let deliveryStatus = "sent"
  let sandboxPreview: string | undefined

  if (parsed.kind === "email") {
    const emailRes = await sendEmailAdapter({
      to: parsed.normalized,
      subject: "Your HackKro one-time verification code",
      html: `<p>Your HackKro one-time verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
      text: `Your HackKro one-time verification code is ${code}. It expires in 10 minutes.`,
      category: "security",
    })
    deliveryStatus = emailRes.delivered ? "sent" : "failed"
    if (process.env.APP_ENV === "development" && !isEmailConfigured()) {
      sandboxPreview = code
    }
  } else {
    const smsRes = await sendSmsOtpAdapter(parsed.normalized, code)
    deliveryStatus = smsRes.delivered ? "sent" : "failed"
    if (process.env.APP_ENV === "development" && !isSmsConfigured()) {
      sandboxPreview = code
    }
  }

  const challenge = await prisma.otpChallenge.create({
    data: {
      userId: user?.id ?? null,
      destinationHash: destHash,
      destinationMasked: parsed.masked,
      channel: parsed.kind === "email" ? "email" : "sms",
      codeHash,
      purpose: params.purpose,
      expiresAt,
      deliveryStatus,
      ipAddress: params.ipAddress,
    },
  })

  return {
    challengeId: challenge.id,
    maskedDestination: parsed.masked,
    channel: challenge.channel,
    expiresAt: challenge.expiresAt.toISOString(),
    message: "If an account matches these details, we'll send the one-time code.",
    ...(sandboxPreview ? { devSandboxCode: sandboxPreview } : {}),
  }
}

export async function verifyOtpChallenge(params: {
  challengeId: string
  code: string
  rememberDevice: boolean
  returnTo?: string
  ipAddress: string
  userAgent: string
}) {
  enforceRateLimit({
    key: `otp_verify:${params.ipAddress}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  })

  const challenge = await prisma.otpChallenge.findUnique({
    where: { id: params.challengeId },
  })

  if (!challenge) {
    throw new AppError(ERROR_CODES.AUTH_CHALLENGE_INVALID, "Invalid verification challenge.", 400)
  }
  if (challenge.consumedAt || challenge.supersededAt) {
    throw new AppError(
      ERROR_CODES.AUTH_CHALLENGE_EXPIRED,
      "This one-time code has already been used or replaced. Request a new code.",
      400
    )
  }
  if (challenge.expiresAt < new Date()) {
    throw new AppError(
      ERROR_CODES.AUTH_CHALLENGE_EXPIRED,
      "This one-time code has expired. Please request a fresh code.",
      400
    )
  }
  if (challenge.attempts >= challenge.maxAttempts) {
    throw new AppError(
      ERROR_CODES.AUTH_RATE_LIMITED,
      "Maximum verification attempts reached. Request a new code.",
      429
    )
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { attempts: { increment: 1 } },
  })

  const submittedHash = sha256Hex(params.code.trim())
  if (!constantTimeEqual(submittedHash, challenge.codeHash)) {
    throw new AppError(
      ERROR_CODES.AUTH_CHALLENGE_INVALID,
      "Incorrect one-time code. Please try again.",
      400
    )
  }

  // Mark consumed atomically so replay is impossible
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  })

  if (!challenge.userId) {
    if (challenge.purpose === "signup" || challenge.purpose === "verify_contact") {
      return {
        verified: true,
        requiresSignup: true,
        challengeId: challenge.id,
        destinationMasked: challenge.destinationMasked,
      }
    }
    throw new AppError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "No active account could be authenticated with this code. Please create an account.",
      401
    )
  }

  const user = await prisma.user.findUnique({ where: { id: challenge.userId } })
  if (!user || ["suspended", "closed", "anonymized"].includes(user.status)) {
    throw new AppError(ERROR_CODES.AUTH_ACCOUNT_RESTRICTED, "Account is restricted or unavailable.", 403)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: challenge.channel === "email" && !user.emailVerifiedAt ? new Date() : user.emailVerifiedAt,
      phoneVerifiedAt: challenge.channel === "sms" && !user.phoneVerifiedAt ? new Date() : user.phoneVerifiedAt,
      lastLoginAt: new Date(),
    },
  })

  const workspace = await resolveDefaultWorkspace(user.id, user.primaryIntent)
  const { session, rawToken, csrfToken } = await createRotatedSession({
    userId: user.id,
    activeRole: workspace.activeRole,
    activeOrganizationId: workspace.activeOrganizationId,
    rememberDevice: params.rememberDevice,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })

  await recordAuditEvent({
    actorId: user.id,
    actorRole: workspace.activeRole,
    tenantId: workspace.activeOrganizationId,
    action: "auth.login_otp",
    resourceType: "session",
    resourceId: session.id,
    ipRiskMeta: { ip: params.ipAddress, channel: challenge.channel },
  })

  const safeReturnTo = params.returnTo
    ? validateReturnToUrl(params.returnTo)
    : resolveDashboardForRole(workspace.activeRole, user.primaryIntent)

  return {
    verified: true,
    requiresSignup: false,
    user: sanitizePublicUser(user, workspace.activeRole, workspace.activeOrganizationId),
    sessionId: session.id,
    rawToken,
    csrfToken,
    destination: safeReturnTo,
  }
}

export async function registerUserAccount(params: {
  displayName: string
  email?: string
  phone?: string
  countryDialCode: string
  password: string
  country: string
  dateOfBirth?: string
  primaryIntent: "student" | "recruiter" | "organizer" | "mentor" | "college" | "ambassador"
  organizationName?: string
  organizationDomain?: string
  termsVersion: string
  marketingConsent: boolean
  locale: string
  referralCode?: string
  returnTo?: string
  ipAddress: string
  userAgent: string
}) {
  if (!params.email && !params.phone) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Provide an email address or mobile number.", 400)
  }

  validatePasswordStrength(params.password)

  const cleanEmail = params.email ? normalizeEmail(params.email) : null
  const cleanPhone = params.phone ? normalizePhoneE164(params.phone, params.countryDialCode) : null

  // Optional age gate check (minimum age 13)
  if (params.dateOfBirth) {
    const dob = new Date(params.dateOfBirth)
    if (!Number.isNaN(dob.getTime())) {
      const ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (ageYears < 13) {
        throw new AppError(
          ERROR_CODES.VALIDATION_FAILED,
          "You must meet the minimum age requirement (13+) to create an account.",
          400
        )
      }
    }
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        ...(cleanEmail ? [{ primaryEmail: cleanEmail }] : []),
        ...(cleanPhone ? [{ primaryPhoneE164: cleanPhone }] : []),
      ],
    },
  })

  if (existing) {
    throw new AppError(
      ERROR_CODES.CONFLICT,
      "An account with this email or phone already exists. Please sign in instead.",
      409
    )
  }

  const passwordHash = hashPassword(params.password)
  const usernameBase = params.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 14) || "user"
  const username = `${usernameBase}${Math.floor(1000 + Math.random() * 9000)}`

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        displayName: params.displayName.trim(),
        primaryEmail: cleanEmail,
        emailVerifiedAt: cleanEmail ? new Date() : null,
        primaryPhoneE164: cleanPhone,
        phoneVerifiedAt: cleanPhone ? new Date() : null,
        country: params.country,
        dateOfBirth: params.dateOfBirth || null,
        locale: params.locale || "en",
        primaryIntent: params.primaryIntent,
        onboardingCompleted: false,
        status: "active",
        points: 100,
      },
    })

    await tx.passwordCredential.create({
      data: {
        userId: user.id,
        passwordHash,
        hashVersion: "scrypt_v1",
      },
    })

    await tx.profile.create({
      data: {
        userId: user.id,
        headline: `${params.displayName.trim()} on HackKro`,
      },
    })

    await tx.privacySettings.create({
      data: {
        userId: user.id,
        marketingOptIn: params.marketingConsent,
      },
    })

    await tx.consentRecord.createMany({
      data: [
        {
          userId: user.id,
          consentType: "terms",
          version: params.termsVersion,
          locale: params.locale,
          granted: true,
          ipAddress: params.ipAddress,
        },
        {
          userId: user.id,
          consentType: "privacy",
          version: params.termsVersion,
          locale: params.locale,
          granted: true,
          ipAddress: params.ipAddress,
        },
        {
          userId: user.id,
          consentType: "marketing",
          version: params.termsVersion,
          locale: params.locale,
          granted: params.marketingConsent,
          ipAddress: params.ipAddress,
        },
      ],
    })

    await tx.personalTask.create({
      data: {
        userId: user.id,
        title: "Complete your HackKro profile & skills",
        description: "Add education, skills, and a resume so you can 1-click apply to opportunities.",
        sourceType: "profile",
        sourceId: user.id,
        actionUrl: "/profile",
        priority: "high",
      },
    })

    let activeRole = "participant"
    let activeOrganizationId: string | null = null

    if (
      ["organizer", "recruiter", "college"].includes(params.primaryIntent) &&
      params.organizationName
    ) {
      const slugBase = params.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      const org = await tx.organization.create({
        data: {
          slug: `${slugBase || "org"}-${Math.floor(100 + Math.random() * 900)}`,
          legalName: params.organizationName.trim(),
          displayName: params.organizationName.trim(),
          type:
            params.primaryIntent === "college"
              ? "college"
              : params.primaryIntent === "recruiter"
              ? "company"
              : "club",
          domain: params.organizationDomain || "",
          officialEmail: cleanEmail || `contact@${slugBase || "org"}.local`,
          verificationStatus: "pending_review",
          createdBy: user.id,
        },
      })
      const roleKey =
        params.primaryIntent === "recruiter"
          ? "recruiter_admin"
          : params.primaryIntent === "college"
          ? "college_admin"
          : "organizer_owner"

      await tx.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          roleKey,
          status: "active",
          acceptedAt: new Date(),
        },
      })

      if (params.primaryIntent === "college") {
        await tx.institution.create({
          data: {
            organizationId: org.id,
            placementCellEmail: cleanEmail || "",
          },
        })
      }

      activeRole = roleKey
      activeOrganizationId = org.id
    } else if (params.primaryIntent === "mentor") {
      await tx.mentorProfile.create({
        data: {
          userId: user.id,
          headline: `${params.displayName.trim()} — Mentor`,
          bio: "Ready to guide students and builders on HackKro.",
          expertiseJson: JSON.stringify(["Career Guidance", "System Design"]),
          sessionTypesJson: JSON.stringify([{ name: "1:1 Portfolio & Career Review", durationMin: 30, price: 0 }]),
        },
      })
      activeRole = "mentor"
    } else if (params.primaryIntent === "ambassador") {
      await tx.ambassadorProfile.create({
        data: {
          userId: user.id,
          institutionName: params.organizationName || "Partner Campus",
          referralCode: `HK-${username.slice(0, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          status: "pending",
        },
      })
    }

    // Track attribution if signed up via referral code
    if (params.referralCode) {
      const ambassador = await tx.ambassadorProfile.findUnique({
        where: { referralCode: params.referralCode.trim().toUpperCase() },
      })
      if (ambassador && ambassador.userId !== user.id) {
        await tx.referralEvent.create({
          data: {
            ambassadorId: ambassador.id,
            referralCode: ambassador.referralCode,
            referredUserId: user.id,
            status: "registered",
            fingerprintHash: sha256Hex(params.ipAddress),
          },
        })
      }
    }

    return { user, activeRole, activeOrganizationId }
  })

  const { session, rawToken, csrfToken } = await createRotatedSession({
    userId: created.user.id,
    activeRole: created.activeRole,
    activeOrganizationId: created.activeOrganizationId,
    rememberDevice: true,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })

  await recordAuditEvent({
    actorId: created.user.id,
    actorRole: created.activeRole,
    tenantId: created.activeOrganizationId,
    action: "auth.register",
    resourceType: "user",
    resourceId: created.user.id,
    ipRiskMeta: { ip: params.ipAddress, intent: params.primaryIntent },
  })

  const destination = params.returnTo
    ? validateReturnToUrl(params.returnTo)
    : "/onboarding"

  return {
    user: sanitizePublicUser(created.user, created.activeRole, created.activeOrganizationId),
    sessionId: session.id,
    rawToken,
    csrfToken,
    destination,
  }
}

export async function forgotPasswordRequest(
  rawIdentifier: string,
  countryDialCode: string,
  ipAddress: string
) {
  enforceRateLimit({ key: `pwd_forgot:${ipAddress}`, limit: 10, windowMs: 15 * 60 * 1000 })
  const parsed = parseLoginIdentifier(rawIdentifier, countryDialCode)

  const user = await prisma.user.findFirst({
    where:
      parsed.kind === "email"
        ? { primaryEmail: parsed.normalized }
        : { primaryPhoneE164: parsed.normalized },
  })

  let devResetToken: string | undefined

  if (user && user.primaryEmail) {
    const rawResetToken = generateOpaqueToken(32)
    const tokenHash = sha256Hex(rawResetToken)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(rawResetToken)}`

    await sendEmailAdapter({
      to: user.primaryEmail,
      subject: "Reset your HackKro password",
      html: `<p>Use this single-use link to reset your password (valid for 30 minutes):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      text: `Reset your HackKro password: ${resetLink}`,
      category: "security",
    })

    if (process.env.APP_ENV === "development" && !isEmailConfigured()) {
      devResetToken = rawResetToken
    }
  }

  return {
    message: "If an account matches these details, a single-use password reset link has been sent.",
    ...(devResetToken ? { devSandboxResetToken: devResetToken } : {}),
  }
}

export async function resetPasswordWithToken(params: {
  token: string
  newPassword: string
  ipAddress: string
}) {
  validatePasswordStrength(params.newPassword)
  const tokenHash = sha256Hex(params.token)

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  })

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw new AppError(
      ERROR_CODES.AUTH_CHALLENGE_EXPIRED,
      "This password reset link is invalid or has expired.",
      400
    )
  }

  const newHash = hashPassword(params.newPassword)

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    })

    await tx.passwordCredential.upsert({
      where: { userId: resetRecord.userId },
      update: { passwordHash: newHash, hashVersion: "scrypt_v1", changedAt: new Date() },
      create: { userId: resetRecord.userId, passwordHash: newHash, hashVersion: "scrypt_v1" },
    })

    // Revoke all active sessions on password reset
    await tx.session.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  })

  await recordAuditEvent({
    actorId: resetRecord.userId,
    actorRole: "participant",
    action: "auth.password_reset",
    resourceType: "user",
    resourceId: resetRecord.userId,
    ipRiskMeta: { ip: params.ipAddress },
  })

  await createNotification({
    userId: resetRecord.userId,
    category: "security",
    title: "Your password was reset",
    body: "Your HackKro password was reset and all previous sessions were signed out.",
    actionUrl: "/settings/security",
    sendEmail: true,
  })

  return { message: "Password reset successful. Please sign in with your new passphrase." }
}

export async function switchWorkspaceContext(
  ctx: AuthContext,
  roleKey: string,
  organizationId?: string | null
) {
  let authorized = false

  if (roleKey === "participant") {
    authorized = true
  } else if (roleKey === "mentor") {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: ctx.userId } })
    authorized = Boolean(mentor)
  } else if (roleKey === "campus_ambassador") {
    const amb = await prisma.ambassadorProfile.findUnique({ where: { userId: ctx.userId } })
    authorized = Boolean(amb)
  } else if (organizationId) {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId: ctx.userId,
        organizationId,
        roleKey,
        status: "active",
      },
    })
    authorized = Boolean(membership)
  } else {
    // Platform-scoped roles must exist in an active platform org membership
    const membership = await prisma.organizationMembership.findFirst({
      where: { userId: ctx.userId, roleKey, status: "active" },
    })
    authorized = Boolean(membership)
  }

  if (!authorized) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      "You are not authorized to switch to the requested workspace or role.",
      403
    )
  }

  await prisma.session.update({
    where: { id: ctx.sessionId },
    data: {
      activeRole: roleKey,
      activeOrganizationId: organizationId ?? null,
    },
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: roleKey as RoleKey,
    tenantId: organizationId ?? null,
    action: "auth.switch_workspace",
    resourceType: "session",
    resourceId: ctx.sessionId,
    afterSummary: { activeRole: roleKey, organizationId: organizationId ?? null },
  })

  return {
    activeRole: roleKey,
    activeOrganizationId: organizationId ?? null,
    destination: resolveDashboardForRole(roleKey),
  }
}

export async function linkExternalIdentity(
  ctx: AuthContext,
  params: {
    provider: string
    providerSubject: string
    providerEmail: string
    providerEmailVerified: boolean
    proofPassword?: string
  }
) {
  if (!params.providerEmailVerified) {
    throw new AppError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Provider email must be verified before linking.",
      400
    )
  }

  const cred = await prisma.passwordCredential.findUnique({ where: { userId: ctx.userId } })
  if (cred && params.proofPassword) {
    if (!verifyPassword(params.proofPassword, cred.passwordHash)) {
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Password verification failed.", 401)
    }
  } else {
    assertRecentReauth(ctx, 15)
  }

  const existingSubject = await prisma.authIdentity.findUnique({
    where: {
      provider_providerSubject: {
        provider: params.provider,
        providerSubject: params.providerSubject,
      },
    },
  })

  if (existingSubject && existingSubject.userId !== ctx.userId) {
    throw new AppError(
      ERROR_CODES.CONFLICT,
      "This external identity is already linked to another HackKro account.",
      409
    )
  }

  const identity = await prisma.authIdentity.upsert({
    where: {
      provider_providerSubject: {
        provider: params.provider,
        providerSubject: params.providerSubject,
      },
    },
    update: {
      providerEmail: normalizeEmail(params.providerEmail),
      providerEmailVerified: true,
    },
    create: {
      userId: ctx.userId,
      provider: params.provider,
      providerSubject: params.providerSubject,
      providerEmail: normalizeEmail(params.providerEmail),
      providerEmailVerified: true,
    },
  })

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.activeRole,
    action: "auth.identity_linked",
    resourceType: "auth_identity",
    resourceId: identity.id,
    afterSummary: { provider: params.provider },
  })

  return identity
}

export async function unlinkExternalIdentity(ctx: AuthContext, identityId: string) {
  assertRecentReauth(ctx, 15)
  const identity = await prisma.authIdentity.findUnique({ where: { id: identityId } })
  if (!identity || identity.userId !== ctx.userId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Linked identity not found.", 404)
  }

  const passwordCred = await prisma.passwordCredential.findUnique({ where: { userId: ctx.userId } })
  const count = await prisma.authIdentity.count({ where: { userId: ctx.userId } })
  if (!passwordCred && count <= 1) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "Set a password before unlinking your only sign-in provider.",
      400
    )
  }

  await prisma.authIdentity.delete({ where: { id: identityId } })
  return { unlinked: true }
}

export function sanitizePublicUser(
  user: {
    id: string
    username: string | null
    displayName: string
    primaryEmail: string | null
    primaryPhoneE164: string | null
    avatarUrl: string
    bio: string
    locale: string
    timezone: string
    country: string
    status: string
    primaryIntent: string
    onboardingCompleted: boolean
    points: number
  },
  activeRole: string,
  activeOrganizationId: string | null
) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    primaryEmail: user.primaryEmail,
    maskedEmail: user.primaryEmail ? maskEmail(user.primaryEmail) : null,
    primaryPhoneE164: user.primaryPhoneE164,
    maskedPhone: user.primaryPhoneE164 ? maskPhone(user.primaryPhoneE164) : null,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    locale: user.locale,
    timezone: user.timezone,
    country: user.country,
    status: user.status,
    primaryIntent: user.primaryIntent,
    onboardingCompleted: user.onboardingCompleted,
    points: user.points,
    activeRole,
    activeOrganizationId,
  }
}
