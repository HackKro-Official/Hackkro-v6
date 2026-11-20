"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { CheckCircle2 } from "lucide-react"

export default function FeedbackPage() {
  const [reason, setReason] = useState("")
  const [email, setEmail] = useState("")
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketRef, setTicketRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    setReason(sp.get("reason") || "general_feedback")
    setEmail(sp.get("email") || "")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const res = await apiFetch<{ ticket: { referenceId: string } }>("/api/v1/admin", {
      method: "POST",
      body: JSON.stringify({
        action: "create_ticket",
        email: email || "guest@hackkro.local",
        category: "feedback",
        priority: "low",
        subject: `Platform Feedback (${reason})`,
        message: feedback || reason,
      }),
    })
    setIsSubmitting(false)
    if (!res.success) {
      setError((res.message || "Request failed."))
      return
    }
    setTicketRef(res.ticket.referenceId)
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {ticketRef ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              Feedback Recorded
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Reference ID: <code className="font-mono font-bold text-indigo-600">{ticketRef}</code>
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Return Home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Share Product or Email Preference Feedback
            </h1>
            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="fb-email" className="block text-xs font-semibold">
                Contact Email (optional)
              </label>
              <input
                id="fb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="fb-msg" className="block text-xs font-semibold">
                Your Feedback
              </label>
              <textarea
                id="fb-msg"
                rows={4}
                required
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us how we can improve HackKro..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
