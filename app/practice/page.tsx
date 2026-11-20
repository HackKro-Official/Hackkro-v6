"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { Brain, CheckCircle2, MessageSquare, RefreshCw, Sparkles, Timer } from "lucide-react"

interface PracticeItem {
  id: string
  slug: string
  category: string
  companyTag: string
  roleTag: string
  skillTag: string
  topic: string
  difficulty: string
  prompt: string
  options: Array<{ id: string; label: string }>
}

export default function PracticePage() {
  const { isLoggedIn } = useUserAuth()
  const [items, setItems] = useState<PracticeItem[]>([])
  const [analytics, setAnalytics] = useState<{
    totalAttempts: number
    accuracyPercent: number
    averageSeconds: number
  } | null>(null)
  const [mockInterviews, setMockInterviews] = useState<any[]>([])
  const [category, setCategory] = useState("all")
  const [difficulty, setDifficulty] = useState("all")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, { isCorrect: boolean; explanation: string }>>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mock Interview state
  const [roleTitle, setRoleTitle] = useState("Full-Stack Software Engineer")
  const [experienceLevel, setExperienceLevel] = useState("Entry / New Grad (0-2 yrs)")
  const [interviewType, setInterviewType] = useState<"technical" | "behavioral" | "system_design" | "case">("system_design")
  const [q1Answer, setQ1Answer] = useState("")
  const [q2Answer, setQ2Answer] = useState("")
  const [consentTranscript, setConsentTranscript] = useState(true)
  const [submittingMock, setSubmittingMock] = useState(false)

  const loadPractice = async (cat = category, diff = difficulty) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (cat !== "all") params.set("category", cat)
    if (diff !== "all") params.set("difficulty", diff)
    const res = await apiFetch<{
      items: PracticeItem[]
      analytics: any
      mockInterviews: any[]
    }>(`/api/v1/practice?${params.toString()}`)
    if (res.success) {
      setItems(res.items)
      setAnalytics(res.analytics)
      setMockInterviews(res.mockInterviews)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadPractice()
  }, [category, difficulty])

  const submitAnswer = async (item: PracticeItem) => {
    setError(null)
    setMessage(null)
    if (!isLoggedIn) {
      setError("Please sign in to submit answers and track practice accuracy.")
      return
    }
    const chosen = answers[item.id]
    if (!chosen) {
      setError("Enter or select an answer first.")
      return
    }
    const res = await apiFetch<{ isCorrect: boolean; explanation: string }>("/api/v1/practice", {
      method: "POST",
      body: JSON.stringify({
        action: "submit_practice",
        practiceItemId: item.id,
        answer: chosen,
        timeSpentSeconds: 30,
      }),
    })
    if (!res.success) {
      setError((res.message || "Request failed."))
      return
    }
    setFeedback((prev) => ({
      ...prev,
      [item.id]: { isCorrect: res.isCorrect, explanation: res.explanation },
    }))
    await loadPractice()
  }

  const resetProgress = async () => {
    if (!isLoggedIn) return
    const res = await apiFetch("/api/v1/practice", { method: "DELETE" })
    if (res.success) {
      setFeedback({})
      setMessage("Practice attempt history reset cleanly.")
      await loadPractice()
    }
  }

  const runMockInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!isLoggedIn) {
      setError("Sign in to run a saved mock interview simulation.")
      return
    }
    setSubmittingMock(true)
    const res = await apiFetch<{ mockInterview: any }>("/api/v1/practice", {
      method: "POST",
      body: JSON.stringify({
        action: "mock_interview",
        roleTitle,
        experienceLevel,
        interviewType,
        durationMinutes: 15,
        consentedToTranscript: consentTranscript,
        responses: [
          {
            question: "How would you design an idempotent payment & registration pipeline under burst traffic?",
            answer: q1Answer || "Use database transactions, idempotency keys, and signed webhook verification.",
          },
          {
            question: "Describe a production bug or performance bottleneck you diagnosed and fixed.",
            answer: q2Answer || "Profiled N+1 queries, added composite indexes, and verified latency improvements.",
          },
        ],
      }),
    })
    setSubmittingMock(false)
    if (!res.success) {
      setError((res.message || "Request failed."))
      return
    }
    setMessage("AI Mock Interview report generated and saved below (advisory practice only).")
    setQ1Answer("")
    setQ2Answer("")
    await loadPractice()
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
            <Brain className="h-3.5 w-3.5" aria-hidden="true" /> Practice Hub & AI Mock Interviews
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Skill Practice, Company Prep & Mock Interview Lab
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Topic-tagged drills with instant server-graded explanations and clearly labeled advisory mock interviews.
          </p>
        </div>
        {analytics && (
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="text-xs text-slate-500">Attempts</p>
              <p className="font-bold text-slate-900 dark:text-white">{analytics.totalAttempts}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Accuracy</p>
              <p className="font-bold text-emerald-600">{analytics.accuracyPercent}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg Time</p>
              <p className="font-bold text-slate-900 dark:text-white">{analytics.averageSeconds}s</p>
            </div>
            <button
              type="button"
              onClick={resetProgress}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
            </button>
          </div>
        )}
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All Categories</option>
          <option value="coding">Coding</option>
          <option value="aptitude">Aptitude & Reasoning</option>
          <option value="sql">SQL</option>
          <option value="system_design">System Design</option>
          <option value="case">Case Study</option>
        </select>
        <select
          aria-label="Filter by difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2" aria-label="Practice Question Bank">
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ) : items.length === 0 ? (
            <EmptyState
              title="No practice questions match"
              description="Reset your category or difficulty filters to explore all drills."
              actionLabel="Show All"
              onAction={() => {
                setCategory("all")
                setDifficulty("all")
              }}
            />
          ) : (
            items.map((item) => {
              const resFb = feedback[item.id]
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.difficulty} label={item.difficulty} />
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.companyTag} · {item.topic}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {item.skillTag}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{item.prompt}</p>

                  {item.options && item.options.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {item.options.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <input
                            type="radio"
                            name={`practice-${item.id}`}
                            value={opt.id}
                            checked={answers[item.id] === opt.id}
                            onChange={() => setAnswers((p) => ({ ...p, [item.id]: opt.id }))}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <input
                        type="text"
                        aria-label={`Answer for ${item.topic}`}
                        value={answers[item.id] || ""}
                        onChange={(e) => setAnswers((p) => ({ ...p, [item.id]: e.target.value }))}
                        placeholder="Enter your concise technical answer..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => submitAnswer(item)}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Check Answer
                    </button>
                  </div>

                  {resFb && (
                    <div
                      className={`mt-4 rounded-xl border p-3 text-xs ${
                        resFb.isCorrect
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                      }`}
                    >
                      <p className="font-bold">{resFb.isCorrect ? "Correct!" : "Review Explanation:"}</p>
                      <p className="mt-1">{resFb.explanation}</p>
                    </div>
                  )}
                </article>
              )
            })
          )}
        </section>

        <aside className="space-y-6">
          <form
            onSubmit={runMockInterview}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-violet-600" aria-hidden="true" /> AI Mock Interview Simulator
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Clearly labeled advisory practice only — never treated as an automated hiring decision.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="mock-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Role
                </label>
                <input
                  id="mock-role"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="mock-level" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Level
                  </label>
                  <input
                    id="mock-level"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="mock-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Format
                  </label>
                  <select
                    id="mock-type"
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="system_design">System Design</option>
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="case">Case Study</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="mock-q1" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Prompt 1: Design an idempotent payment & registration pipeline under burst traffic.
                </label>
                <textarea
                  id="mock-q1"
                  rows={3}
                  value={q1Answer}
                  onChange={(e) => setQ1Answer(e.target.value)}
                  placeholder="Outline locking, idempotency keys, queues, and ledger immutability..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="mock-q2" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Prompt 2: Describe a difficult technical bug or bottleneck you resolved.
                </label>
                <textarea
                  id="mock-q2"
                  rows={3}
                  value={q2Answer}
                  onChange={(e) => setQ2Answer(e.target.value)}
                  placeholder="Use STAR format with measurable outcome metrics..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={consentTranscript}
                  onChange={(e) => setConsentTranscript(e.target.checked)}
                />
                <span>Save practice transcript to my private history (opt-out supported anytime).</span>
              </label>
              <button
                type="submit"
                disabled={submittingMock}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {submittingMock ? "Generating Advisory Report..." : "Submit Practice Interview"}
              </button>
            </div>
          </form>

          {mockInterviews.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Timer className="h-4 w-4 text-indigo-500" aria-hidden="true" /> Recent Mock Reports
              </h3>
              {mockInterviews.slice(0, 3).map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{m.roleTitle}</span>
                    <span className="text-indigo-600">Score: {m.aiFeedback?.overallScore ?? "-"}/100</span>
                  </div>
                  <p className="mt-1 text-[11px] italic text-slate-500">{m.aiFeedback?.disclaimer}</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-slate-600 dark:text-slate-300">
                    {(m.actionItems || []).map((act: string, i: number) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
