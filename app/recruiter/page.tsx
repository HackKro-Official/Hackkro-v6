"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { ATS_CANONICAL_STAGES } from "@/config/taxonomies"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { ResponsiveTable } from "@/components/domain/ResponsiveTable"
import { WorkspaceSwitcher } from "@/components/domain/WorkspaceSwitcher"
import {
  Briefcase,
  Calendar,
  FileCheck,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"

export default function RecruiterPage() {
  const { user, isLoading: authLoading } = useUserAuth()
  const [tab, setTab] = useState<"pipeline" | "requisitions" | "sourcing">("pipeline")
  const [requisitions, setRequisitions] = useState<any[]>([])
  const [sourcing, setSourcing] = useState<{
    candidates: any[]
    pools: any[]
    savedSearches: any[]
    campaigns: any[]
  }>({ candidates: [], pools: [], savedSearches: [], campaigns: [] })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // New Requisition state
  const [title, setTitle] = useState("")
  const [shortSummary, setShortSummary] = useState("")
  const [fullDescription, setFullDescription] = useState("")
  const [employmentType, setEmploymentType] = useState<"full_time" | "internship" | "contract">("full_time")
  const [department, setDepartment] = useState("Engineering")
  const [locationMode, setLocationMode] = useState<"online" | "offline" | "hybrid">("hybrid")
  const [locationText, setLocationText] = useState("Bengaluru, India")
  const [salaryShared, setSalaryShared] = useState(true)
  const [salaryMin, setSalaryMin] = useState("1400000")
  const [salaryMax, setSalaryMax] = useState("2200000")
  const [skillsText, setSkillsText] = useState("TypeScript, PostgreSQL, Next.js")

  // Stage Move / Private Note / Interview / Offer per selected candidate
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [targetStage, setTargetStage] = useState<string>("screening")
  const [privateNote, setPrivateNote] = useState("")
  const [participantNote, setParticipantNote] = useState("")
  const [interviewStart, setInterviewStart] = useState("")
  const [scorecardRec, setScorecardRec] = useState("strong_yes")
  const [scorecardNotes, setScorecardNotes] = useState("")
  const [offerComp, setOfferComp] = useState("18 LPA + ESOPs")

  // Sourcing filters & actions
  const [skillFilter, setSkillFilter] = useState("")
  const [poolName, setPoolName] = useState("")
  const [selectedPoolId, setSelectedPoolId] = useState("")
  const [outreachSubject, setOutreachSubject] = useState("Invitation to interview at NovaTech Cloud")

  const loadWorkspace = async () => {
    setLoading(true)
    setErr(null)
    const [reqRes, srcRes] = await Promise.all([
      apiFetch<{ requisitions: any[] }>("/api/v1/recruiter/requisitions"),
      apiFetch<any>(
        `/api/v1/recruiter/sourcing?skill=${encodeURIComponent(skillFilter)}`
      ),
    ])
    if (reqRes.success) {
      setRequisitions(reqRes.requisitions)
      if (!selectedAppId) {
        const firstCand = reqRes.requisitions[0]?.candidateStages[0]
        if (firstCand) setSelectedAppId(firstCand.applicationId)
      }
    } else {
      setErr((reqRes.message || "Request failed."))
    }
    if (srcRes.success) {
      setSourcing({ candidates: srcRes.candidates || [], pools: srcRes.pools || [], savedSearches: srcRes.savedSearches || [], campaigns: srcRes.campaigns || [] })
      if (!selectedPoolId && srcRes.pools[0]) setSelectedPoolId(srcRes.pools[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && user) void loadWorkspace()
    else if (!authLoading) setLoading(false)
  }, [authLoading, user?.activeOrganizationId, user?.activeRole])

  const allCandidates = requisitions.flatMap((r) =>
    r.candidateStages.map((cs: any) => ({ ...cs, requisitionTitle: r.opportunity.title }))
  )
  const activeCandidate = allCandidates.find((c) => c.applicationId === selectedAppId) || null

  const createReq = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!user?.activeOrganizationId) {
      setErr("Switch to a Recruiter organization workspace first.")
      return
    }
    const res = await apiFetch("/api/v1/recruiter/requisitions", {
      method: "POST",
      body: JSON.stringify({
        organizationId: user.activeOrganizationId,
        title,
        shortSummary,
        fullDescription,
        employmentType,
        department,
        locationMode,
        locationText,
        salaryShared,
        salaryMin: salaryShared ? Number(salaryMin) : null,
        salaryMax: salaryShared ? Number(salaryMax) : null,
        skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg("Job requisition published to the Jobs Marketplace & ATS.")
    setTitle("")
    setShortSummary("")
    setFullDescription("")
    setTab("pipeline")
    await loadWorkspace()
  }

  const pipelinePost = async (body: Record<string, unknown>, okMessage: string) => {
    setErr(null)
    setMsg(null)
    const res = await apiFetch("/api/v1/recruiter/pipeline", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(okMessage)
    await loadWorkspace()
  }

  const sourcingPost = async (body: Record<string, unknown>, okMessage: string) => {
    setErr(null)
    setMsg(null)
    const res = await apiFetch("/api/v1/recruiter/sourcing", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setMsg(okMessage)
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
          title="Recruiter Authentication Required"
          description="Sign in with a Recruiter / Hiring Manager account (e.g., recruiter@hackkro.local) to access your tenant-isolated ATS."
          actionLabel="Go to Sign In"
          actionHref="/login?returnTo=/recruiter"
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" /> Recruiter & Employer ATS Workspace
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            Hiring Pipeline, Interviews, Offers & Consented Talent Sourcing
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Active Role: <strong>{user.activeRole}</strong> · Strict organization tenant isolation enabled
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WorkspaceSwitcher />
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            { id: "pipeline", label: `ATS Pipeline (${allCandidates.length})` },
            { id: "requisitions", label: `Requisitions (${requisitions.length}) & Post Job` },
            { id: "sourcing", label: `Talent Sourcing (${sourcing.candidates.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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

      {tab === "pipeline" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {allCandidates.length === 0 ? (
              <EmptyState
                title="No candidates in this organization's pipeline yet"
                description="Switch to a recruiter organization workspace or publish a new job requisition."
                actionLabel="Post a Job Requisition"
                onAction={() => setTab("requisitions")}
              />
            ) : (
              <ResponsiveTable
                caption="Applicant Tracking System Candidates"
                headers={["Candidate", "Role", "Stage", "AI / Notes", "Action"]}
              >
                {allCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {c.application.user.displayName}
                      </p>
                      <p className="text-xs text-slate-500">{c.application.user.primaryEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {c.requisitionTitle}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.canonicalStage} label={c.canonicalStage.replace(/_/g, " ")} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.privateNotes?.length || 0} private note(s) · {c.application.interviews?.length || 0} interview(s)
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppId(c.applicationId)
                          setTargetStage(c.canonicalStage)
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </ResponsiveTable>
            )}
          </div>

          <aside className="space-y-4">
            {activeCandidate ? (
              <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeCandidate.application.user.displayName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeCandidate.requisitionTitle} · Stage: {activeCandidate.canonicalStage}
                  </p>
                  {activeCandidate.application.resumeVersion && (
                    <p className="mt-1 text-xs text-indigo-600">
                      Resume Snapshot: {activeCandidate.application.resumeVersion.title} ({activeCandidate.application.resumeVersion.fileName})
                    </p>
                  )}
                </div>

                {/* Stage Transition + Private Notes */}
                <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <label htmlFor="ats-stage-select" className="block text-xs font-bold uppercase text-slate-500">
                    Move Canonical ATS Stage (15-Stage Pipeline)
                  </label>
                  <select
                    id="ats-stage-select"
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    {ATS_CANONICAL_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={privateNote}
                    onChange={(e) => setPrivateNote(e.target.value)}
                    placeholder="Private recruiter note (hidden from candidate)..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  <input
                    type="text"
                    value={participantNote}
                    onChange={(e) => setParticipantNote(e.target.value)}
                    placeholder="Public status update note for candidate..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      pipelinePost(
                        {
                          action: "move_stage",
                          applicationId: activeCandidate.applicationId,
                          canonicalStage: targetStage,
                          reason: "recruiter_review",
                          privateNote,
                          participantNote,
                        },
                        `Moved candidate to ${targetStage}.`
                      )
                    }
                    className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Save Stage & Notes
                  </button>
                </div>

                {/* Advisory AI Summary */}
                <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 dark:text-violet-300">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Advisory AI Candidate Brief
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        pipelinePost(
                          {
                            action: "ai_summary",
                            applicationId: activeCandidate.applicationId,
                            humanReviewed: true,
                          },
                          "AI Candidate Brief generated and marked human-reviewed."
                        )
                      }
                      className="rounded border border-violet-300 px-2 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-800 dark:text-violet-300"
                    >
                      Generate / Review AI Brief
                    </button>
                  </div>
                  {activeCandidate.aiSummary?.highlights && (
                    <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
                      {activeCandidate.aiSummary.highlights.map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Interview Scheduling & Scorecard */}
                <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <p className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" /> Schedule Interview (Conflict-Checked)
                  </p>
                  <input
                    type="datetime-local"
                    aria-label="Interview start time"
                    value={interviewStart}
                    onChange={(e) => setInterviewStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const s = interviewStart ? new Date(interviewStart) : new Date(Date.now() + 86400000)
                      const e = new Date(s.getTime() + 45 * 60000)
                      void pipelinePost(
                        {
                          action: "schedule_interview",
                          applicationId: activeCandidate.applicationId,
                          panelUserIds: [user.id],
                          scheduledStartAt: s.toISOString(),
                          scheduledEndAt: e.toISOString(),
                          timezone: user.timezone,
                        },
                        "Interview scheduled cleanly without time conflicts."
                      )
                    }}
                    className="w-full rounded-lg border border-indigo-600 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300"
                  >
                    Schedule 45-Min Interview
                  </button>

                  {activeCandidate.application.interviews?.length > 0 && (
                    <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                      <p className="text-[11px] font-bold">Submit Interviewer Scorecard</p>
                      <select
                        aria-label="Overall recommendation"
                        value={scorecardRec}
                        onChange={(e) => setScorecardRec(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="strong_yes">Strong Yes</option>
                        <option value="yes">Yes</option>
                        <option value="mixed">Mixed</option>
                        <option value="no">No</option>
                      </select>
                      <input
                        type="text"
                        value={scorecardNotes}
                        onChange={(e) => setScorecardNotes(e.target.value)}
                        placeholder="Evidence-backed notes..."
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          pipelinePost(
                            {
                              action: "submit_scorecard",
                              interviewId: activeCandidate.application.interviews[0].id,
                              competencies: [{ name: "Problem Solving", score: 4 }],
                              overallRecommendation: scorecardRec,
                              evidenceNotes: scorecardNotes,
                            },
                            "Interviewer scorecard recorded."
                          )
                        }
                        className="w-full rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white dark:bg-slate-700"
                      >
                        Submit Scorecard
                      </button>
                    </div>
                  )}
                </div>

                {/* Offer Workflow */}
                <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <p className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Multi-Approval Offer Workflow
                  </p>
                  <input
                    type="text"
                    aria-label="Compensation package summary"
                    value={offerComp}
                    onChange={(e) => setOfferComp(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  {activeCandidate.application.offer ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Current Offer Status: <strong>{activeCandidate.application.offer.status}</strong> (v{activeCandidate.application.offer.version})
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        pipelinePost(
                          {
                            action: "offer",
                            offerAction: "create_draft",
                            applicationId: activeCandidate.applicationId,
                            compensationSummary: { package: offerComp },
                          },
                          "Offer draft created and routed for Comp Approval."
                        )
                      }
                      className="rounded-lg border border-emerald-600 px-2 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                    >
                      1. Draft Offer
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        pipelinePost(
                          {
                            action: "offer",
                            offerAction: "approve_comp",
                            applicationId: activeCandidate.applicationId,
                          },
                          "Compensation approved -> Legal/HR Approval."
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold dark:border-slate-700"
                    >
                      2. Comp Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        pipelinePost(
                          {
                            action: "offer",
                            offerAction: "approve_hr",
                            applicationId: activeCandidate.applicationId,
                          },
                          "Legal/HR approved -> Ready to send."
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold dark:border-slate-700"
                    >
                      3. HR Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        pipelinePost(
                          {
                            action: "offer",
                            offerAction: "send",
                            applicationId: activeCandidate.applicationId,
                          },
                          "Offer sent to candidate!"
                        )
                      }
                      className="rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white"
                    >
                      4. Send Offer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                Click &ldquo;Inspect&rdquo; on any candidate row to manage stages, private notes, interviews, scorecards, and offers.
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === "requisitions" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <form
            onSubmit={createReq}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Job / Internship Requisition</h2>
            <div>
              <label htmlFor="req-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Role Title
              </label>
              <input
                id="req-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Backend Distributed Systems Engineer"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="req-summary" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Short Summary
              </label>
              <input
                id="req-summary"
                required
                value={shortSummary}
                onChange={(e) => setShortSummary(e.target.value)}
                placeholder="Concise pitch shown on job discovery cards"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="req-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Role Description & Responsibilities
              </label>
              <textarea
                id="req-desc"
                rows={4}
                required
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                aria-label="Employment Type"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="full_time">Full-Time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
              <select
                aria-label="Location Mode"
                value={locationMode}
                onChange={(e) => setLocationMode(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="hybrid">Hybrid</option>
                <option value="online">Remote / Online</option>
                <option value="offline">On-site</option>
              </select>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Department"
                aria-label="Department"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Location"
                aria-label="Location"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Comma-separated skills"
                aria-label="Required skills"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={salaryShared}
                  onChange={(e) => setSalaryShared(e.target.checked)}
                />
                <span>Disclose transparent salary band (shows Salary badge instead of &ldquo;Salary not shared&rdquo;)</span>
              </label>
              {salaryShared && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="Min INR/year"
                    aria-label="Minimum salary"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="Max INR/year"
                    aria-label="Maximum salary"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Publish Requisition to Jobs & ATS
            </button>
          </form>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Tenant Requisitions</h2>
            {requisitions.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">{r.opportunity.title}</h3>
                  <StatusBadge status={r.status} label={r.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {r.opportunity.department} · {r.opportunity.locationText} · {r.candidateStages.length} candidate(s)
                </p>
                <Link
                  href={`/opportunities/${r.opportunity.slug}`}
                  className="mt-3 inline-block text-xs font-semibold text-indigo-600 underline"
                >
                  View Public Listing →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "sourcing" && (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Filter consented talent by skill"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  placeholder="Filter by verified/self-reported skill (e.g., TypeScript)..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={loadWorkspace}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Search Talent
              </button>
              <button
                type="button"
                onClick={() =>
                  sourcingPost(
                    {
                      action: "save_search",
                      name: skillFilter ? `Skill: ${skillFilter}` : "All Consented Talent",
                      filters: { skill: skillFilter },
                    },
                    "Search criteria saved to team saved searches."
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
              >
                Save Search
              </button>
            </div>

            {sourcing.candidates.length === 0 ? (
              <EmptyState
                title="No consented talent matches"
                description="Only candidates who explicitly opt into recruiter discovery appear here (respecting contact-sharing privacy)."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {sourcing.candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <h3 className="font-bold text-slate-900 dark:text-white">{cand.displayName}</h3>
                    <p className="text-xs text-slate-500">
                      {cand.headline || cand.college} · {cand.location || "Remote"}
                    </p>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      {cand.contactEmail
                        ? `Contact: ${cand.contactEmail}`
                        : "Direct email hidden until candidate accepts outreach (Privacy Enforced)"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(cand.skills || []).map((s: any, i: number) => (
                        <span
                          key={i}
                          className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        >
                          {s.name} ({s.provenance})
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedPoolId && (
                        <button
                          type="button"
                          onClick={() =>
                            sourcingPost(
                              {
                                action: "add_to_pool",
                                poolId: selectedPoolId,
                                userId: cand.id,
                                reason: `Matched search (${skillFilter || "general"})`,
                              },
                              `Added ${cand.displayName} to selected talent pool.`
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-600 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                        >
                          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add to Pool
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          sourcingPost(
                            {
                              action: "send_outreach",
                              recipientIds: [cand.id],
                              subject: outreachSubject,
                              bodyTemplate: "We reviewed your verified skills and would love to invite you to apply.",
                            },
                            `Outreach notification sent to ${cand.displayName}.`
                          )
                        }
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Send Outreach
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Users className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Talent Pools (TTL Retention)
              </h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  placeholder="New pool name..."
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!poolName.trim()) return
                    void sourcingPost(
                      { action: "create_pool", name: poolName, retentionDays: 180 },
                      "Talent pool created with 180-day consent retention."
                    )
                    setPoolName("")
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Create
                </button>
              </div>
              {sourcing.pools.length > 0 && (
                <select
                  aria-label="Active talent pool"
                  value={selectedPoolId}
                  onChange={(e) => setSelectedPoolId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  {sourcing.pools.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.candidates?.length || 0} candidates)
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <label htmlFor="outreach-subject" className="font-semibold">
                  Outreach Subject Template
                </label>
                <input
                  id="outreach-subject"
                  value={outreachSubject}
                  onChange={(e) => setOutreachSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
