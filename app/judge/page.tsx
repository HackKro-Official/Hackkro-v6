"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { WorkspaceSwitcher } from "@/components/domain/WorkspaceSwitcher"
import { AlertTriangle, CheckCircle2, EyeOff, Scale, ShieldAlert } from "lucide-react"

interface AssignmentItem {
  id: string
  opportunityId: string
  opportunityTitle: string
  blindMode: boolean
  coiDeclared: boolean
  coiHasConflict: boolean
  status: string
  rubrics: Array<{
    id: string
    title: string
    trackName: string
    criteria: Array<{ id: string; name: string; description: string; weight: number; maxScore: number }>
  }>
  submission: {
    id: string
    title: string
    trackName: string
    status: string
    currentVersionNumber: number
    participantDisplay: string
    latestVersion: {
      summary: string
      repoUrl: string
      demoUrl: string
      videoUrl: string
      techStackJson: string
    } | null
    myEvaluation: {
      id: string
      totalScore: number
      evidenceNotes: string
      status: string
    } | null
  }
}

export default function JudgePage() {
  const { user, isLoading: authLoading } = useUserAuth()
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [evidenceNotes, setEvidenceNotes] = useState("")
  const [coiChecked, setCoiChecked] = useState(false)
  const [coiConflict, setCoiConflict] = useState(false)
  const [coiReason, setCoiReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadAssignments = async () => {
    setLoading(true)
    setErrorMsg(null)
    const res = await apiFetch<{ assignments: AssignmentItem[] }>("/api/v1/judging")
    if (res.success) {
      setAssignments(res.assignments)
      if (res.assignments.length > 0 && !selectedId) {
        setSelectedId(res.assignments[0].id)
      }
    } else {
      setErrorMsg((res.message || "Request failed."))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && user) void loadAssignments()
    else if (!authLoading) setLoading(false)
  }, [authLoading, user])

  const active = assignments.find((a) => a.id === selectedId) || null
  const rubric = active?.rubrics?.[0] || null

  const submitEvaluation = async (submitFinal: boolean) => {
    if (!active || !rubric) {
      setErrorMsg("No grading rubric found for this submission.")
      return
    }
    if (!coiChecked) {
      setErrorMsg("You must declare your Conflict of Interest attestation before scoring or recusing.")
      return
    }
    setErrorMsg(null)
    setStatusMsg(null)

    const criterionScores: Record<string, number> = {}
    rubric.criteria.forEach((c) => {
      criterionScores[c.id] = Number(scores[c.id] ?? Math.round(c.maxScore * 0.7))
    })

    const res = await apiFetch("/api/v1/judging", {
      method: "POST",
      body: JSON.stringify({
        action: "evaluate",
        submissionId: active.submission.id,
        rubricId: rubric.id,
        criterionScores,
        evidenceNotes,
        submitFinal,
        coiDeclared: coiChecked,
        coiHasConflict: coiConflict,
        coiReason,
      }),
    })

    if (!res.success) {
      setErrorMsg((res.message || "Request failed."))
      return
    }
    setStatusMsg(
      coiConflict
        ? "Conflict of interest declared — you have been recused from this submission."
        : submitFinal
        ? "Final weighted evaluation submitted to leaderboard & organizer audit log."
        : "Draft evaluation saved."
    )
    await loadAssignments()
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Evaluator / Judge Sign-In Required"
          description="Sign in with your Evaluator account (e.g., judge@hackkro.local) to review assigned submissions in blind mode."
          actionLabel="Go to Sign In"
          actionHref="/login?returnTo=/judge"
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Scale className="h-3.5 w-3.5" aria-hidden="true" /> Judge & Evaluator Workspace
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            Assigned Submission Reviews & Rubric Scoring
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Strictly scoped to assigned entries · Blind-mode masking & mandatory Conflict of Interest checks active
          </p>
        </div>
        <WorkspaceSwitcher />
      </header>

      {errorMsg && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {statusMsg}
        </div>
      )}

      {assignments.length === 0 ? (
        <EmptyState
          title="No assigned submissions right now"
          description="Evaluators only see entries explicitly assigned by an organizer after anti-COI checks."
          actionLabel="Explore Opportunities"
          actionHref="/discover"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <aside className="space-y-3" aria-label="Assigned Submissions Queue">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assigned Queue ({assignments.length})
            </h2>
            {assignments.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id)
                  setEvidenceNotes(item.submission.myEvaluation?.evidenceNotes || "")
                  setCoiChecked(item.coiDeclared)
                  setCoiConflict(item.coiHasConflict)
                }}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedId === item.id
                    ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={item.status} label={item.status} />
                  {item.blindMode && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <EyeOff className="h-3 w-3" aria-hidden="true" /> Blind
                    </span>
                  )}
                </div>
                <p className="mt-2 font-bold text-slate-900 dark:text-white">{item.submission.title}</p>
                <p className="text-xs text-slate-500">
                  {item.submission.participantDisplay} · {item.opportunityTitle}
                </p>
                {item.submission.myEvaluation && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Scored:{" "}
                    {item.submission.myEvaluation.totalScore}/100
                  </p>
                )}
              </button>
            ))}
          </aside>

          <section className="space-y-6 lg:col-span-2">
            {active ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {active.submission.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {active.submission.participantDisplay} · Track: {active.submission.trackName || "General"} · v
                      {active.submission.currentVersionNumber}
                    </p>
                  </div>
                  <StatusBadge status={active.status} label={active.status} />
                </div>

                {active.submission.latestVersion && (
                  <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
                    <p className="text-slate-700 dark:text-slate-200">
                      {active.submission.latestVersion.summary}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {active.submission.latestVersion.repoUrl && (
                        <span>Repo: {active.submission.latestVersion.repoUrl}</span>
                      )}
                      {active.submission.latestVersion.demoUrl && (
                        <span>Demo: {active.submission.latestVersion.demoUrl}</span>
                      )}
                      {active.submission.latestVersion.videoUrl && (
                        <span>Pitch Video: {active.submission.latestVersion.videoUrl}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Mandatory Conflict of Interest Attestation
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={coiChecked}
                      onChange={(e) => setCoiChecked(e.target.checked)}
                    />
                    <span>I attest that I have reviewed the Conflict of Interest policy for this entry.</span>
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                    <input
                      type="checkbox"
                      checked={coiConflict}
                      onChange={(e) => setCoiConflict(e.target.checked)}
                    />
                    <span>Declare Conflict of Interest & Recuse Myself Immediately</span>
                  </label>
                  {coiConflict && (
                    <input
                      type="text"
                      value={coiReason}
                      onChange={(e) => setCoiReason(e.target.value)}
                      placeholder="Brief COI reason (logged in audit trail)..."
                      className="mt-2 w-full rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs dark:border-rose-800 dark:bg-slate-950"
                    />
                  )}
                </div>

                {!coiConflict && rubric && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Rubric: {rubric.title}
                    </h3>
                    {rubric.criteria.map((c) => (
                      <div key={c.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <label htmlFor={`crit-${c.id}`} className="text-sm font-semibold">
                            {c.name} ({c.weight}% weight)
                          </label>
                          <span className="text-xs font-bold text-indigo-600">
                            {scores[c.id] ?? Math.round(c.maxScore * 0.7)} / {c.maxScore}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{c.description}</p>
                        <input
                          id={`crit-${c.id}`}
                          type="range"
                          min={0}
                          max={c.maxScore}
                          step={0.5}
                          value={scores[c.id] ?? Math.round(c.maxScore * 0.7)}
                          onChange={(e) =>
                            setScores((p) => ({ ...p, [c.id]: Number(e.target.value) }))
                          }
                          className="mt-2 w-full"
                        />
                      </div>
                    ))}

                    <div>
                      <label htmlFor="judge-evidence" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Evidence Notes & Constructive Feedback
                      </label>
                      <textarea
                        id="judge-evidence"
                        rows={3}
                        value={evidenceNotes}
                        onChange={(e) => setEvidenceNotes(e.target.value)}
                        placeholder="Cite architecture strengths, prototype behavior, or improvement areas..."
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {coiConflict ? (
                    <button
                      type="button"
                      onClick={() => submitEvaluation(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                    >
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Submit Recusal
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => submitEvaluation(false)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => submitEvaluation(true)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                      >
                        Submit Final Evaluation
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </main>
  )
}
