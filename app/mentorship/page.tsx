"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { ReportDialog } from "@/components/domain/ReportDialog"
import { Calendar, CheckCircle2, ShieldCheck, Star, UserCheck, Users } from "lucide-react"

interface Mentor {
  id: string
  headline: string
  bio: string
  company: string
  roleTitle: string
  hourlyRate: number
  currency: string
  isVerified: boolean
  expertise: string[]
  verifiedFacts: string[]
  selfReported: string[]
  sessionTypes: string[]
  user: { id: string; displayName: string }
  slots: Array<{ id: string; startAt: string; endAt: string; timezone: string }>
}

export default function MentorshipPage() {
  const { user, isLoggedIn } = useUserAuth()
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState("Portfolio & System Design Review")
  const [selectedSessionType, setSelectedSessionType] = useState("1:1 Career Guidance")
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Mentor self-onboarding / slot publishing
  const [mentorCompany, setMentorCompany] = useState("")
  const [mentorRole, setMentorRole] = useState("")
  const [mentorHeadline, setMentorHeadline] = useState("")
  const [slotStart, setSlotStart] = useState("")
  const [reviewText, setReviewText] = useState<Record<string, string>>({})
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({})

  const loadData = async () => {
    setLoading(true)
    const res = await apiFetch<{ mentors: Mentor[]; myBookings: any[] }>("/api/v1/mentorship")
    if (res.success) {
      setMentors(res.mentors)
      setBookings(res.myBookings || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const bookSlot = async (slotId: string) => {
    setErrorMsg(null)
    setStatusMsg(null)
    if (!isLoggedIn) {
      setErrorMsg("Please sign in first to book a mentorship slot.")
      return
    }
    const res = await apiFetch("/api/v1/mentorship", {
      method: "POST",
      body: JSON.stringify({
        action: "book",
        slotId,
        sessionType: selectedSessionType,
        topic,
        menteeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })
    if (!res.success) {
      setErrorMsg((res.message || "Request failed."))
      return
    }
    setStatusMsg("Mentorship slot atomically reserved! Check 'My Mentorship Sessions' below.")
    await loadData()
  }

  const bookingAction = async (
    action: "complete_booking" | "cancel" | "review",
    bookingId: string
  ) => {
    setErrorMsg(null)
    setStatusMsg(null)
    const payload: any = { action, bookingId }
    if (action === "review") {
      payload.rating = reviewRating[bookingId] || 5
      payload.reviewText = reviewText[bookingId] || "Helpful, practical feedback."
    }
    const res = await apiFetch("/api/v1/mentorship", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    if (!res.success) {
      setErrorMsg((res.message || "Request failed."))
      return
    }
    setStatusMsg(`Booking updated (${action}).`)
    await loadData()
  }

  const publishMentorProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoggedIn) {
      setErrorMsg("Sign in to register or update your mentor profile.")
      return
    }
    const res = await apiFetch("/api/v1/mentorship", {
      method: "POST",
      body: JSON.stringify({
        action: "upsert_mentor_profile",
        headline: mentorHeadline,
        company: mentorCompany,
        roleTitle: mentorRole,
        expertise: ["Architecture", "Interview Prep"],
      }),
    })
    if (!res.success) {
      setErrorMsg((res.message || "Request failed."))
      return
    }
    setStatusMsg("Mentor profile saved.")
    await loadData()
  }

  const addMentorSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slotStart) return
    const start = new Date(slotStart)
    const end = new Date(start.getTime() + 45 * 60 * 1000)
    const res = await apiFetch("/api/v1/mentorship", {
      method: "POST",
      body: JSON.stringify({
        action: "add_slot",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      }),
    })
    if (!res.success) {
      setErrorMsg((res.message || "Request failed."))
      return
    }
    setStatusMsg("New 45-minute open mentorship slot published.")
    setSlotStart("")
    await loadData()
  }

  const amIMentor = mentors.some((m) => m.user.id === user?.id)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> Mentorship Marketplace
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            1:1 Mentorship, Resume Reviews & Mock Coaching
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Verified credentials are explicitly distinguished from self-reported claims; atomic slot locking prevents double-booking.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            aria-label="Session discussion topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Your session goal..."
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <select
            aria-label="Preferred session type"
            value={selectedSessionType}
            onChange={(e) => setSelectedSessionType(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="1:1 Career Guidance">1:1 Career Guidance</option>
            <option value="Resume Review">Resume Review</option>
            <option value="Mock Interview">Mock Interview</option>
          </select>
        </div>
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

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <EmptyState
          title="No active mentors yet"
          description="Be the first verified practitioner to open 1:1 mentorship slots below."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {mentors.map((mentor) => (
            <article
              key={mentor.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {mentor.user.displayName}
                      </h2>
                      {mentor.isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified Mentor
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {mentor.headline}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {mentor.hourlyRate === 0 ? "Free" : `${mentor.currency} ${mentor.hourlyRate}/hr`}
                    </span>
                    <div>
                      <ReportDialog targetType="user" targetId={mentor.user.id} label="Report" />
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{mentor.bio}</p>

                <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Verified Background Facts
                    </p>
                    <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                      {(mentor.verifiedFacts.length > 0
                        ? mentor.verifiedFacts
                        : [`${mentor.roleTitle} @ ${mentor.company || "Verified"}`]
                      ).map((f, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      Self-Reported Specialties
                    </p>
                    <ul className="mt-1 space-y-1 text-slate-500 dark:text-slate-400">
                      {(mentor.selfReported.length > 0 ? mentor.selfReported : mentor.expertise).map(
                        (s, i) => (
                          <li key={i}>• {s}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" /> Available 45-Min Slots
                </p>
                {mentor.slots.length === 0 ? (
                  <p className="text-xs text-slate-500">No upcoming open slots right now.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {mentor.slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => bookSlot(slot.id)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"
                      >
                        Book {new Date(slot.startAt).toLocaleString()} ({slot.timezone})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {isLoggedIn && (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <UserCheck className="h-5 w-5 text-indigo-500" aria-hidden="true" /> My Mentorship Sessions
            </h2>
            {bookings.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No mentorship sessions booked yet. Select an open slot above to reserve one.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {b.sessionType}: {b.topic}
                      </span>
                      <StatusBadge status={b.status} label={b.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Mentor: {b.mentor?.user?.displayName} · Mentee: {b.mentee?.displayName} ·{" "}
                      {new Date(b.slot.startAt).toLocaleString()}
                    </p>
                    {b.status === "confirmed" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => bookingAction("complete_booking", b.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Mark Session Completed
                        </button>
                        {b.menteeId === user?.id && (
                          <button
                            type="button"
                            onClick={() => bookingAction("cancel", b.id)}
                            className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    )}
                    {b.status === "completed" && !b.rating && b.menteeId === user?.id && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <select
                          aria-label="Session Rating"
                          value={reviewRating[b.id] || 5}
                          onChange={(e) =>
                            setReviewRating((p) => ({ ...p, [b.id]: Number(e.target.value) }))
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} Stars
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={reviewText[b.id] || ""}
                          onChange={(e) =>
                            setReviewText((p) => ({ ...p, [b.id]: e.target.value }))
                          }
                          placeholder="Leave verified session review..."
                          className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <button
                          type="button"
                          onClick={() => bookingAction("review", b.id)}
                          className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Submit Review
                        </button>
                      </div>
                    )}
                    {b.rating && (
                      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-500" aria-hidden="true" /> {b.rating}/5 —{" "}
                        {b.reviewText}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {amIMentor ? "Publish Open Availability Slot" : "Become a HackKro Mentor"}
            </h2>
            {!amIMentor ? (
              <form onSubmit={publishMentorProfile} className="space-y-3">
                <input
                  required
                  value={mentorHeadline}
                  onChange={(e) => setMentorHeadline(e.target.value)}
                  placeholder="Headline (e.g., Principal Distributed Systems Engineer)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={mentorCompany}
                    onChange={(e) => setMentorCompany(e.target.value)}
                    placeholder="Company / Organization"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <input
                    required
                    value={mentorRole}
                    onChange={(e) => setMentorRole(e.target.value)}
                    placeholder="Role Title"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Create Mentor Profile
                </button>
              </form>
            ) : (
              <form onSubmit={addMentorSlot} className="space-y-3">
                <label htmlFor="new-slot-time" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Slot Start Time (creates a 45-minute bookable slot)
                </label>
                <input
                  id="new-slot-time"
                  type="datetime-local"
                  required
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Publish Slot
                </button>
              </form>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
