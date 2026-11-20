"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { EmptyState } from "@/components/domain/EmptyState"
import { ReportDialog } from "@/components/domain/ReportDialog"
import { MessageSquare, Send, ShieldCheck } from "lucide-react"

export default function CommunityPage() {
  const { isLoggedIn } = useUserAuth()
  const [groups, setGroups] = useState<any[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const loadGroups = async () => {
    setLoading(true)
    const res = await apiFetch<{ groups: any[] }>("/api/v1/community")
    if (res.success) {
      setGroups(res.groups)
      if (!activeGroupId && res.groups[0]) setActiveGroupId(res.groups[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadGroups()
  }, [])

  const publishPost = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setFeedback(null)
    if (!isLoggedIn) {
      setErr("Sign in first to post in community groups.")
      return
    }
    const res = await apiFetch("/api/v1/community", {
      method: "POST",
      body: JSON.stringify({ action: "create_post", groupId: activeGroupId, title, body }),
    })
    if (!res.success) {
      setErr((res.message || "Request failed."))
      return
    }
    setTitle("")
    setBody("")
    setFeedback("Discussion post published cleanly (sanitized against XSS).")
    await loadGroups()
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0]

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Community Groups & Announcements
        </span>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          HackKro Clubs, Tracks & Peer Discussions
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          All posts are server-sanitized and backed by moderation workflows.
        </p>
      </header>

      {err && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          {err}
        </div>
      )}
      {feedback && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {feedback}
        </div>
      )}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      ) : groups.length === 0 ? (
        <EmptyState title="No community groups available" description="Check back soon for new clubs and cohort channels." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <aside className="space-y-2">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroupId(g.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  activeGroup?.id === g.id
                    ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <p className="font-bold text-slate-900 dark:text-white">{g.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  {g.organization?.verificationStatus === "verified" && (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  )}
                  {g.organization?.displayName || "Community"} · {g.visibility}
                </p>
              </button>
            ))}
          </aside>

          <section className="space-y-6 lg:col-span-2">
            {activeGroup && (
              <>
                <form
                  onSubmit={publishPost}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Post in {activeGroup.name}
                  </h2>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Discussion title..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <textarea
                    required
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Share teammate requests, tips, or technical Q&A..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" /> Publish Post
                  </button>
                </form>

                <div className="space-y-3">
                  {(activeGroup.posts || []).map((p: any) => (
                    <article
                      key={p.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">{p.title}</h3>
                          <p className="text-xs text-slate-500">
                            By {p.author?.displayName} · {new Date(p.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <ReportDialog targetType="post" targetId={p.id} label="Report post" />
                      </div>
                      <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{p.body}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
