"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clock, Code2, Play, ShieldAlert, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function AssessmentEnginePage() {
  const { isLoggedIn } = useUserAuth()
  const { toast } = useToast()

  const [assessments, setAssessments] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [proctoringConsented, setProctoringConsented] = useState(false)
  const [extraMinutes, setExtraMinutes] = useState(0)
  const [remainingSec, setRemainingSec] = useState(0)
  const [codeRunOutput, setCodeRunOutput] = useState<any>(null)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [appealNotes, setAppealNotes] = useState("")

  useEffect(() => {
    apiFetch("/api/v1/assessments").then((res) => {
      if (res.success) setAssessments(res.assessments || [])
    })
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!activeSession || remainingSec <= 0) return
    const id = setInterval(() => {
      setRemainingSec((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [activeSession, remainingSec])

  // Proctoring visibility/tab-switch listener (logs evidence for human review ONLY)
  useEffect(() => {
    if (!activeSession) return
    const handleVisibility = () => {
      if (document.hidden) {
        apiFetch(`/api/v1/assessments/${activeSession.assessment.id}/attempt`, {
          method: "POST",
          body: JSON.stringify({
            action: "proctor_signal",
            attemptId: activeSession.attemptId,
            signalType: "tab_switch",
            details: { timestamp: new Date().toISOString() },
          }),
        })
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [activeSession])

  const startAssessment = async (assessmentId: string) => {
    if (!isLoggedIn) {
      toast({ title: "Sign in required", description: "Please sign in before starting an assessment.", variant: "destructive" })
      return
    }
    const res = await apiFetch(`/api/v1/assessments/${assessmentId}/attempt`, {
      method: "POST",
      body: JSON.stringify({
        action: "start",
        proctoringConsented,
        accommodationExtraMinutes: extraMinutes,
      }),
    })
    if (res.success) {
      setActiveSession(res)
      setAnswers(res.savedAnswers || {})
      setRemainingSec(res.remainingSeconds || 1800)
      setSubmitResult(null)
    } else {
      toast({ title: "Cannot start assessment", description: res.message, variant: "destructive" })
    }
  }

  const autosave = async (nextAnswers: Record<string, any>) => {
    setAnswers(nextAnswers)
    if (!activeSession) return
    await apiFetch(`/api/v1/assessments/${activeSession.assessment.id}/attempt`, {
      method: "POST",
      body: JSON.stringify({
        action: "autosave",
        attemptId: activeSession.attemptId,
        answers: nextAnswers,
      }),
    })
  }

  const runCodeTests = async (questionId: string, code: string) => {
    const res = await apiFetch(`/api/v1/assessments/${activeSession.assessment.id}/attempt`, {
      method: "POST",
      body: JSON.stringify({ action: "run_code", questionId, code }),
    })
    if (res.success) setCodeRunOutput(res.execution)
  }

  const submitFinal = async () => {
    const res = await apiFetch(`/api/v1/assessments/${activeSession.assessment.id}/attempt`, {
      method: "POST",
      body: JSON.stringify({
        action: "submit",
        attemptId: activeSession.attemptId,
        answers,
      }),
    })
    if (res.success) {
      setSubmitResult(res)
      toast({ title: "Assessment submitted and graded!" })
    } else {
      toast({ title: "Submission error", description: res.message, variant: "destructive" })
    }
  }

  const submitAppeal = async () => {
    if (!activeSession || !appealNotes.trim()) return
    const res = await apiFetch(`/api/v1/assessments/${activeSession.assessment.id}/attempt`, {
      method: "POST",
      body: JSON.stringify({ action: "appeal", attemptId: activeSession.attemptId, appealNotes }),
    })
    if (res.success) {
      toast({ title: "Appeal logged", description: "A human reviewer will review your session within SLA." })
      setAppealNotes("")
    }
  }

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Code2 className="h-6 w-6 text-blue-600" /> Assessment Engine &amp; Isolated Coding Sandbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Supports MCQ, Multi-select, Numerical, Short-Text, and VM-sandboxed JavaScript tests with accommodations and transparent proctoring consent.
        </p>
      </div>

      {!activeSession ? (
        <div className="space-y-4">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-base">Pre-Assessment Proctoring Notice &amp; Accommodations</CardTitle>
              <CardDescription>
                Proctoring signals (tab-switch counts, connectivity drops) are review indicators only and never auto-reject candidates. Approved accessibility extra time is built directly into the timer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Checkbox id="proctor-consent" checked={proctoringConsented} onCheckedChange={(v) => setProctoringConsented(Boolean(v))} />
                <Label htmlFor="proctor-consent" className="cursor-pointer">
                  I acknowledge the integrity notice and consent to session anomaly logging during this attempt.
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="acc-time">Accessibility Accommodation Extra Time (minutes):</Label>
                <Input
                  id="acc-time"
                  type="number"
                  min={0}
                  max={60}
                  value={extraMinutes}
                  onChange={(e) => setExtraMinutes(Number(e.target.value))}
                  className="w-24 h-9"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {assessments.map((a) => (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{a.title}</CardTitle>
                  <CardDescription>{a.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex gap-3 text-muted-foreground">
                    <span>Duration: {a.durationMinutes} min</span>
                    <span>Questions: {a._count?.questions || 0}</span>
                    <span>Negative marking: {a.negativeMarkingRatio * 100}%</span>
                  </div>
                  {isLoggedIn ? (
                    <Button onClick={() => startAssessment(a.id)} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Start Assessment Attempt
                    </Button>
                  ) : (
                    <Button asChild variant="outline"><Link href="/login?returnTo=/test">Sign in to Start</Link></Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : submitResult ? (
        <Card className="border-emerald-500/40">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" /> Assessment Submitted
            </CardTitle>
            <CardDescription>Scoring algorithm v1.0 • Proctor risk band: <StatusBadge status={submitResult.proctorRiskBand} /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitResult.resultsPublished ? (
              <div className="rounded-xl border bg-muted/40 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Normalized Score</p>
                  <p className="text-3xl font-extrabold text-blue-600">{submitResult.score}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Raw Points</p>
                  <p className="text-xl font-bold">{submitResult.rawScore}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Results will be visible once published by the organizer.</p>
            )}

            <div className="rounded-lg border p-3 space-y-2 text-xs">
              <p className="font-semibold flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-amber-500" /> Need to explain a connectivity drop or proctoring flag?</p>
              <div className="flex gap-2">
                <Input value={appealNotes} onChange={(e) => setAppealNotes(e.target.value)} placeholder="Describe context for human review..." />
                <Button size="sm" variant="outline" onClick={submitAppeal}>File Review Note</Button>
              </div>
            </div>

            <Button onClick={() => setActiveSession(null)} variant="outline">Back to Assessments</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 backdrop-blur p-3 shadow-sm">
            <div>
              <p className="font-bold text-sm">{activeSession.assessment.title}</p>
              <p className="text-xs text-muted-foreground">Autosave active</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-blue-600">
                <Clock className="h-4 w-4" />
                {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
              </span>
              <Button onClick={submitFinal} className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                Submit Assessment
              </Button>
            </div>
          </div>

          {activeSession.questions.map((q: any) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Question {q.number} • {q.topic} ({q.difficulty})</span>
                  <span>{q.points} pts • {q.format.replace("_", " ")}</span>
                </div>
                <CardTitle className="text-base leading-relaxed">{q.prompt}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {q.format === "mcq_single" && (
                  <div className="space-y-2">
                    {q.options.map((opt: any) => (
                      <label key={opt.id} className="flex items-center gap-2.5 rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/40">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === opt.id}
                          onChange={() => autosave({ ...answers, [q.id]: opt.id })}
                          className="accent-blue-600"
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.format === "mcq_multi" && (
                  <div className="space-y-2">
                    {q.options.map((opt: any) => {
                      const current: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : []
                      const checked = current.includes(opt.id)
                      return (
                        <label key={opt.id} className="flex items-center gap-2.5 rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/40">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v ? [...current, opt.id] : current.filter((x) => x !== opt.id)
                              autosave({ ...answers, [q.id]: next })
                            }}
                          />
                          <span>{opt.text}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {q.format === "numerical" && (
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => autosave({ ...answers, [q.id]: e.target.value })}
                    placeholder="Enter numerical answer"
                    className="max-w-xs"
                  />
                )}

                {q.format === "coding" && (
                  <div className="space-y-3">
                    <Textarea
                      rows={8}
                      className="font-mono text-xs"
                      value={answers[q.id] ?? q.codeSnippet}
                      onChange={(e) => autosave({ ...answers, [q.id]: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => runCodeTests(q.id, answers[q.id] ?? q.codeSnippet)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" /> Run Public Test Cases in Sandbox
                      </Button>
                    </div>
                    {codeRunOutput && (
                      <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                        <p className="font-bold">
                          Passed {codeRunOutput.passedCount} / {codeRunOutput.totalCount} public cases ({codeRunOutput.durationMs} ms, {codeRunOutput.executionMode})
                        </p>
                        {codeRunOutput.cases.map((c: any) => (
                          <div key={c.index} className={c.passed ? "text-emerald-600" : "text-rose-600"}>
                            Case {c.index}: {c.passed ? "PASSED" : `FAILED (${c.error || `got ${c.actual}, expected ${c.expected}`})`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
