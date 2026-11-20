"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api-client"

function ResetContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)
    const res = await apiFetch("/api/v1/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    })
    setLoading(false)
    if (!res.success) {
      setErrorMsg(res.message || "Reset token is invalid or expired.")
      return
    }
    setDone(true)
  }

  return (
    <div className="container py-14 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Choose a new passphrase</CardTitle>
          <CardDescription>
            Completing reset will revoke all active sessions across your devices for security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Passphrase updated and all prior sessions revoked. You can now sign in.</span>
              </div>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/login">Continue to Sign in</Link>
              </Button>
            </div>
          ) : (
            <form method="POST" onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-600">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="reset-pwd">New passphrase</Label>
                <div className="relative">
                  <Input
                    id="reset-pwd"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="min-h-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading || !token} className="w-full min-h-11 bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? "Updating..." : "Update passphrase"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container py-14 text-center text-sm">Loading...</div>}>
      <ResetContent />
    </Suspense>
  )
}
