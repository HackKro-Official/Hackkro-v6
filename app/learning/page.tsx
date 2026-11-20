"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { EmptyState } from "@/components/domain/EmptyState"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { BookOpen, CheckCircle2, Clock, Award, FileText, Play, Search } from "lucide-react"

interface CourseSummary {
  id: string
  slug: string
  title: string
  category: string
  level: string
  durationHours: number
  instructorName: string
  instructorBio: string
  priceCents: number
  currency: string
  certificateEnabled: boolean
  outcomes: string[]
  _count: { lessons: number; enrollments: number }
  enrollment: { id: string; status: string; progressPercent: number } | null
}

interface Lesson {
  id: string
  title: string
  orderIndex: number
  durationMinutes: number
  lessonType: string
  content: string
  videoUrl: string | null
  captionsUrl: string | null
  transcript: string | null
  completionRule: string
  quiz: {
    questions?: Array<{
      id: string
      prompt: string
      options: Array<{ id: string; label: string }>
    }>
  }
}

export default function LearningPage() {
  const { isLoggedIn } = useUserAuth()
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [search, setSearch] = useState("")
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [courseDetail, setCourseDetail] = useState<any>(null)
  const [enrollment, setEnrollment] = useState<any>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [showTranscript, setShowTranscript] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadCatalog = async () => {
    setLoading(true)
    const res = await apiFetch<{ courses: CourseSummary[] }>("/api/v1/courses")
    if (res.success) setCourses(res.courses)
    setLoading(false)
  }

  const loadCourse = async (slug: string) => {
    setSelectedSlug(slug)
    setBanner(null)
    const res = await apiFetch<{ course: any; enrollment: any }>(
      `/api/v1/courses?slug=${encodeURIComponent(slug)}`
    )
    if (res.success) {
      setCourseDetail(res.course)
      setEnrollment(res.enrollment)
      const lessons: Lesson[] = res.course.lessons || []
      setActiveLesson(lessons[0] || null)
      setQuizAnswers({})
    }
  }

  useEffect(() => {
    void loadCatalog()
  }, [])

  const handleEnroll = async (courseId: string, cohortId?: string) => {
    if (!isLoggedIn) {
      setBanner({ type: "error", text: "Please sign in first to enroll in a course." })
      return
    }
    setBusy(true)
    setBanner(null)
    const res = await apiFetch<{ enrollment: any }>("/api/v1/courses", {
      method: "POST",
      body: JSON.stringify({ action: "enroll", courseId, cohortId }),
    })
    setBusy(false)
    if (!res.success) {
      setBanner({ type: "error", text: (res.message || "Request failed.") })
      return
    }
    setBanner({ type: "success", text: "Enrolled in course. Complete lessons and verification quizzes below." })
    if (selectedSlug) await loadCourse(selectedSlug)
    await loadCatalog()
  }

  const handleCompleteLesson = async (lesson: Lesson) => {
    if (!courseDetail) return
    setBusy(true)
    setBanner(null)
    const res = await apiFetch<{ enrollment: any }>("/api/v1/courses", {
      method: "POST",
      body: JSON.stringify({
        action: "complete_lesson",
        courseId: courseDetail.id,
        lessonId: lesson.id,
        quizAnswers,
      }),
    })
    setBusy(false)
    if (!res.success) {
      setBanner({ type: "error", text: (res.message || "Request failed.") })
      return
    }
    setEnrollment(res.enrollment)
    setBanner({
      type: "success",
      text:
        res.enrollment.progressPercent >= 100
          ? "100% completed! Your completion certificate has been issued to your dashboard."
          : `Lesson completed! Course progress: ${res.enrollment.progressPercent}%.`,
    })
    await loadCatalog()
  }

  const filtered = courses.filter((c) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.instructorName.toLowerCase().includes(q)
    )
  })

  const completedIds: string[] = enrollment?.completedLessonIds || []

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Learning Academy & Cohorts
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Structured Courses & Verified Skill Paths
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Lessons with accessible transcripts, explicit quiz completion rules, and verifiable completion certificates.
          </p>
        </div>
        <search>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search courses"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses or skills..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </search>
      </header>

      {banner && (
        <div
          role={banner.type === "error" ? "alert" : "status"}
          className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
            banner.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          {banner.text}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching courses found"
          description="Try clearing your search filter to explore available skill courses and cohorts."
          actionLabel="Clear Search"
          onAction={() => setSearch("")}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <article
              key={course.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={course.level} label={course.level} />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {course.priceCents === 0
                      ? "Free Access"
                      : `${course.currency} ${(course.priceCents / 100).toFixed(0)}`}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{course.title}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  By {course.instructorName} · {course.category}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {course.durationHours}h
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {course._count.lessons} lessons
                  </span>
                  {course.certificateEnabled && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <Award className="h-3.5 w-3.5" aria-hidden="true" /> Certificate
                    </span>
                  )}
                </div>
                {course.outcomes.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {course.outcomes.slice(0, 3).map((out, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
                        <span>{out}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                {course.enrollment && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span>Progress</span>
                      <span>{course.enrollment.progressPercent}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${course.enrollment.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => loadCourse(course.slug)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {course.enrollment ? "Continue Learning" : "Inspect Curriculum"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {courseDetail && (
        <section
          aria-label="Course Classroom"
          className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{courseDetail.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Instructor: {courseDetail.instructorName} — {courseDetail.instructorBio}
              </p>
            </div>
            {!enrollment ? (
              <div className="flex flex-wrap gap-2">
                {courseDetail.cohorts?.length > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleEnroll(courseDetail.id, courseDetail.cohorts[0].id)}
                    className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                  >
                    Join Cohort: {courseDetail.cohorts[0].name}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleEnroll(courseDetail.id)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {busy ? "Enrolling..." : "Enroll Free (Self-Paced)"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <StatusBadge status={enrollment.status} label={`${enrollment.progressPercent}% Complete`} />
                {enrollment.progressPercent >= 100 && (
                  <Link
                    href="/dashboard"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    View Certificate
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <aside className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Syllabus Lessons
              </h3>
              {(courseDetail.lessons || []).map((lesson: Lesson, idx: number) => {
                const isDone = completedIds.includes(lesson.id)
                const isActive = activeLesson?.id === lesson.id
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setActiveLesson(lesson)
                      setQuizAnswers({})
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm transition ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50/70 font-semibold text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span>
                      {idx + 1}. {lesson.title}
                    </span>
                    {isDone && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Completed" />
                    )}
                  </button>
                )
              })}
            </aside>

            <div className="lg:col-span-2">
              {activeLesson ? (
                <div className="space-y-5 rounded-xl border border-slate-200 p-5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">
                        {activeLesson.lessonType} · {activeLesson.durationMinutes} min · Rule:{" "}
                        {activeLesson.completionRule === "quiz_pass"
                          ? "Quiz verification required"
                          : "Explicit reading/completion"}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {activeLesson.title}
                      </h3>
                    </div>
                    {activeLesson.transcript && (
                      <button
                        type="button"
                        onClick={() => setShowTranscript((v) => !v)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700"
                      >
                        {showTranscript ? "Hide Transcript" : "Show Transcript"}
                      </button>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none text-slate-700 dark:prose-invert dark:text-slate-300">
                    <p>{activeLesson.content}</p>
                  </div>

                  {showTranscript && activeLesson.transcript && (
                    <div className="rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                      <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                        Accessible Lesson Transcript
                      </p>
                      <p>{activeLesson.transcript}</p>
                    </div>
                  )}

                  {activeLesson.quiz?.questions && activeLesson.quiz.questions.length > 0 && (
                    <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Completion Verification Check
                      </h4>
                      {activeLesson.quiz.questions.map((q) => (
                        <fieldset key={q.id} className="space-y-2">
                          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {q.prompt}
                          </legend>
                          <div className="space-y-1.5">
                            {q.options.map((opt) => (
                              <label
                                key={opt.id}
                                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                              >
                                <input
                                  type="radio"
                                  name={`quiz-${q.id}`}
                                  value={opt.id}
                                  checked={quizAnswers[q.id] === opt.id}
                                  onChange={() =>
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                                  }
                                />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  )}

                  {enrollment ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCompleteLesson(activeLesson)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      {completedIds.includes(activeLesson.id)
                        ? "Re-verify Lesson Completion"
                        : "Verify & Mark Lesson Complete"}
                    </button>
                  ) : (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Enroll in the course above to track lesson completion and earn your certificate.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Select a lesson from the syllabus.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
