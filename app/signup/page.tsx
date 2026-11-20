"use client"

import React, { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, AlertCircle, UserPlus } from "lucide-react"
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

function SignupFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || ""
  const initialRef = searchParams.get("ref") || ""

  const { refreshUser } = useUserAuth()
  const { t } = useI18n()

  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [countryDialCode, setCountryDialCode] = useState("+91")
  const [country, setCountry] = useState("IN")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [primaryIntent, setPrimaryIntent] = useState<
    "student" | "recruiter" | "organizer" | "mentor" | "college" | "ambassador"
  >("student")
  const [organizationName, setOrganizationName] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [referralCode, setReferralCode] = useState(initialRef)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const needsOrg = ["organizer", "recruiter", "college"].includes(primaryIntent)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!termsAccepted) {
      setErrorMsg("You must accept the Terms of Service and Privacy Policy to create an account.")
      return
    }
    if (needsOrg && !organizationName.trim()) {
      setErrorMsg("Please enter your organization, company, or institution name.")
      return
    }

    setLoading(true)
    const res = await apiFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        displayName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        countryDialCode,
        password,
        country,
        dateOfBirth: dateOfBirth || undefined,
        primaryIntent,
        organizationName: needsOrg ? organizationName : undefined,
        termsAccepted: true,
        termsVersion: "v3.0-2026",
        marketingConsent,
        referralCode: referralCode.trim() || undefined,
        returnTo: returnTo || undefined,
      }),
    })
    setLoading(false)

    if (!res.success) {
      setErrorMsg(res.message || "Could not create account. Please verify your fields.")
      return
    }

    if (res.csrfToken) setInMemoryCsrfToken(res.csrfToken)
    await refreshUser()
    router.push(res.destination || "/onboarding")
  }

  return (
    <div className="container py-10 md:py-14">
      <div className="mx-auto max-w-xl">
        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" aria-hidden="true" />
              {t("auth.createAccount")}
            </CardTitle>
            <CardDescription>
              Start with minimal account details. You can add additional roles or switch workspaces later without creating duplicate accounts.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form method="POST" onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="full-name">Full name <span aria-hidden="true">*</span></Label>
                <Input
                  id="full-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                  className="min-h-11"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email address <span aria-hidden="true">*</span></Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone">Mobile number (optional)</Label>
                  <div className="flex gap-1.5">
                    <Select value={countryDialCode} onValueChange={setCountryDialCode}>
                      <SelectTrigger className="w-24 shrink-0 min-h-11" aria-label="Dial code">
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
                    <Input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel-national"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="min-h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">Passphrase <span aria-hidden="true">*</span></Label>
                <p id="pwd-req" className="text-xs text-muted-foreground">
                  At least 8 characters. Long passphrases and password managers are encouraged.
                </p>
                <div className="relative">
                  <Input
                    id="new-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    aria-describedby="pwd-req"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-h-11 pr-12"
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="country-select">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country-select" className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_DIALING_CODES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob-input">Date of Birth (age check, optional)</Label>
                  <Input
                    id="dob-input"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="min-h-11"
                  />
                </div>
              </div>

              <fieldset className="space-y-2 rounded-xl border border-border p-3.5">
                <legend className="px-1 text-xs font-semibold text-foreground">
                  How do you plan to start on HackKro?
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "student", label: "Student / Participant" },
                    { key: "organizer", label: "Event Organizer" },
                    { key: "recruiter", label: "Recruiter / Employer" },
                    { key: "mentor", label: "Mentor / Judge" },
                    { key: "college", label: "College / Institution" },
                    { key: "ambassador", label: "Campus Ambassador" },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                        primaryIntent === item.key
                          ? "border-blue-600 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="primaryIntent"
                        value={item.key}
                        checked={primaryIntent === item.key}
                        onChange={() => setPrimaryIntent(item.key as any)}
                        className="accent-blue-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {needsOrg && (
                <div className="space-y-1.5">
                  <Label htmlFor="org-name">Organization / Company / Institution Name <span aria-hidden="true">*</span></Label>
                  <Input
                    id="org-name"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g., NovaTech Cloud or NIT Surathkal"
                    className="min-h-11"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="referral-code">Campus Referral Code (optional)</Label>
                <Input
                  id="referral-code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="e.g., HK-AARAV-2026"
                  className="min-h-11"
                />
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="terms-consent"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(Boolean(v))}
                  />
                  <Label htmlFor="terms-consent" className="text-xs leading-relaxed font-normal cursor-pointer">
                    I agree to the{" "}
                    <Link href="/terms" className="text-blue-600 underline">Terms of Service</Link> and{" "}
                    <Link href="/privacy" className="text-blue-600 underline">Privacy Policy</Link> (v3.0-2026). <span aria-hidden="true">*</span>
                  </Label>
                </div>

                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="marketing-consent"
                    checked={marketingConsent}
                    onCheckedChange={(v) => setMarketingConsent(Boolean(v))}
                  />
                  <Label htmlFor="marketing-consent" className="text-xs leading-relaxed font-normal cursor-pointer text-muted-foreground">
                    {t("auth.marketingConsent")}
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full min-h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {loading ? "Creating account..." : "Create HackKro Account"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-xs text-muted-foreground justify-between">
            <span>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                Sign in
              </Link>
            </span>
            <Link href="/contact" className="hover:underline">Need help?</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-sm text-muted-foreground">Loading signup...</div>}>
      <SignupFormContent />
    </Suspense>
  )
}
