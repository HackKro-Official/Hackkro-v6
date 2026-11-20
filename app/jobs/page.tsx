"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { OpportunityCard, OpportunitySummary } from "@/components/domain/OpportunityCard"
import { EmptyState } from "@/components/domain/EmptyState"
import { Briefcase, Building2, Search, ShieldCheck } from "lucide-react"

export default function JobsPage() {
  const [jobs, setJobs] = useState<OpportunitySummary[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "job" | "internship">("all")
  const [modeFilter, setModeFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const loadJobs = async () => {
    setLoading(true)
    const [oppRes, orgRes] = await Promise.all([
      apiFetch<{ items: OpportunitySummary[] }>("/api/v1/opportunities?limit=50"),
      apiFetch<{ organizations: any[] }>("/api/v1/organizations"),
    ])
    if (oppRes.success) {
      setJobs(oppRes.items.filter((i: OpportunitySummary) => i.type === "job" || i.type === "internship"))
    }
    if (orgRes.success) {
      setOrgs(orgRes.organizations)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadJobs()
  }, [])

  const filtered = jobs.filter((j) => {
    if (typeFilter !== "all" && j.type !== typeFilter) return false
    if (modeFilter !== "all" && j.locationMode !== modeFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      j.title.toLowerCase().includes(q) ||
      j.shortSummary.toLowerCase().includes(q) ||
      j.organization.displayName.toLowerCase().includes(q) ||
      (j.skills || []).some((s) => s.toLowerCase().includes(q))
    )
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" /> Jobs & Internships Marketplace
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Early-Career Roles, Internships & Verified Employers
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Transparent compensation disclosure, verified domain badges, and skill-matched hiring pipelines.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/recruiter"
            className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
          >
            Recruiter ATS Workspace
          </Link>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <search className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search jobs and internships"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search role, skill, or verified employer..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </search>
        <select
          aria-label="Employment type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">Jobs & Internships</option>
          <option value="job">Full-Time Jobs</option>
          <option value="internship">Internships</option>
        </select>
        <select
          aria-label="Work mode"
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All Modes</option>
          <option value="online">Remote / Online</option>
          <option value="hybrid">Hybrid</option>
          <option value="offline">On-site</option>
        </select>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching jobs or internships"
          description="Try resetting your filters or exploring all active challenges and hackathons."
          actionLabel="Reset Filters"
          onAction={() => {
            setQuery("")
            setTypeFilter("all")
            setModeFilter("all")
          }}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <OpportunityCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <section className="mt-12" aria-label="Verified Employers Directory">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <Building2 className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Employer Brand Pages
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/companies/${org.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-white">{org.displayName}</span>
                {org.verificationStatus === "verified" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs capitalize text-slate-500">
                {org.type} · {org.domain || org.officialEmail}
              </p>
              <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                {org.description || "Verified partner organization hosting opportunities on HackKro."}
              </p>
              <p className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {org._count?.opportunities ?? 0} live listings · {org._count?.followers ?? 0} followers →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
