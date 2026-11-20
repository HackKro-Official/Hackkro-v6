"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { FORM_FIELD_TYPES, OPPORTUNITY_TYPES } from "@/config/taxonomies"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { ResponsiveTable } from "@/components/domain/ResponsiveTable"
import { WorkspaceSwitcher } from "@/components/domain/WorkspaceSwitcher"
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Globe,
  Layers,
  QrCode,
  Scale,
  Webhook,
} from "lucide-react"

interface FormFieldDraft {
  sectionKey: string
  label: string
  helpText: string
  fieldType: string
  required: boolean
  optionsText: string
  conditionalParent?: string
  conditionalValue?: string
}

export default function OrganizerDashboardPage() {
  const { user, isLoading: authLoading } = useUserAuth()
  const [tab, setTab] = useState<
    "wizard" | "listings" | "form_builder" | "operations" | "judging" | "certificates" | "microsite" | "broadcast" | "webhooks"
  >("listings")

  const [opportunities, setOpportunities] = useState<any[]>([])
  const [selectedOppId, setSelectedOppId] = useState<string>("")
  const [opsData, setOpsData] = useState<any>(null)
  const [judgingData, setJudgingData] = useState<any>({
    rubrics: [],
    submissions: [],
    assignments: [],
    evaluations: [],
  })
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // 10-Step Wizard state
  const [wizardStep, setWizardStep] = useState(1)
  const [wiz, setWiz] = useState({
    title: "",
    type: "hackathon",
    category: "AI & Cloud",
    shortSummary: "",
    fullDescription: "",
    visibility: "public" as "public" | "unlisted" | "invite_only" | "org_only",
    status: "live",
    locationMode: "hybrid" as "online" | "offline" | "hybrid",
    locationText: "Bengaluru / Online",
    venue: "HackKro Auditorium",
    registrationOpenAt: "",
    registrationCloseAt: "",
    eventStartAt: "",
    eventEndAt: "",
    timezone: "Asia/Kolkata",
    teamMin: 1,
    teamMax: 4,
    capacity: 500,
    feeAmount: 0,
    currency: "INR",
    refundPolicy: "100% refundable up to 48 hours before kickoff.",
    prizeText: "INR 2,50,000 Prize Pool",
    skillsText: "TypeScript, Next.js, AI Systems",
    tracksText: "FinTech, Developer Tools, Civic AI",
    perksText: "Verified Certificates, Cloud Credits",
    rulesText: "Original code written during the sprint; open-source libraries permitted.",
    contactChannel: "events@hackkro.local",
  })

  // Form Builder + Eligibility state
  const [fields, setFields] = useState<FormFieldDraft[]>([
    {
      sectionKey: "profile",
      label: "GitHub / Portfolio Link",
      helpText: "Share your public repositories or live demos",
      fieldType: "url",
      required: true,
      optionsText: "",
    },
    {
      sectionKey: "track",
      label: "Preferred Track",
      helpText: "Choose your primary problem track",
      fieldType: "dropdown",
      required: true,
      optionsText: "AI & Agents, Cloud Infrastructure, Civic Tech",
    },
  ])
  const [eligMinExp, setEligMinExp] = useState("")
  const [eligEdu, setEligEdu] = useState("Undergraduate, Graduate")

  // Operations state
  const [checkinUserId, setCheckinUserId] = useState("")
  const [contingencyReason, setContingencyReason] = useState("")
  const [contingencyDeadline, setContingencyDeadline] = useState("")

  // Judging setup state
  const [rubricTitle, setRubricTitle] = useState("Innovation & Engineering Rubric")
  const [c1Weight, setC1Weight] = useState(40)
  const [c2Weight, setC2Weight] = useState(35)
  const [c3Weight, setC3Weight] = useState(25)
  const [assignSubId, setAssignSubId] = useState("")
  const [assignEvalId, setAssignEvalId] = useState("")

  // Certificate issuance
  const [certRecipientId, setCertRecipientId] = useState("")
  const [certTitle, setCertTitle] = useState("HackKro Finalist Certificate")

  // Microsite editor
  const [siteSlug, setSiteSlug] = useState("")
  const [siteTitle, setSiteTitle] = useState("")
  const [siteHeading, setSiteHeading] = useState("About the Challenge")
  const [siteBodyHtml, setSiteBodyHtml] = useState("<p>Build resilient open-source systems and win mentorship + grants.</p>")

  // Broadcast
  const [bcSubject, setBcSubject] = useState("")
  const [bcMessage, setBcMessage] = useState("")

  // Webhook
  const [whUrl, setWhUrl] = useState("https://example.invalid/hackkro-webhook")
  const [whSecretPreview, setWhSecretPreview] = useState<string | null>(null)

  const selectedOpp = opportunities.find((o) => o.id === selectedOppId) || opportunities[0] || null

  const loadWorkspace = async () => {
    setLoading(true)
    setErr(null)
    const orgQuery = user?.activeOrganizationId
      ? `&organizationId=${encodeURIComponent(user.activeOrganizationId)}`
      : ""
    const res = await apiFetch<{ items: any[] }>(`/api/v1/opportunities?limit=50${orgQuery}`)
    if (res.success) {
      setOpportunities(res.items)
      if (!selectedOppId && res.items[0]) {
        setSelectedOppId(res.items[0].id)
      }
    } else {
      setErr((res.message || "Request failed."))
    }
    if (user?.activeOrganizationId) {
      const whRes = await apiFetch<{ endpoints: any[] }>(
        `/api/v1/webhooks?organizationId=${encodeURIComponent(user.activeOrganizationId)}`
      )
      if (whRes.success) setWebhooks(whRes.endpoints)
    }
    setLoading(false)
  }

  const loadSelectedOppData = async (opp: any) => {
    if (!opp) return
    const [oRes, jRes, fRes] = await Promise.all([
      apiFetch(`/api/v1/events/${opp.id}/operations`),
      apiFetch(`/api/v1/judging?opportunityId=${opp.id}`),
      apiFetch<{ form: any; eligibilityRules: any[] }>(`/api/v1/opportunities/${opp.slug}/form`),
    ])
    if (oRes.success) setOpsData(oRes)
    if (jRes.success) {
      setJudgingData(jRes)
      if (jRes.submissions?.[0]) setAssignSubId(jRes.submissions[0].id)
    }
    if (fRes.success && fRes.form?.fields?.length > 0) {
      setFields(
        fRes.form.fields.map((f: any) => ({
          sectionKey: f.sectionKey,
          label: f.label,
          helpText: f.helpText,
          fieldType: f.fieldType,
          required: f.required,
          optionsText: (() => {
            try {
              const arr = JSON.parse(f.optionsJson || "[]")
              return Array.isArray(arr) ? arr.join(", ") : ""
            } catch {
              return ""
            }
          })(),
        }))
      )
    }
  }

  useEffect(() => {
    if (!authLoading && user) void loadWorkspace()
    else if (!authLoading) setLoading(false)
  }, [authLoading, user?.activeOrganizationId, user?.activeRole])

  useEffect(() => {
    if (selectedOpp && user) void loadSelectedOppData(selectedOpp)
  }, [selectedOpp?.id])

  const submitListing = async (publishNow: boolean) => {
    setErr(null)
    setMsg(null)
    if (!user?.activeOrganizationId) {
      setErr("Select an Organizer organization workspace first.")
      return
    }
    const res = await apiFetch<{ opportunity: any }>("/api/v1/opportunities", {
      method: "POST",
      body: JSON.stringify({
        organizationId: user.activeOrganizationId,
        title: wiz.title,
        type: wiz.type,
        category: wiz.category,
        shortSummary: wiz.shortSummary,
        fullDescription: wiz.fullDescription,
        visibility: wiz.visibility,
        status: publishNow ? "live" : "draft",
        locationMode: wiz.locationMode,
        locationText: wiz.locationText,
        venue: wiz.venue,
        registrationOpenAt: wiz.registrationOpenAt ? new Date(wiz.registrationOpenAt).toISOString() : null,
        registrationCloseAt: wiz.registrationCloseAt ? new Date(wiz.registrationCloseAt).toISOString() : null,
        eventStartAt: wiz.eventStartAt ? new Date(wiz.eventStartAt).toISOString() : null,
        eventEndAt: wiz.eventEndAt ? new Date(wiz.eventEndAt).toISOString() : null,
        timezone: wiz.timezone,
        teamMin: Number(wiz.teamMin),
        teamMax: Number(wiz.teamMax),
        capacity: Number(wiz.capacity) || null,
        feeAmount: Number(wiz.feeAmount),
        currency: wiz.currency,
        refundPolicy: wiz.refundPolicy,
        prizeText: wiz.prizeText,
        skills: wiz.skillsText.split(",").map((s) => s.trim()).filter(Boolean),
        tracks: wiz.tracksText.split(",").map((s) => s.trim()).filter(Boolean),
        perks: wiz.perksText.split(",").map((s) => s.trim()).filter(Boolean),
        rules: wiz.rulesText.split(";").map((s) => s.trim()).filter(Boolean),
        contactChannel: wiz.contactChannel,
        changeReason: publishNow ? "Published via 10-step organizer wizard" : "Saved draft",
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(publishNow ? "Opportunity published live!" : "Listing saved cleanly as draft.")
    setTab("listings")
    await loadWorkspace()
    setSelectedOppId(res.opportunity.id)
  }

  const saveFormBuilder = async () => {
    if (!selectedOpp) return
    setErr(null)
    setMsg(null)
    const res = await apiFetch(`/api/v1/opportunities/${selectedOpp.slug}/form`, {
      method: "PUT",
      body: JSON.stringify({
        title: `${selectedOpp.title} Registration Form`,
        fields: fields.map((f, idx) => ({
          sectionKey: f.sectionKey || "general",
          label: f.label,
          helpText: f.helpText,
          fieldType: f.fieldType,
          required: f.required,
          options: f.optionsText
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
          conditionalRule:
            f.conditionalParent && f.conditionalValue
              ? { fieldLabel: f.conditionalParent, equals: f.conditionalValue }
              : {},
          orderIndex: idx,
        })),
        eligibilityRule: {
          educationLevels: eligEdu
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
          minExperienceYears: eligMinExp ? Number(eligMinExp) : null,
          allowManualException: true,
        },
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg("Dynamic registration form & server eligibility rules saved.")
  }

  const runCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOpp) return
    setErr(null)
    setMsg(null)
    const res = await apiFetch(`/api/v1/events/${selectedOpp.id}/operations`, {
      method: "POST",
      body: JSON.stringify({
        action: "checkin",
        userId: checkinUserId,
        mode: "manual_roster",
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg("Participant checked in with signed audit log.")
    setCheckinUserId("")
    await loadSelectedOppData(selectedOpp)
  }

  const triggerContingency = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOpp) return
    setErr(null)
    setMsg(null)
    const res = await apiFetch(`/api/v1/events/${selectedOpp.id}/operations`, {
      method: "POST",
      body: JSON.stringify({
        action: "contingency",
        incidentType: "deadline_extension",
        reason: contingencyReason,
        revisedDeadline: contingencyDeadline ? new Date(contingencyDeadline).toISOString() : undefined,
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg("Contingency mode triggered; updated deadline propagated and participants notified.")
    setContingencyReason("")
    await loadSelectedOppData(selectedOpp)
  }

  const createRubricAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOpp) return
    const res = await apiFetch("/api/v1/judging", {
      method: "POST",
      body: JSON.stringify({
        action: "create_rubric",
        opportunityId: selectedOpp.id,
        title: rubricTitle,
        criteria: [
          { id: "c1", name: "Technical Depth", description: "Code & architecture quality", weight: c1Weight, maxScore: 10 },
          { id: "c2", name: "Impact & Originality", description: "Real-world utility", weight: c2Weight, maxScore: 10 },
          { id: "c3", name: "Demo Clarity", description: "Presentation & testability", weight: c3Weight, maxScore: 10 },
        ],
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg("Weighted rubric created (100% total weight validated).")
    await loadSelectedOppData(selectedOpp)
  }

  const assignJudgeAction = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch("/api/v1/judging", {
      method: "POST",
      body: JSON.stringify({
        action: "assign_judge",
        submissionId: assignSubId,
        evaluatorId: assignEvalId,
        blindMode: true,
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg("Evaluator assigned in blind review mode (COI verified).")
    await loadSelectedOppData(selectedOpp)
  }

  const issueCertificateAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOpp) return
    const res = await apiFetch<{ certificate: any }>("/api/v1/certificates", {
      method: "POST",
      body: JSON.stringify({
        userId: certRecipientId,
        opportunityId: selectedOpp.id,
        organizationId: selectedOpp.organizationId,
        title: certTitle,
        achievementType: "winner",
        criteriaText: `Awarded by ${user?.displayName} for ${selectedOpp.title}`,
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(`Issued verifiable certificate ${res.certificate.credentialId}!`)
    setCertRecipientId("")
  }

  const saveMicrosite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.activeOrganizationId) return
    const res = await apiFetch<{ microsite: any }>("/api/v1/microsites", {
      method: "POST",
      body: JSON.stringify({
        slug: siteSlug || `${selectedOpp?.slug || "event"}-microsite`,
        opportunityId: selectedOpp?.id,
        organizationId: user.activeOrganizationId,
        title: siteTitle || selectedOpp?.title || "HackKro Event Microsite",
        publish: true,
        themeTokens: { primaryColor: "#4f46e5" },
        sections: [{ id: "about", type: "rich_text", title: siteHeading, htmlContent: siteBodyHtml }],
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(`Sanitized microsite published at /microsites/${res.microsite.slug}`)
  }

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOpp) return
    const res = await apiFetch<{ campaign: any }>("/api/v1/notifications", {
      method: "POST",
      body: JSON.stringify({
        organizationId: selectedOpp.organizationId,
        opportunityId: selectedOpp.id,
        subject: bcSubject,
        message: bcMessage,
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(
      res.campaign.approvalStatus === "pending_approval"
        ? "Large audience campaign queued for admin safety approval."
        : `Broadcast delivered to ${res.campaign.recipientCount} registered participants.`
    )
    setBcSubject("")
    setBcMessage("")
  }

  const registerWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.activeOrganizationId) return
    const res = await apiFetch<{ endpoint: any; signingSecretOneTimePreview: string }>("/api/v1/webhooks", {
      method: "POST",
      body: JSON.stringify({
        organizationId: user.activeOrganizationId,
        url: whUrl,
        events: ["application.submitted", "submission.finalized"],
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setWhSecretPreview(res.signingSecretOneTimePreview)
    setMsg("Webhook endpoint registered. Copy the one-time HMAC signing secret shown below.")
    await loadWorkspace()
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Organizer Workspace Sign-In Required"
          description="Sign in with your Organizer account (e.g., organizer@hackkro.local) to manage events, forms, check-ins, rubrics, and certificates."
          actionLabel="Sign In"
          actionHref="/login?returnTo=/organizer/dashboard"
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Event Organizer Control Plane
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            Hackathons, Dynamic Forms, Live Ops, Judging & Certificates
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Role: <strong>{user.activeRole}</strong> · Workspace-scoped RBAC+ABAC protection
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WorkspaceSwitcher />
          {opportunities.length > 0 && (
            <select
              aria-label="Active Opportunity Context"
              value={selectedOpp?.id || ""}
              onChange={(e) => setSelectedOppId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
            >
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} ({o.status})
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Organizer Sections">
        {(
          [
            { id: "listings", label: "My Listings" },
            { id: "wizard", label: "+ 10-Step Listing Wizard" },
            { id: "form_builder", label: "Dynamic Form & Eligibility" },
            { id: "operations", label: "Live Ops & Contingency" },
            { id: "judging", label: "Rubrics & Judges" },
            { id: "certificates", label: "Certificates" },
            { id: "microsite", label: "Microsite" },
            { id: "broadcast", label: "Broadcasts" },
            { id: "webhooks", label: "Webhooks" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {err && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          {err}
        </div>
      )}
      {msg && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {msg}
        </div>
      )}

      {tab === "listings" && (
        <ResponsiveTable
          caption="Organization Listings"
          headers={["Title", "Type", "Status", "Visibility", "Fee", "Link"]}
        >
          {opportunities.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                No listings found for this organization workspace. Use the 10-Step Wizard tab to create one.
              </td>
            </tr>
          ) : (
            opportunities.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-semibold">{o.title}</td>
                <td className="px-4 py-3 text-xs">{o.type}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} label={o.status} />
                </td>
                <td className="px-4 py-3 text-xs">{o.visibility}</td>
                <td className="px-4 py-3 text-xs">
                  {o.feeAmount === 0 ? "Free" : `${o.currency} ${o.feeAmount}`}
                </td>
                <td className="px-4 py-3 text-xs">
                  <Link href={`/opportunities/${o.slug}`} className="font-semibold text-indigo-600 underline">
                    Open Page →
                  </Link>
                </td>
              </tr>
            ))
          )}
        </ResponsiveTable>
      )}

      {tab === "wizard" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold">10-Step Opportunity Creation Wizard — Step {wizardStep} of 10</h2>
              <p className="text-xs text-slate-500">
                Supports drafts, visibility controls, team constraints, fees/refunds, tracks, rules, and publication.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setWizardStep(s)}
                  className={`h-7 w-7 rounded-full text-xs font-bold ${
                    wizardStep === s
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {wizardStep === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="w-title" className="block text-xs font-semibold">Opportunity Title</label>
                  <input
                    id="w-title"
                    value={wiz.title}
                    onChange={(e) => setWiz({ ...wiz, title: e.target.value })}
                    placeholder="e.g., HackKro Cloud Resilience Challenge"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="w-type" className="block text-xs font-semibold">Canonical Opportunity Type</label>
                  <select
                    id="w-type"
                    value={wiz.type}
                    onChange={(e) => setWiz({ ...wiz, type: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {OPPORTUNITY_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="w-summary" className="block text-xs font-semibold">Short Summary</label>
                  <input
                    id="w-summary"
                    value={wiz.shortSummary}
                    onChange={(e) => setWiz({ ...wiz, shortSummary: e.target.value })}
                    placeholder="1-2 sentence pitch shown in discovery search"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <label htmlFor="w-desc" className="block text-xs font-semibold">Detailed Description & Problem Brief</label>
                <textarea
                  id="w-desc"
                  rows={5}
                  value={wiz.fullDescription}
                  onChange={(e) => setWiz({ ...wiz, fullDescription: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            )}

            {wizardStep === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="w-open" className="block text-xs font-semibold">Registration Opens</label>
                  <input id="w-open" type="datetime-local" value={wiz.registrationOpenAt} onChange={(e) => setWiz({ ...wiz, registrationOpenAt: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-close" className="block text-xs font-semibold">Registration Closes</label>
                  <input id="w-close" type="datetime-local" value={wiz.registrationCloseAt} onChange={(e) => setWiz({ ...wiz, registrationCloseAt: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-start" className="block text-xs font-semibold">Event Kickoff</label>
                  <input id="w-start" type="datetime-local" value={wiz.eventStartAt} onChange={(e) => setWiz({ ...wiz, eventStartAt: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-tz" className="block text-xs font-semibold">Primary Timezone (IANA)</label>
                  <input id="w-tz" value={wiz.timezone} onChange={(e) => setWiz({ ...wiz, timezone: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="w-mode" className="block text-xs font-semibold">Mode</label>
                  <select id="w-mode" value={wiz.locationMode} onChange={(e) => setWiz({ ...wiz, locationMode: e.target.value as any })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                    <option value="hybrid">Hybrid</option>
                    <option value="online">Online</option>
                    <option value="offline">In-Person</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="w-loc" className="block text-xs font-semibold">Location City / Online</label>
                  <input id="w-loc" value={wiz.locationText} onChange={(e) => setWiz({ ...wiz, locationText: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-venue" className="block text-xs font-semibold">Venue</label>
                  <input id="w-venue" value={wiz.venue} onChange={(e) => setWiz({ ...wiz, venue: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
              </div>
            )}

            {wizardStep === 5 && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="w-tmin" className="block text-xs font-semibold">Min Team Size</label>
                  <input id="w-tmin" type="number" min={1} value={wiz.teamMin} onChange={(e) => setWiz({ ...wiz, teamMin: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-tmax" className="block text-xs font-semibold">Max Team Size</label>
                  <input id="w-tmax" type="number" min={1} value={wiz.teamMax} onChange={(e) => setWiz({ ...wiz, teamMax: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-cap" className="block text-xs font-semibold">Capacity Limit</label>
                  <input id="w-cap" type="number" min={1} value={wiz.capacity} onChange={(e) => setWiz({ ...wiz, capacity: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
              </div>
            )}

            {wizardStep === 6 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="w-prize" className="block text-xs font-semibold">Rewards / Prize Pool</label>
                  <input id="w-prize" value={wiz.prizeText} onChange={(e) => setWiz({ ...wiz, prizeText: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-tracks" className="block text-xs font-semibold">Tracks (comma-separated)</label>
                  <input id="w-tracks" value={wiz.tracksText} onChange={(e) => setWiz({ ...wiz, tracksText: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
              </div>
            )}

            {wizardStep === 7 && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="w-fee" className="block text-xs font-semibold">Entry Fee (0 = Free)</label>
                  <input id="w-fee" type="number" min={0} value={wiz.feeAmount} onChange={(e) => setWiz({ ...wiz, feeAmount: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-curr" className="block text-xs font-semibold">Currency</label>
                  <input id="w-curr" value={wiz.currency} onChange={(e) => setWiz({ ...wiz, currency: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-refund" className="block text-xs font-semibold">Refund Policy Snapshot</label>
                  <input id="w-refund" value={wiz.refundPolicy} onChange={(e) => setWiz({ ...wiz, refundPolicy: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
              </div>
            )}

            {wizardStep === 8 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="w-skills" className="block text-xs font-semibold">Skills Tagged (comma-separated)</label>
                  <input id="w-skills" value={wiz.skillsText} onChange={(e) => setWiz({ ...wiz, skillsText: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-vis" className="block text-xs font-semibold">Visibility Scope</label>
                  <select id="w-vis" value={wiz.visibility} onChange={(e) => setWiz({ ...wiz, visibility: e.target.value as any })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                    <option value="public">Public Discovery</option>
                    <option value="unlisted">Unlisted Direct Link</option>
                    <option value="invite_only">Invite Only</option>
                    <option value="org_only">Organization Members Only</option>
                  </select>
                </div>
              </div>
            )}

            {wizardStep === 9 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="w-rules" className="block text-xs font-semibold">Official Rules (semicolon-separated)</label>
                  <textarea id="w-rules" rows={3} value={wiz.rulesText} onChange={(e) => setWiz({ ...wiz, rulesText: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
                <div>
                  <label htmlFor="w-contact" className="block text-xs font-semibold">Participant Support Contact</label>
                  <input id="w-contact" value={wiz.contactChannel} onChange={(e) => setWiz({ ...wiz, contactChannel: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </div>
              </div>
            )}

            {wizardStep === 10 && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
                <h3 className="font-bold">Publication Review Checklist</h3>
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <li>• Title: {wiz.title || "(Missing title)"} ({wiz.type})</li>
                  <li>• Team Size: {wiz.teamMin} to {wiz.teamMax} · Fee: {wiz.currency} {wiz.feeAmount}</li>
                  <li>• Visibility: {wiz.visibility} · Timezone: {wiz.timezone}</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => submitListing(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold">
                    Save as Draft
                  </button>
                  <button type="button" onClick={() => submitListing(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500">
                    Publish Live Opportunity
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              disabled={wizardStep <= 1}
              onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Previous Step
            </button>
            <button
              type="button"
              disabled={wizardStep >= 10}
              onClick={() => setWizardStep((s) => Math.min(10, s + 1))}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Next Step →
            </button>
          </div>
        </section>
      )}

      {tab === "form_builder" && selectedOpp && (
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ClipboardList className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Dynamic Registration Form & Server Eligibility
            </h2>
            <button
              type="button"
              onClick={() =>
                setFields((p) => [
                  ...p,
                  {
                    sectionKey: "custom",
                    label: "Additional Answer",
                    helpText: "",
                    fieldType: "text",
                    required: false,
                    optionsText: "",
                  },
                ])
              }
              className="rounded-lg border border-indigo-600 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
            >
              + Add Form Field
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((f, idx) => (
              <div key={idx} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-4 dark:border-slate-800">
                <input
                  value={f.label}
                  onChange={(e) => {
                    const next = [...fields]
                    next[idx].label = e.target.value
                    setFields(next)
                  }}
                  placeholder="Field Label"
                  aria-label={`Field ${idx + 1} label`}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <select
                  value={f.fieldType}
                  onChange={(e) => {
                    const next = [...fields]
                    next[idx].fieldType = e.target.value
                    setFields(next)
                  }}
                  aria-label={`Field ${idx + 1} type`}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  {FORM_FIELD_TYPES.map((ft) => (
                    <option key={ft} value={ft}>{ft}</option>
                  ))}
                </select>
                <input
                  value={f.optionsText}
                  onChange={(e) => {
                    const next = [...fields]
                    next[idx].optionsText = e.target.value
                    setFields(next)
                  }}
                  placeholder="Options (comma-sep for dropdown/radio)"
                  aria-label={`Field ${idx + 1} options`}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => {
                        const next = [...fields]
                        next[idx].required = e.target.checked
                        setFields(next)
                      }}
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() => setFields((p) => p.filter((_, i) => i !== idx))}
                    className="text-xs font-semibold text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 dark:bg-slate-800/60">
            <div>
              <label htmlFor="elig-edu" className="block text-xs font-semibold">Allowed Education Levels</label>
              <input id="elig-edu" value={eligEdu} onChange={(e) => setEligEdu(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label htmlFor="elig-exp" className="block text-xs font-semibold">Min Experience Years (optional)</label>
              <input id="elig-exp" type="number" value={eligMinExp} onChange={(e) => setEligMinExp(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>

          <button type="button" onClick={saveFormBuilder} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Save Form & Server Eligibility Rules
          </button>
        </section>
      )}

      {tab === "operations" && selectedOpp && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <QrCode className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Live Check-In & Roster Ops
            </h2>
            {opsData?.metrics && (
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="font-bold text-lg">{opsData.metrics.registrations}</p>
                  <p className="text-slate-500">Registered</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="font-bold text-lg">{opsData.metrics.teams}</p>
                  <p className="text-slate-500">Teams</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="font-bold text-lg text-emerald-600">{opsData.metrics.checkedIn}</p>
                  <p className="text-slate-500">Checked In</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="font-bold text-lg">{opsData.metrics.submissions}</p>
                  <p className="text-slate-500">Submitted</p>
                </div>
              </div>
            )}
            <form onSubmit={runCheckIn} className="flex gap-2">
              <input
                required
                value={checkinUserId}
                onChange={(e) => setCheckinUserId(e.target.value)}
                placeholder="Participant User ID or QR token..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
                Check In
              </button>
            </form>
            {(opsData?.checkIns || []).slice(0, 5).map((ci: any) => (
              <div key={ci.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                <span>{ci.user?.displayName || ci.userId}</span>
                <span className="text-emerald-600">{ci.mode} · {new Date(ci.checkedInAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-2xl border border-amber-200 bg-white p-6 dark:border-amber-900/40 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-bold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" /> Contingency & Deadline Propagation
            </h2>
            <form onSubmit={triggerContingency} className="space-y-3">
              <input
                required
                value={contingencyReason}
                onChange={(e) => setContingencyReason(e.target.value)}
                placeholder="Incident reason (e.g., Network outage — extending sprint deadline by 4 hours)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                type="datetime-local"
                aria-label="Revised deadline"
                value={contingencyDeadline}
                onChange={(e) => setContingencyDeadline(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white">
                Propagate Contingency Update & Notify Participants
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === "judging" && selectedOpp && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={createRubricAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Scale className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Create Weighted Rubric (Total = 100%)
            </h2>
            <input value={rubricTitle} onChange={(e) => setRubricTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label>Technical ({c1Weight}%)</label>
                <input type="number" value={c1Weight} onChange={(e) => setC1Weight(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-1 dark:bg-slate-950" />
              </div>
              <div>
                <label>Impact ({c2Weight}%)</label>
                <input type="number" value={c2Weight} onChange={(e) => setC2Weight(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-1 dark:bg-slate-950" />
              </div>
              <div>
                <label>Demo ({c3Weight}%)</label>
                <input type="number" value={c3Weight} onChange={(e) => setC3Weight(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-1 dark:bg-slate-950" />
              </div>
            </div>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
              Save Weighted Rubric
            </button>
            <p className="text-xs text-slate-500">Existing rubrics: {judgingData.rubrics?.length || 0}</p>
          </form>

          <form onSubmit={assignJudgeAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold">Assign Blind Judge to Submission</h2>
            <select aria-label="Select submission" value={assignSubId} onChange={(e) => setAssignSubId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
              <option value="">Choose submission...</option>
              {(judgingData.submissions || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.title} ({s.id.slice(-6)})</option>
              ))}
            </select>
            <input required value={assignEvalId} onChange={(e) => setAssignEvalId(e.target.value)} placeholder="Evaluator User ID..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" />
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
              Assign Evaluator (Anti-Self-Review Checked)
            </button>
            <p className="text-xs text-slate-500">
              Active assignments: {judgingData.assignments?.length || 0} · Completed evaluations: {judgingData.evaluations?.length || 0}
            </p>
          </form>
        </div>
      )}

      {tab === "certificates" && selectedOpp && (
        <form onSubmit={issueCertificateAction} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Award className="h-5 w-5 text-emerald-600" aria-hidden="true" /> Issue Verifiable Certificate & QR Credential
          </h2>
          <input required value={certRecipientId} onChange={(e) => setCertRecipientId(e.target.value)} placeholder="Recipient User ID..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <input required value={certTitle} onChange={(e) => setCertTitle(e.target.value)} placeholder="Certificate Title" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            Issue Signed Certificate
          </button>
        </form>
      )}

      {tab === "microsite" && (
        <form onSubmit={saveMicrosite} className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Globe className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Branded Event Microsite Publisher (XSS-Sanitized)
          </h2>
          <input value={siteSlug} onChange={(e) => setSiteSlug(e.target.value)} placeholder="Microsite Slug (e.g., hackkro-grand-finale)" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} placeholder="Microsite Headline" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <input value={siteHeading} onChange={(e) => setSiteHeading(e.target.value)} placeholder="Section Heading" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <textarea rows={4} value={siteBodyHtml} onChange={(e) => setSiteBodyHtml(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950" />
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            Publish Sanitized Microsite
          </button>
        </form>
      )}

      {tab === "broadcast" && selectedOpp && (
        <form onSubmit={sendBroadcast} className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Bell className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Participant Broadcast Campaign
          </h2>
          <input required value={bcSubject} onChange={(e) => setBcSubject(e.target.value)} placeholder="Announcement subject..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <textarea required rows={4} value={bcMessage} onChange={(e) => setBcMessage(e.target.value)} placeholder="Write announcement for registered participants..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            Send Participant Announcement
          </button>
        </form>
      )}

      {tab === "webhooks" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={registerWebhook} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Webhook className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Organization Webhooks (HMAC Signed)
            </h2>
            <input required type="url" value={whUrl} onChange={(e) => setWhUrl(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              Register Webhook Endpoint
            </button>
            {whSecretPreview && (
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                One-time Signing Secret: <code className="font-mono font-bold">{whSecretPreview}</code>
              </div>
            )}
          </form>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold">Registered Endpoints ({webhooks.length})</h3>
            {webhooks.map((w) => (
              <div key={w.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                <p className="font-mono font-semibold">{w.url}</p>
                <p className="mt-1 text-slate-500">Deliveries recorded: {w.deliveries?.length || 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
