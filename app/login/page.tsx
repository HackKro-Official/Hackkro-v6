"use client"

import React, { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Lock, ArrowRight, ShieldCheck, Smartphone, Mail, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserAuth } from "@/lib/user-auth-context"
import { useI18n } from "@/lib/i18n-context"
import { apiFetch, setInMemoryCsrfToken } from "@/lib/api-client"
import { COUNTRY_DIALING_CODES } from "@/config/taxonomies"

type LoginStep = "identify" | "choose_method" | "otp_verify"

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || ""
  const oauthError = searchParams.get("error") || ""

  const { isLoggedIn, providers, refreshUser } = useUserAuth()
  const { t } = useI18n()

  const [step, setStep] = useState<LoginStep>("identify")
  const [identifier, setIdentifier] = useState("")
  const [countryDialCode, setCountryDialCode] = useState("+91")
  const [identifierType, setIdentifierType] = useState<"email" | "phone">("email")
  const [maskedDestination, setMaskedDestination] = useState("")

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)

  const [challengeId, setChallengeId] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [resendSeconds, setResendSeconds] = useState(0)
  const [devSandboxCode, setDevSandboxCode] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const otpInputRef = useRef<HTMLInputElement | null>(null)
  const otpFormRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    if (oauthError === "oauth_cancelled") {
      setErrorMsg("Google sign-in was cancelled. You can try again or use your email/phone.")
    } else if (oauthError === "link_requires_password_auth") {
      setErrorMsg("An account with that email already exists. Sign in with your password or OTP first to link Google securely.")
    }
  }, [oauthError])

  useEffect(() => {
    if (isLoggedIn) {
      router.push(returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard")
    }
  }, [isLoggedIn, returnTo, router])

  // Resend countdown timer
  useEffect(() => {
    if (resendSeconds <= 0) return
    const id = setTimeout(() => setResendSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [resendSeconds])

  // WebOTP API integration with AbortController (modern-web-guidance sms-otp-form)
  useEffect(() => {
    if (step !== "otp_verify" || typeof window === "undefined" || !("OTPCredential" in window)) {
      return
    }
    const ac = new AbortController()
    ;(navigator.credentials as any)
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((otp: any) => {
        if (otp?.code) {
          setOtpCode(otp.code)
          otpFormRef.current?.requestSubmit()
        }
      })
      .catch(() => {})
    return () => ac.abort()
  }, [step])

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setStatusMsg(null)
    setLoading(true)

    const res = await apiFetch("/api/v1/auth/identify", {
      method: "POST",
      body: JSON.stringify({ identifier, countryDialCode }),
    })
    setLoading(false)

    if (!res.success) {
      setErrorMsg(res.message || "Enter a valid email or mobile number.")
      return
    }

    setIdentifierType(res.identifierType)
    setMaskedDestination(res.maskedDestination)
    setStatusMsg(res.message || null)
    setStep("choose_method")
  }

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    const res = await apiFetch("/api/v1/auth/login/password", {
      method: "POST",
      body: JSON.stringify({
        identifier,
        countryDialCode,
        password,
        rememberDevice,
        returnTo: returnTo || undefined,
      }),
    })
    setLoading(false)

    if (!res.success) {
      setErrorMsg(res.message || t("errors.AUTH_INVALID_CREDENTIALS"))
      return
    }

    if (res.csrfToken) setInMemoryCsrfToken(res.csrfToken)
    await refreshUser()
    router.push(res.destination || "/dashboard")
  }

  const handleRequestOtp = async () => {
    setErrorMsg(null)
    setLoading(true)
    const res = await apiFetch("/api/v1/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({
        identifier,
        countryDialCode,
        purpose: "login",
      }),
    })
    setLoading(false)

    if (!res.success) {
      setErrorMsg(res.message || "Could not send one-time code.")
      return
    }

    setChallengeId(res.challengeId)
    setMaskedDestination(res.maskedDestination)
    setResendSeconds(30)
    setDevSandboxCode(res.devSandboxCode || null)
    setStatusMsg(res.message || null)
    setStep("otp_verify")
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    const res = await apiFetch("/api/v1/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        challengeId,
        code: otpCode,
        rememberDevice,
        returnTo: returnTo || undefined,
      }),
    })
    setLoading(false)

    if (!res.success) {
      setErrorMsg(res.message || t("errors.AUTH_CHALLENGE_INVALID"))
      return
    }

    if (res.requiresSignup) {
      router.push(`/signup?identifier=${encodeURIComponent(identifier)}`)
      return
    }

    if (res.csrfToken) setInMemoryCsrfToken(res.csrfToken)
    await refreshUser()
    router.push(res.destination || "/dashboard")
  }

  const handleGoogleOAuth = async () => {
    setErrorMsg(null)
    setLoading(true)
    const res = await apiFetch("/api/v1/auth/oauth/google/start", {
      method: "POST",
      body: JSON.stringify({ returnTo: returnTo || "/dashboard" }),
    })
    setLoading(false)
    if (res.success && res.authUrl) {
      window.location.href = res.authUrl
    } else {
      setErrorMsg(res.message || "Google sign-in is unavailable.")
    }
  }

  return (
    <div className="container py-10 md:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 items-center">
        {/* Left Informational Column (Restrained on desktop, hidden on small mobile so form comes first) */}
        <div className="hidden md:flex flex-col space-y-6 pr-6">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>One Identity • Multi-Role Ecosystem</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {t("auth.welcomeBack")} to HackKro
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Access competitions, hackathons, assessments, courses, mentorship sessions, and hiring pipelines with one verified identity and seamless workspace switching.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
              <span>HttpOnly rotated sessions, anti-enumeration lookup, and multi-device controls.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Smartphone className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Sign in with passphrase or single-use OTP via email or international mobile.</span>
            </li>
          </ul>
          {process.env.NODE_ENV !== "production" && (
            <details className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-foreground">
                Local Development Seeded Accounts (Passphrase: HackKroPass!2026)
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-muted-foreground">
                <span>student@hackkro.local</span>
                <span>organizer@hackkro.local</span>
                <span>recruiter@hackkro.local</span>
                <span>judge@hackkro.local</span>
                <span>mentor@hackkro.local</span>
                <span>college@hackkro.local</span>
                <span>admin@hackkro.local</span>
              </div>
            </details>
          )}
        </div>

        {/* Right Primary Auth Card */}
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t("auth.welcomeBack")}</CardTitle>
            <CardDescription>
              {step === "identify" && "Enter your email address or international mobile number."}
              {step === "choose_method" && `Signing in as ${maskedDestination}`}
              {step === "otp_verify" && t("auth.otpHelp", { destination: maskedDestination })}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {statusMsg && !errorMsg && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300"
              >
                {statusMsg}
              </div>
            )}

            {step === "identify" && (
              <form method="POST" onSubmit={handleIdentify} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-identifier">{t("auth.identifierLabel")}</Label>
                  <div className="flex gap-2">
                    {!identifier.includes("@") && /^\+?[\d\s\-]*$/.test(identifier) && identifier.length > 0 && (
                      <Select value={countryDialCode} onValueChange={setCountryDialCode}>
                        <SelectTrigger className="w-24 shrink-0" aria-label="Country dialing code">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_DIALING_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.dial}>
                              {c.code} {c.dial}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      id="login-identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="next"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={t("auth.identifierPlaceholder")}
                      className="min-h-12"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {loading ? "Checking..." : t("auth.continue")}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            )}

            {step === "choose_method" && (
              <form method="POST" onSubmit={handlePasswordSignIn} className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {identifierType === "email" ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                    {maskedDestination}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("identify")
                      setPassword("")
                      setErrorMsg(null)
                    }}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="current-password">{t("auth.passwordLabel")}</Label>
                    <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="current-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      enterKeyHint="done"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="min-h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-device"
                    checked={rememberDevice}
                    onCheckedChange={(v) => setRememberDevice(Boolean(v))}
                  />
                  <Label htmlFor="remember-device" className="text-xs font-normal cursor-pointer">
                    {t("auth.rememberDevice")}
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {loading ? "Signing in..." : t("auth.signIn")}
                </Button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-border" />
                  <span className="shrink mx-3 text-xs text-muted-foreground">or</span>
                  <div className="flex-grow border-t border-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleRequestOtp}
                  className="w-full min-h-11 font-semibold"
                >
                  Sign in with one-time code (OTP)
                </Button>
              </form>
            )}

            {step === "otp_verify" && (
              <form ref={otpFormRef} method="POST" onSubmit={handleVerifyOtp} className="space-y-4">
                {devSandboxCode && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <strong>Development Sandbox Mode:</strong> External email/SMS provider is unconfigured. Your test one-time code is{" "}
                    <code className="font-mono font-bold">{devSandboxCode}</code>.
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="otp-input">{t("auth.otpHeading")}</Label>
                  <p id="otp-hint" className="text-xs text-muted-foreground">
                    Enter the 6-digit one-time code sent to {maskedDestination}. Paste is supported.
                  </p>
                  <Input
                    ref={otpInputRef}
                    id="otp-input"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    aria-describedby="otp-hint"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="min-h-12 font-mono text-lg tracking-[0.35em] text-center"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full min-h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {loading ? "Verifying..." : "Verify & Sign in"}
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("choose_method")
                      setOtpCode("")
                    }}
                    className="text-muted-foreground hover:underline"
                  >
                    Use password instead
                  </button>
                  <button
                    type="button"
                    disabled={resendSeconds > 0 || loading}
                    onClick={handleRequestOtp}
                    className="flex items-center gap-1 font-semibold text-blue-600 disabled:text-muted-foreground hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {resendSeconds > 0
                      ? t("auth.otpResendIn", { seconds: resendSeconds })
                      : t("auth.otpResendNow")}
                  </button>
                </div>
              </form>
            )}

            {providers.google && step === "identify" && (
              <>
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-border" />
                  <span className="shrink mx-3 text-xs text-muted-foreground">{t("auth.orContinueWith")}</span>
                  <div className="flex-grow border-t border-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleGoogleOAuth}
                  className="w-full min-h-11 font-semibold"
                >
                  {t("auth.googleSignIn")}
                </Button>
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <div>
              New to HackKro?{" "}
              <Link
                href={returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : "/signup"}
                className="font-semibold text-blue-600 hover:underline"
              >
                Create account
              </Link>
            </div>
            <div className="flex gap-3">
              <Link href="/contact" className="hover:underline">Help</Link>
              <Link href="/terms" className="hover:underline">Terms</Link>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-sm text-muted-foreground">Loading sign-in...</div>}>
      <LoginFormContent />
    </Suspense>
  )
}
