"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Upload, History, AlertTriangle, FileCheck2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

function SubmissionsContent() {
  const { isLoggedIn } = useUserAuth()
  const searchParams = useSearchParams()
  const initialOpId = searchParams.get("opportunityId") || ""
  const { toast } = useToast()

  const [applications, setApplications] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [opportunityId, setOpportunityId] = useState(initialOpId)
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [demoUrl, setDemoUrl] = useState("")
  const [textContent, setTextContent] = useState("")
  const [contributionStatement, setContributionStatement] = useState("")
  const [sourceAttribution, setSourceAttribution] = useState("")
  const [uploadedAssetIds, setUploadedAssetIds] = useState<string[]>([])
  const [appealText, setAppealText] = useState("")

  const load = async () => {
    const [appsRes, subsRes] = await Promise.all([
      apiFetch("/api/v1/applications"),
      apiFetch("/api/v1/submissions"),
    ])
    if (appsRes.success) {
      setApplications(appsRes.applications || [])
      if (!opportunityId && appsRes.applications?.[0]?.opportunityId) {
        setOpportunityId(appsRes.applications[0].opportunityId)
      }
    }
    if (subsRes.success) setSubmissions(subsRes.submissions || [])
  }

  useEffect(() => {
    if (isLoggedIn) load()
  }, [isLoggedIn])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    fd.append("purpose", "submission")
    const res = await apiFetch("/api/v1/files/upload", { method: "POST", body: fd })
    if (res.success && res.fileAsset) {
      setUploadedAssetIds((prev) => [...prev, res.fileAsset.id])
      toast({
        title: "Deliverable file verified",
        description: `${res.fileAsset.originalName} (${res.fileAsset.detectedMime}) passed malware scan.`,
      })
    } else {
      toast({ title: "File rejected", description: res.message, variant: "destructive" })
    }
  }

  const submitDeliverable = async (isDraft: boolean) => {
    const res = await apiFetch("/api/v1/submissions", {
      method: "POST",
      body: JSON.stringify({
        opportunityId,
        title,
        summary,
        repoUrl,
        demoUrl,
        textContent,
        fileAssetIds: uploadedAssetIds,
        contributionStatement,
        sourceAttribution,
        isDraft,
      }),
    })
    if (res.success) {
      toast({
        title: isDraft ? "Draft saved" : `Submission v${res.submission.currentVersionNumber} recorded`,
        description: res.submission.similarityScore >= 65 ? res.submission.similarityNote : "Checksum verified and stored.",
      })
      load()
    } else {
      toast({ title: "Submission error", description: res.message, variant: "destructive" })
    }
  }

  const fileAppeal = async (submissionId: string) => {
    if (!appealText.trim()) return
    const res = await apiFetch("/api/v1/submissions", {
      method: "POST",
      body: JSON.stringify({ action: "appeal", submissionId, appealText }),
    })
    if (res.success) {
      toast({ title: "Appeal submitted for human review" })
      setAppealText("")
      load()
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Sign in to manage Project Submissions</h1>
        <Button asChild className="bg-blue-600 text-white"><Link href="/login?returnTo=/submissions">Sign in</Link></Button>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold">Deliverables, Submissions &amp; Versioning</h1>
        <p className="text-sm text-muted-foreground">
          Every submission preserves SHA-256 checksums, version history, contribution statements, and transparent similarity indicators.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create or Update Submission Version</CardTitle>
          <CardDescription>Select one of your active event/challenge registrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Registered Opportunity</Label>
            <Select value={opportunityId} onValueChange={setOpportunityId}>
              <SelectTrigger><SelectValue placeholder="Select registered opportunity" /></SelectTrigger>
              <SelectContent>
                {applications.map((a) => (
                  <SelectItem key={a.opportunityId} value={a.opportunityId}>
                    {a.opportunity.title} ({a.receiptCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sub-title">Project / Deliverable Title</Label>
              <Input id="sub-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., FinGuard AI Co-Pilot" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-repo">Source Repository URL</Label>
              <Input id="sub-repo" type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-demo">Live Demo / Video URL</Label>
            <Input id="sub-demo" type="url" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-summary">Executive Summary &amp; Architecture</Label>
            <Textarea id="sub-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sub-contrib">Team Contribution Statement</Label>
              <Input id="sub-contrib" value={contributionStatement} onChange={(e) => setContributionStatement(e.target.value)} placeholder="Who built which modules..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-attr">Third-Party / Open-Source Attribution</Label>
              <Input id="sub-attr" value={sourceAttribution} onChange={(e) => setSourceAttribution(e.target.value)} placeholder="Libraries, datasets, or pretrained models used" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-xs font-semibold cursor-pointer hover:bg-muted/50">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Attach Pitch Deck / Archive / PDF (Malware Scanned)</span>
              <input type="file" className="sr-only" onChange={handleFileUpload} />
            </label>
            {uploadedAssetIds.length > 0 && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <FileCheck2 className="h-3.5 w-3.5" /> {uploadedAssetIds.length} clean private file(s) attached.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => submitDeliverable(true)}>
              Save Draft Version
            </Button>
            <Button type="button" onClick={() => submitDeliverable(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Submit Official Version
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><History className="h-5 w-5 text-blue-600" /> My Submission History</h2>
        {submissions.map((sub) => (
          <Card key={sub.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{sub.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge status={sub.status} />
                  <span className="text-xs font-mono">v{sub.currentVersionNumber}</span>
                </div>
              </div>
              <CardDescription>{sub.opportunity.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {sub.similarityScore >= 65 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" /> {sub.similarityNote}
                  </p>
                  {sub.appealStatus === "none" && (
                    <div className="flex gap-2">
                      <Input value={appealText} onChange={(e) => setAppealText(e.target.value)} placeholder="Provide originality explanation / appeal..." />
                      <Button size="sm" variant="outline" onClick={() => fileAppeal(sub.id)}>Submit Appeal</Button>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                {sub.versions.map((v: any) => (
                  <div key={v.id} className="rounded border p-2.5 flex flex-wrap justify-between gap-2">
                    <div>
                      <span className="font-bold">Version {v.versionNumber}</span> • Checksum{" "}
                      <code className="font-mono">{v.checksumSha256.slice(0, 12)}...</code>
                      <p className="text-muted-foreground mt-0.5">{v.summary}</p>
                    </div>
                    <span className="text-muted-foreground">{new Date(v.submittedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function SubmissionsPage() {
  return (
    <Suspense fallback={<div className="container py-12 text-center text-sm">Loading submissions...</div>}>
      <SubmissionsContent />
    </Suspense>
  )
}
