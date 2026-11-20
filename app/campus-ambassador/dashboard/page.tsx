"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { ResponsiveTable } from "@/components/domain/ResponsiveTable"
import { Award, Copy, Flag, GraduationCap, Share2, ShieldCheck } from "lucide-react"

export default function CampusAmbassadorDashboardPage() {
  const { user, isLoading: authLoading } = useUserAuth()
  const [ambassador, setAmbassador] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await apiFetch<{ ambassador: any }>("/api/v1/ambassadors")
    if (res.success) setAmbassador(res.ambassador)
    else setErr((res.message || "Request failed."))
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && user) void load()
    else if (!authLoading) setLoading(false)
  }, [authLoading, user])

  const copyReferral = async () => {
    if (!ambassador) return
    const url = `${window.location.origin}/discover?ref=${ambassador.referralCode}`
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const testClickTracking = async () => {
    if (!ambassador) return
    setMsg(null)
    const res = await apiFetch<{ tracked: boolean; flagged?: string }>("/api/v1/ambassadors", {
      method: "POST",
      body: JSON.stringify({ action: "track_click", referralCode: ambassador.referralCode }),
    })
    if (res.success) {
      setMsg(
        res.flagged
          ? `Self-referral fraud guard triggered (${res.flagged}) — recorded in event log below.`
          : "Referral link attribution click tracked."
      )
      await load()
    }
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Campus Ambassador Sign-In Required"
          description="Sign in with your HackKro account (e.g., student@hackkro.local) to inspect your Campus Ambassador referral code, attribution events, and reward points."
          actionLabel="Go to Sign In"
          actionHref="/login?returnTo=/campus-ambassador/dashboard"
        />
      </main>
    )
  }

  if (!ambassador) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="You are not yet enrolled as a Campus Ambassador"
          description="Apply in under 30 seconds to get a unique campus referral link, milestone rewards, and verified outreach analytics."
          actionLabel="Apply Now"
          actionHref="/campus-ambassador/apply"
        />
      </main>
    )
  }

  const referrals: any[] = ambassador.referralEvents || []
  const verifiedCount = referrals.filter((r) => r.status !== "flagged_fraud").length
  const flaggedCount = referrals.filter((r) => r.status === "flagged_fraud").length

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> Campus Ambassador Program
          </span>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {user.displayName} — {ambassador.institutionName}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {ambassador.city}, {ambassador.state} · Anti-self-referral fraud checks enforced automatically
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={ambassador.status} label={ambassador.status} />
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Tier: {ambassador.tier}
          </span>
        </div>
      </header>

      {err && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {err}
        </div>
      )}
      {msg && (
        <div role="status" className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          {msg}
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Referral Code</p>
          <p className="mt-1 font-mono text-lg font-bold text-indigo-600">{ambassador.referralCode}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Points Earned</p>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-slate-900 dark:text-white">
            <Award className="h-5 w-5 text-amber-500" aria-hidden="true" /> {ambassador.pointsEarned}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Tracked Attribution Events</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{verifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Fraud Guards Flagged</p>
          <p className="mt-1 flex items-center gap-1 text-2xl font-bold text-rose-600">
            <Flag className="h-4 w-4" aria-hidden="true" /> {flaggedCount}
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Share2 className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Shareable Campus Referral Link
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            /discover?ref={ambassador.referralCode}
          </code>
          <button
            type="button"
            onClick={copyReferral}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> {copied ? "Copied!" : "Copy Referral Link"}
          </button>
          <button
            type="button"
            onClick={testClickTracking}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verify Anti-Fraud Guard
          </button>
        </div>
      </section>

      <ResponsiveTable
        caption="Campus Ambassador Referral Attribution Events"
        headers={["Timestamp", "Code", "Status", "Notes"]}
      >
        {referrals.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
              No referral events logged yet. Share your link with peers on campus!
            </td>
          </tr>
        ) : (
          referrals.map((ev) => (
            <tr key={ev.id}>
              <td className="px-4 py-3 text-xs text-slate-500">
                {new Date(ev.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{ev.referralCode}</td>
              <td className="px-4 py-3">
                <StatusBadge status={ev.status} label={ev.status} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                {ev.fraudReason || ev.opportunity?.title || ev.referredUser?.displayName || "Verified referral click"}
              </td>
            </tr>
          ))
        )}
      </ResponsiveTable>
    </main>
  )
}
