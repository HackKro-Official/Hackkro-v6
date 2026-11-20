"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Shield, Laptop, LogOut, Trash2, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveTable } from "@/components/domain/ResponsiveTable"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function SecuritySettingsPage() {
  const { isLoggedIn, logoutAll } = useUserAuth()
  const { toast } = useToast()

  const [sessions, setSessions] = useState<any[]>([])
  const [identities, setIdentities] = useState<any[]>([])
  const [reauthPassword, setReauthPassword] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await apiFetch("/api/v1/auth/sessions")
    if (res.success) {
      setSessions(res.sessions || [])
      setIdentities(res.identities || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isLoggedIn) load()
  }, [isLoggedIn])

  const revokeSession = async (sessionId: string) => {
    const res = await apiFetch(`/api/v1/auth/sessions/${sessionId}`, { method: "DELETE" })
    if (res.success) {
      toast({ title: "Session revoked", description: "The selected device has been signed out." })
      load()
    }
  }

  const handleStepUpReauth = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch("/api/v1/auth/reauth", {
      method: "POST",
      body: JSON.stringify({ password: reauthPassword }),
    })
    if (res.success) {
      setReauthPassword("")
      toast({ title: "Identity verified", description: "Step-up verification valid for 15 minutes." })
    } else {
      toast({ title: "Verification failed", description: res.message, variant: "destructive" })
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Sign in to manage security settings</h1>
        <Button asChild className="bg-blue-600 text-white"><Link href="/login?returnTo=/settings/security">Sign in</Link></Button>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" /> Security &amp; Active Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Inspect active devices, revoke sessions, perform step-up re-authentication, and manage linked sign-in methods.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/settings/privacy">Privacy &amp; Data Export</Link></Button>
          <Button variant="destructive" size="sm" onClick={logoutAll}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log out of all devices
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Laptop className="h-4 w-4 text-blue-600" /> Active Devices &amp; Sessions</CardTitle>
          <CardDescription>Server-enforced session records with idle &amp; expiry tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading active sessions...</p>
          ) : (
            <ResponsiveTable caption="Active user sessions" headers={["Device", "Active Role", "IP Address", "Last Active", "Action"]}>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">
                    {s.deviceLabel} {s.isCurrent && <StatusBadge status="active" label="Current" />}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{s.activeRole.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs font-mono">{s.ipAddress}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(s.lastSeenAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={s.isCurrent}
                      onClick={() => revokeSession(s.id)}
                      className="text-rose-600 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-blue-600" /> Step-Up Re-authentication</CardTitle>
            <CardDescription>Required before sensitive operations like high-value refunds, exports, or account deletion.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStepUpReauth} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reauth-pwd">Confirm current passphrase</Label>
                <Input
                  id="reauth-pwd"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Verify identity now
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked External Providers</CardTitle>
            <CardDescription>Identities safely linked after ownership proof.</CardDescription>
          </CardHeader>
          <CardContent>
            {identities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No external OAuth identities linked.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {identities.map((idn) => (
                  <li key={idn.id} className="flex items-center justify-between rounded-lg border p-2.5">
                    <span className="capitalize font-semibold">{idn.provider} — {idn.providerEmail}</span>
                    <StatusBadge status="verified" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
