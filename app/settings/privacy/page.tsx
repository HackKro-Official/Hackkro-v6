"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Lock, Download, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function PrivacySettingsPage() {
  const { isLoggedIn, logout } = useUserAuth()
  const { toast } = useToast()

  const [prefs, setPrefs] = useState({
    profileVisibility: "public",
    resumeVisibility: "applied_only",
    recruiterDiscovery: false,
    contactSharing: false,
    marketingOptIn: false,
    publicPortfolio: true,
    personalizationConsent: true,
  })
  const [exportsList, setExportsList] = useState<any[]>([])
  const [consents, setConsents] = useState<any[]>([])

  const load = async () => {
    const res = await apiFetch("/api/v1/privacy")
    if (res.success) {
      if (res.privacy) setPrefs(res.privacy)
      setExportsList(res.exports || [])
      setConsents(res.consents || [])
    }
  }

  useEffect(() => {
    if (isLoggedIn) load()
  }, [isLoggedIn])

  const savePrefs = async (next: typeof prefs) => {
    setPrefs(next)
    const res = await apiFetch("/api/v1/privacy", {
      method: "PATCH",
      body: JSON.stringify(next),
    })
    if (res.success) {
      toast({ title: "Privacy preferences saved" })
    }
  }

  const requestExport = async () => {
    const res = await apiFetch("/api/v1/privacy", {
      method: "POST",
      body: JSON.stringify({ action: "request_export" }),
    })
    if (res.success) {
      toast({ title: "Data export ready", description: "Download your machine-readable JSON archive below." })
      load()
    }
  }

  const requestDeletion = async () => {
    const res = await apiFetch("/api/v1/privacy", {
      method: "POST",
      body: JSON.stringify({ action: "request_deletion" }),
    })
    if (res.success) {
      toast({ title: "Deletion workflow initiated", description: res.message })
      await logout()
    } else {
      toast({
        title: "Step-up verification required",
        description: res.message || "Verify your password in Security Settings first.",
        variant: "destructive",
      })
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Sign in to manage privacy controls</h1>
        <Button asChild className="bg-blue-600 text-white"><Link href="/login?returnTo=/settings/privacy">Sign in</Link></Button>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" /> Privacy, Consents &amp; Data Portability
          </h1>
          <p className="text-sm text-muted-foreground">
            Control what recruiters and public visitors can see, export your data in JSON format, or request account deletion.
          </p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/settings/security">Security &amp; Sessions</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visibility &amp; Consent Controls</CardTitle>
          <CardDescription>Every setting explicitly controls who can access your profile, resume, and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "recruiterDiscovery",
              title: "Allow Recruiter Talent Discovery",
              desc: "Verified recruiters can find your skills & verified credentials in talent searches.",
            },
            {
              key: "contactSharing",
              title: "Share Direct Contact Email in Talent Search",
              desc: "Disabled by default. When off, recruiters can message you only after you apply or opt in.",
            },
            {
              key: "publicPortfolio",
              title: "Public Portfolio & Credentials",
              desc: "Allow your portfolio projects and earned HackKro badges to display publicly.",
            },
            {
              key: "personalizationConsent",
              title: "Personalized Opportunity Recommendations",
              desc: "Use your profile skills and interests to explain why opportunities match you.",
            },
            {
              key: "marketingOptIn",
              title: "Optional Marketing & Digest Emails",
              desc: "Separate from critical transactional application/security alerts.",
            },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-0">
              <div>
                <Label htmlFor={`switch-${item.key}`} className="font-semibold text-sm">{item.title}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                id={`switch-${item.key}`}
                checked={Boolean((prefs as any)[item.key])}
                onCheckedChange={(val) => savePrefs({ ...prefs, [item.key]: val })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4 text-blue-600" /> Data Portability Export</CardTitle>
            <CardDescription>Includes profile, skills, applications, certificates, and consent history; excludes internal notes &amp; secret hashes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={requestExport} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              Generate JSON Data Export
            </Button>
            {exportsList.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                <span>Export {new Date(ex.createdAt).toLocaleDateString()}</span>
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(ex.payloadJson)}`}
                  download={`hackkro-data-export-${ex.id}.json`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Download JSON
                </a>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-rose-500/30">
          <CardHeader>
            <CardTitle className="text-base text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Account Deletion Request
            </CardTitle>
            <CardDescription>
              Requires recent re-authentication in Security Settings. Revokes all sessions immediately and preserves legal financial/audit evidence only as required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="destructive" size="sm" onClick={requestDeletion}>
              Request Account Deletion
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Recorded consent entries on file: {consents.length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
