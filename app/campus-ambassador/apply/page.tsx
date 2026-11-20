"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { GraduationCap } from "lucide-react"

export default function CampusAmbassadorApplyPage() {
  const { user, isLoggedIn } = useUserAuth()
  const router = useRouter()
  const [institutionName, setInstitutionName] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [campaignNotes, setCampaignNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!isLoggedIn) {
      router.push("/signup?returnTo=/campus-ambassador/apply")
      return
    }
    setSubmitting(true)
    const res = await apiFetch("/api/v1/ambassadors", {
      method: "POST",
      body: JSON.stringify({
        action: "apply",
        institutionName,
        city,
        state,
        campaignNotes,
      }),
    })
    setSubmitting(false)
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    router.push("/campus-ambassador/dashboard")
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> HackKro Campus Ambassador
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
          Apply for Campus Ambassador Leadership
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {isLoggedIn
            ? `Applying as ${user?.displayName} (${user?.primaryEmail})`
            : "Sign in or create your HackKro student account first — no separate ambassador password needed."}
        </p>

        {!isLoggedIn && (
          <div className="mt-4 flex gap-3">
            <Link
              href="/login?returnTo=/campus-ambassador/apply"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Sign In with HackKro
            </Link>
            <Link
              href="/signup?returnTo=/campus-ambassador/apply"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700"
            >
              Create Account
            </Link>
          </div>
        )}

        {err && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="amb-inst" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              College / University Name
            </label>
            <input
              id="amb-inst"
              required
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="e.g., NIT Surathkal"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="amb-city" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                City
              </label>
              <input
                id="amb-city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="amb-state" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                State
              </label>
              <input
                id="amb-state"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>
          <div>
            <label htmlFor="amb-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Campus Outreach Plan
            </label>
            <textarea
              id="amb-notes"
              rows={3}
              required
              value={campaignNotes}
              onChange={(e) => setCampaignNotes(e.target.value)}
              placeholder="Tell us about your tech clubs, coding chapters, or event organizing experience..."
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Submitting Application..." : "Submit Ambassador Application"}
          </button>
        </form>
      </div>
    </main>
  )
}
