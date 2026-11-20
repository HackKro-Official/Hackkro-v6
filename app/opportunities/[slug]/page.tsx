"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
  AlertTriangle,
  ExternalLink,
  BellPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { ReportDialog } from "@/components/domain/ReportDialog"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function OpportunityDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const router = useRouter()
  const { isLoggedIn } = useUserAuth()
  const { toast } = useToast()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showApplyForm, setShowApplyForm] = useState(false)

  // Application form state
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [resumeVersionId, setResumeVersionId] = useState("")
  const [teamId, setTeamId] = useState("")
  const [trackName, setTrackName] = useState("")
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [requestException, setRequestException] = useState(false)
  const [exceptionReason, setExceptionReason] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [idempotencyKey] = useState(() => `apply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

  const load = async () => {
    setLoading(true)
    const res = await apiFetch(`/api/v1/opportunities/${slug}`)
    setLoading(false)
    if (res.success) {
      setData(res)
      if (res.userResumes?.[0]?.id) setResumeVersionId(res.userResumes[0].id)
      if (res.opportunity?.tracks?.[0]) setTrackName(res.opportunity.tracks[0])
    }
  }

  useEffect(() => {
    load()
  }, [slug, isLoggedIn])

  const handleToggleSave = async () => {
    if (!isLoggedIn) {
      router.push(`/login?returnTo=/opportunities/${slug}`)
      return
    }
    const res = await apiFetch(`/api/v1/opportunities/${slug}`, {
      method: "POST",
      body: JSON.stringify({ action: "toggle_save" }),
    })
    if (res.success) {
      setData((d: any) => ({ ...d, isSaved: res.saved }))
      toast({ title: res.saved ? "Saved to your list" : "Removed from saved" })
    }
  }

  const handleToggleFollow = async () => {
    if (!isLoggedIn) {
      router.push(`/login?returnTo=/opportunities/${slug}`)
      return
    }
    const res = await apiFetch(`/api/v1/opportunities/${slug}`, {
      method: "POST",
      body: JSON.stringify({ action: "toggle_follow" }),
    })
    if (res.success) {
      setData((d: any) => ({ ...d, isFollowingOrg: res.following }))
      toast({ title: res.following ? "Following organization" : "Unfollowed organization" })
    }
  }

  const handlePrimaryCta = () => {
    if (!isLoggedIn) {
      router.push(`/login?returnTo=/opportunities/${slug}`)
      return
    }
    if (data?.userApplication) {
      router.push("/dashboard?tab=applications")
      return
    }
    setShowApplyForm(true)
  }

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.opportunity) return
    setSubmitting(true)
    const res = await apiFetch("/api/v1/applications", {
      method: "POST",
      body: JSON.stringify({
        opportunityId: data.opportunity.id,
        teamId: teamId || undefined,
        resumeVersionId: resumeVersionId || undefined,
        trackName: trackName || undefined,
        responses,
        idempotencyKey,
        requestManualException: requestException,
        manualExceptionReason: exceptionReason,
        consentAccepted,
      }),
    })
    setSubmitting(false)

    if (!res.success) {
      toast({
        title: res.errorCode === "ELIGIBILITY_NOT_MET" ? "Eligibility Not Met" : "Application Error",
        description: res.message,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Application Submitted!",
      description: `Receipt ${res.application.receiptCode} confirmed.`,
    })
    setShowApplyForm(false)
    load()
  }

  const handleSandboxCheckout = async (orderId: string) => {
    const res = await apiFetch("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify({ action: "sandbox_complete", orderId, outcome: "succeeded" }),
    })
    if (res.success) {
      toast({ title: "Sandbox Payment Confirmed!", description: "Webhook verified and application finalized." })
      load()
    }
  }

  if (loading) {
    return <div className="container py-16 text-center text-sm text-muted-foreground">Loading opportunity details...</div>
  }

  if (!data?.opportunity) {
    return (
      <div className="container py-16 text-center space-y-3">
        <h1 className="text-2xl font-bold">Opportunity Not Found</h1>
        <Button asChild><Link href="/discover">Back to Discover</Link></Button>
      </div>
    )
  }

  const op = data.opportunity
  const fields = op.registrationForm?.fields || []

  return (
    <div className="container py-8 space-y-8 max-w-6xl">
      {/* Above-the-fold Hero */}
      <Card className="overflow-hidden border-border">
        <div className="h-44 sm:h-56 w-full bg-slate-900 relative">
          <img
            src={op.bannerAssetUrl || "/placeholder.jpg"}
            alt={op.title}
            className="h-full w-full object-cover opacity-80"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.jpg"
            }}
          />
          <div className="absolute bottom-3 left-4 flex flex-wrap gap-2">
            <Badge className="bg-blue-600 text-white capitalize">{op.type.replace(/_/g, " ")}</Badge>
            <StatusBadge status={op.status} />
          </div>
        </div>

        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{op.organization.displayName}</span>
                {op.organization.verificationStatus === "verified" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Organizer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                    Unverified Organizer
                  </span>
                )}
                <span>•</span>
                <span>Updated {new Date(op.updatedAt).toLocaleDateString()}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{op.title}</h1>
              <p className="text-sm text-muted-foreground max-w-3xl">{op.shortSummary}</p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleToggleSave}>
                <Bookmark className={`h-4 w-4 mr-1.5 ${data.isSaved ? "fill-blue-600 text-blue-600" : ""}`} />
                {data.isSaved ? "Saved" : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleToggleFollow}>
                <BellPlus className="h-4 w-4 mr-1.5" />
                {data.isFollowingOrg ? "Following Org" : "Follow Org"}
              </Button>
              <Button
                size="lg"
                onClick={handlePrimaryCta}
                disabled={data.ctaState === "Registration Closed"}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {data.ctaState}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-border bg-muted/30 p-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-amber-500" /> Reward / Pay</span>
              <p className="font-bold text-foreground">
                {op.prizeText || op.stipendText || (op.salaryShared && op.salaryMin ? `${op.currency} ${(op.salaryMin / 100000).toFixed(1)}L+` : op.type === "job" ? "Salary not shared" : "Certificate")}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-blue-500" /> Deadline ({op.timezone})</span>
              <p className="font-bold text-foreground">
                {op.registrationCloseAt ? new Date(op.registrationCloseAt).toLocaleDateString() : "Rolling"}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-indigo-500" /> Mode &amp; Location</span>
              <p className="font-bold text-foreground capitalize">{op.locationMode} • {op.locationText}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5 text-emerald-500" /> Team &amp; Fee</span>
              <p className="font-bold text-foreground">
                {op.teamMax > 1 ? `${op.teamMin}–${op.teamMax} members` : "Individual"} • {op.feeAmount > 0 ? `${op.currency} ${op.feeAmount / 100}` : "Free"}
              </p>
            </div>
          </div>

          {/* Signed-in Eligibility Check & Application Receipt Banner */}
          {data.eligibility && (
            <div
              className={`rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ${
                data.eligibility.eligible
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              }`}
            >
              {data.eligibility.eligible ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {data.eligibility.eligible ? "You meet all listed eligibility criteria." : "Eligibility check flagged mismatch(es):"}
                </p>
                {!data.eligibility.eligible && (
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {data.eligibility.reasons.map((r: string) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {data.userApplication && (
            <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-blue-700 dark:text-blue-300">
                  Application Pass: {data.userApplication.receiptCode}
                </p>
                <p className="text-muted-foreground">
                  Status: <span className="font-semibold capitalize">{data.userApplication.status}</span> • Payment:{" "}
                  <span className="font-semibold capitalize">{data.userApplication.paymentState}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {data.userApplication.paymentState === "pending" && (
                  <Button size="sm" onClick={() => router.push("/payments")} className="bg-blue-600 text-white">
                    Complete Payment
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard?tab=applications">Track Application</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Application Wizard Drawer/Card */}
      {showApplyForm && (
        <Card className="border-blue-500 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Apply to {op.title}</CardTitle>
            <CardDescription>
              Your profile fields are pre-linked. Submissions capture an immutable eligibility &amp; resume snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApplySubmit} className="space-y-4">
              {op.tracks?.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="apply-track">Select Challenge Track / Role Track</Label>
                  <Select value={trackName} onValueChange={setTrackName}>
                    <SelectTrigger id="apply-track"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {op.tracks.map((t: string) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {op.teamMax > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor="apply-team">Team (optional — or create/manage on Teams page)</Label>
                  <div className="flex gap-2">
                    <Select value={teamId || "solo"} onValueChange={(v) => setTeamId(v === "solo" ? "" : v)}>
                      <SelectTrigger id="apply-team"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">Apply Individually / Form Team Later</SelectItem>
                        {(data.userTeams || []).map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.members.length} members)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link href={`/team?opportunityId=${op.id}`}>Manage Teams</Link>
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="apply-resume">Attach Resume Snapshot (optional)</Label>
                <div className="flex gap-2">
                  <Select value={resumeVersionId || "none"} onValueChange={(v) => setResumeVersionId(v === "none" ? "" : v)}>
                    <SelectTrigger id="apply-resume"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Use profile summary only</SelectItem>
                      {(data.userResumes || []).map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>{r.title} ({r.fileName})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button asChild type="button" variant="outline" size="sm">
                    <Link href="/profile">Upload Resume</Link>
                  </Button>
                </div>
              </div>

              {fields.map((f: any) => (
                <div key={f.id} className="space-y-1.5">
                  <Label htmlFor={`field-${f.id}`}>
                    {f.label} {f.required && <span aria-hidden="true">*</span>}
                  </Label>
                  {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
                  {f.fieldType === "long_text" ? (
                    <Textarea
                      id={`field-${f.id}`}
                      required={f.required}
                      rows={3}
                      value={responses[f.id] || ""}
                      onChange={(e) => setResponses((prev) => ({ ...prev, [f.id]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={`field-${f.id}`}
                      type={f.fieldType === "url" ? "url" : f.fieldType === "number" ? "number" : "text"}
                      required={f.required}
                      value={responses[f.id] || ""}
                      onChange={(e) => setResponses((prev) => ({ ...prev, [f.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              {data.eligibility && !data.eligibility.eligible && data.eligibility.allowManualException && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="req-exc"
                      checked={requestException}
                      onCheckedChange={(v) => setRequestException(Boolean(v))}
                    />
                    <Label htmlFor="req-exc" className="text-xs font-semibold">
                      Request Organizer Manual Eligibility Exception
                    </Label>
                  </div>
                  {requestException && (
                    <Input
                      required
                      value={exceptionReason}
                      onChange={(e) => setExceptionReason(e.target.value)}
                      placeholder="Explain why you qualify for manual organizer review..."
                    />
                  )}
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-xs">
                <p className="font-semibold">Data-Use &amp; Refund Policy</p>
                <p className="text-muted-foreground">{op.dataUseNotice}</p>
                {op.feeAmount > 0 && <p className="text-muted-foreground">Fee: {op.currency} {op.feeAmount / 100} (+18% tax). {op.refundPolicy}</p>}
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="apply-consent"
                    checked={consentAccepted}
                    onCheckedChange={(v) => setConsentAccepted(Boolean(v))}
                  />
                  <Label htmlFor="apply-consent" className="text-xs font-normal cursor-pointer">
                    I agree to the opportunity rules, privacy notice, and sharing my selected application data with {op.organization.displayName}.
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowApplyForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !consentAccepted} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {submitting ? "Submitting..." : op.feeAmount > 0 ? "Reserve Seat & Proceed to Checkout" : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main Details Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Overview &amp; Problem Statement</CardTitle></CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: op.fullDescription }} />
            </CardContent>
          </Card>

          {op.tracks?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Tracks &amp; Problem Themes</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {op.tracks.map((tr: string) => (
                  <Badge key={tr} variant="secondary" className="px-3 py-1 text-xs">{tr}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {op.rules?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Rules &amp; Judging Criteria</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {op.rules.map((r: string) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {op.rubrics?.map((rb: any) => (
                  <div key={rb.id} className="rounded-lg border p-3 bg-muted/30">
                    <p className="font-semibold text-xs mb-1">{rb.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {op.faqs?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Frequently Asked Questions</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {op.faqs.map((faq: any, i: number) => (
                  <div key={i} className="border-b border-border/60 pb-2.5 last:border-0">
                    <p className="font-semibold">{faq.q}</p>
                    <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organizer &amp; Trust Transparency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <p className="font-semibold text-sm">{op.organization.displayName}</p>
              <p className="text-muted-foreground">{op.organization.description}</p>
              <div className="space-y-1 pt-2 border-t">
                <p><strong>Contact:</strong> {op.contactChannel || op.organization.officialEmail}</p>
                <p><strong>Accessibility:</strong> {op.accessibilityNotes}</p>
                <p><strong>Refund Policy:</strong> {op.refundPolicy}</p>
              </div>
              {op.externalApplyUrl && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px]">
                  External Application Notice: Completing this role opens an external domain outside HackKro.
                  <a href={op.externalApplyUrl} target="_blank" rel="noreferrer" className="block mt-1 font-semibold text-blue-600 underline flex items-center gap-1">
                    Open external site <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="pt-2">
                <ReportDialog targetType="opportunity" targetId={op.id} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Participant Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={`/team?opportunityId=${op.id}`}>Team Formation &amp; Workspace</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={`/submissions?opportunityId=${op.id}`}>Project Submissions &amp; Versions</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href="/test">Open Assessment Hub</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href="/microsites/buildathon-2026">View Event Microsite</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
