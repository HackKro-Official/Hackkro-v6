import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import {
  forgotPasswordRequest,
  identifyStep,
  loginWithPassword,
  registerUserAccount,
  requestOtpChallenge,
  resetPasswordWithToken,
  verifyOtpChallenge,
} from "@/backend/modules/auth.service"
import { hashPassword, sha256Hex, validatePasswordStrength, verifyPassword } from "@/backend/utils/crypto"
import { normalizeEmail, normalizePhoneE164 } from "@/backend/utils/phone"
import { validateReturnToUrl, verifyCsrfIfCookieAuth } from "@/backend/utils/rbac-abac"

describe("Identity Matrix & Authentication Security", () => {
  it("normalizes email case & preserves valid + subaddressing", () => {
    expect(normalizeEmail("  Aarav+Hack2026@Gmail.COM ")).toBe("aarav+hack2026@gmail.com")
    expect(() => normalizeEmail("invalid-email")).toThrow()
  })

  it("normalizes national & international phone numbers to E.164 cleanly", () => {
    expect(normalizePhoneE164("98765 43210", "+91")).toBe("+919876543210")
    expect(normalizePhoneE164("+1 (415) 555-2671", "+91")).toBe("+14155552671")
    expect(() => normalizePhoneE164("123", "+91")).toThrow()
  })

  it("blocks short and breached passwords and hashes securely with scrypt", () => {
    expect(() => validatePasswordStrength("1234567")).toThrow()
    expect(() => validatePasswordStrength("admin123")).toThrow()
    const hash = hashPassword("UniqueHackKro#2026")
    expect(hash.startsWith("scrypt$")).toBe(true)
    expect(verifyPassword("UniqueHackKro#2026", hash)).toBe(true)
    expect(verifyPassword("WrongPass!", hash)).toBe(false)
  })

  it("blocks open redirect attempts via returnTo allowlist", () => {
    expect(validateReturnToUrl("https://evil.example/phish")).toBe("/dashboard")
    expect(validateReturnToUrl("//evil.example")).toBe("/dashboard")
    expect(validateReturnToUrl("javascript:alert(1)")).toBe("/dashboard")
    expect(validateReturnToUrl("/discover?q=ai")).toBe("/discover?q=ai")
    expect(validateReturnToUrl("/recruiter")).toBe("/recruiter")
  })

  it("enforces anti-enumeration on identify and forgot-password", async () => {
    const existing = await identifyStep("student@hackkro.local", "+91", "10.0.0.1")
    const missing = await identifyStep("nonexistent-user-xyz@example.com", "+91", "10.0.0.2")
    expect(existing.message).toBe(missing.message)
    expect(existing.availableMethods).toEqual(missing.availableMethods)

    const fpExisting = await forgotPasswordRequest("student@hackkro.local", "+91", "10.0.0.3")
    const fpMissing = await forgotPasswordRequest("nonexistent-user-xyz@example.com", "+91", "10.0.0.4")
    expect(fpExisting.message).toBe(fpMissing.message)
  })

  it("enforces OTP single-use verification & invalid code attempt tracking", async () => {
    const reqRes = await requestOtpChallenge({
      identifier: "student@hackkro.local",
      countryDialCode: "+91",
      purpose: "login",
      ipAddress: "10.0.0.5",
    })
    expect(reqRes.challengeId).toBeTruthy()
    expect(reqRes.devSandboxCode).toMatch(/^\d{6}$/)

    await expect(
      verifyOtpChallenge({
        challengeId: reqRes.challengeId,
        code: "000000",
        rememberDevice: false,
        ipAddress: "10.0.0.5",
        userAgent: "Vitest",
      })
    ).rejects.toThrow()

    const verified = await verifyOtpChallenge({
      challengeId: reqRes.challengeId,
      code: reqRes.devSandboxCode!,
      rememberDevice: false,
      ipAddress: "10.0.0.5",
      userAgent: "Vitest",
    })
    expect(verified.rawToken).toBeTruthy()
    expect(verified.csrfToken).toBeTruthy()

    // Replaying the same OTP code must be rejected immediately
    await expect(
      verifyOtpChallenge({
        challengeId: reqRes.challengeId,
        code: reqRes.devSandboxCode!,
        rememberDevice: false,
        ipAddress: "10.0.0.5",
        userAgent: "Vitest",
      })
    ).rejects.toThrow()
  })

  it("registers user, revokes sessions on password reset, and stores only hashed session tokens", async () => {
    const uniqueEmail = `test-reg-${Date.now()}@example.com`
    const reg = await registerUserAccount({
      displayName: "Vitest Builder",
      email: uniqueEmail,
      countryDialCode: "+91",
      password: "StrongBuilder!2026",
      country: "IN",
      primaryIntent: "student",
      termsVersion: "2026.1",
      marketingConsent: false,
      locale: "en",
      ipAddress: "10.0.0.6",
      userAgent: "Vitest",
    })

    const sessionInDb = await prisma.session.findUnique({ where: { id: reg.sessionId } })
    expect(sessionInDb).toBeTruthy()
    // Ensure raw session token is NOT stored verbatim in DB
    expect(sessionInDb!.tokenHash).toBe(sha256Hex(reg.rawToken))
    expect(sessionInDb!.tokenHash).not.toBe(reg.rawToken)

    const forgot = await forgotPasswordRequest(uniqueEmail, "+91", "10.0.0.6")
    expect(forgot.devSandboxResetToken).toBeTruthy()

    await resetPasswordWithToken({
      token: forgot.devSandboxResetToken!,
      newPassword: "RotatedBuilder!2026",
      ipAddress: "10.0.0.6",
    })

    const revokedSession = await prisma.session.findUnique({ where: { id: reg.sessionId } })
    expect(revokedSession!.revokedAt).not.toBeNull()

    // Old password rejected, new password succeeds
    await expect(
      loginWithPassword({
        identifier: uniqueEmail,
        countryDialCode: "+91",
        password: "StrongBuilder!2026",
        rememberDevice: false,
        ipAddress: "10.0.0.7",
        userAgent: "Vitest",
      })
    ).rejects.toThrow()

    const relogin = await loginWithPassword({
      identifier: uniqueEmail,
      countryDialCode: "+91",
      password: "RotatedBuilder!2026",
      rememberDevice: false,
      ipAddress: "10.0.0.7",
      userAgent: "Vitest",
    })
    expect(relogin.user.primaryEmail).toBe(uniqueEmail)
  })

  it("rejects state-changing requests with cross-site Sec-Fetch-Site or mismatched X-CSRF-Token", () => {
    const crossSiteReq = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site", host: "localhost:3000" },
    })
    expect(() => verifyCsrfIfCookieAuth(crossSiteReq, "expected-csrf")).toThrow()

    const badCsrfReq = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin", "x-csrf-token": "wrong-token" },
    })
    expect(() => verifyCsrfIfCookieAuth(badCsrfReq, "expected-csrf")).toThrow()
  })
})
