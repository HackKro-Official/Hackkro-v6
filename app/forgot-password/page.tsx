"use client"

import { useState } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api-client"

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("")
  const [loading, setLoading] = useState(false)
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null)
  const [devResetToken, setDevResetToken] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)
    const res = await apiFetch("/api/v1/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    })
    setLoading(false)
    if (!res.success) {
      setErrorMsg(res.message || "Unable to submit request.")
      return
    }
    setSubmittedMsg(res.message || "If an account exists for that identifier, recovery instructions have been issued.")
    if (res.devSandboxResetToken) setDevResetToken(res.devSandboxResetToken)
  }

  return (
    <div className="container py-14 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Reset your passphrase</CardTitle>
          <CardDescription>
            Enter your registered email or mobile number. Single-use reset tokens expire in 30 minutes and revoke existing sessions upon completion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submittedMsg ? (
            <div className="space-y-4">
              <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <MailCheck className="h-4 w-4" /> Request processed
                </div>
                <p>{submittedMsg}</p>
              </div>
              {devResetToken && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2">
                  <p className="font-semibold">Development Sandbox Mode:</p>
                  <Link
                    href={`/reset-password?token=${encodeURIComponent(devResetToken)}`}
                    className="inline-block font-semibold text-blue-600 underline break-all"
                  >
                    Open Reset Link (/reset-password?token=...)
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <form method="POST" onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-600">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="forgot-id">Email or mobile number</Label>
                <Input
                  id="forgot-id"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="min-h-11"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full min-h-11 bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
