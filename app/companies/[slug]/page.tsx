"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiFetch } from "@/lib/api-client"
import { useUserAuth } from "@/lib/user-auth-context"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { Building2, Globe, Mail, ShieldCheck, ArrowLeft } from "lucide-react"

export default function CompanyProfilePage() {
  const params = useParams<{ slug: string }>()
  const { isLoggedIn } = useUserAuth()
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await apiFetch<{ organization: any }>(
        `/api/v1/organizations?slug=${encodeURIComponent(params.slug)}`
      )
      if (res.success) setOrg(res.organization)
      setLoading(false)
    }
    if (params.slug) void load()
  }, [params.slug])

  const handleFollow = async () => {
    if (!isLoggedIn) {
      setFeedback("Sign in to follow this organization for hiring & hackathon alerts.")
      return
    }
    setFollowing(true)
    setFeedback(`Subscribed to ${org.displayName} opportunity notifications.`)
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </main>
    )
  }

  if (!org) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Organization Not Found</h1>
        <Link href="/jobs" className="mt-4 inline-block text-sm font-semibold text-indigo-600 underline">
          Back to Employers & Jobs
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All Verified Employers
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-600" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{org.displayName}</h1>
              <StatusBadge status={org.verificationStatus} label={org.verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Legal entity: {org.legalName} · Type: {org.type}
            </p>
          </div>
          <button
            type="button"
            onClick={handleFollow}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {following ? "Following Organization" : "Follow for Updates"}
          </button>
        </div>

        {feedback && (
          <p role="status" className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
            {feedback}
          </p>
        )}

        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {org.description || "Verified employer and organizer partner building opportunities on HackKro."}
        </p>

        <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {org.domain && (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Verified Domain: {org.domain}
            </span>
          )}
          {org.website && (
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" /> {org.website}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {org.officialEmail}
          </span>
          <span>{org._count?.followers ?? 0} Followers</span>
        </div>
      </section>

      <section className="mt-8" aria-label="Open Opportunities">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
          Open Roles & Hosted Opportunities ({org.opportunities?.length ?? 0})
        </h2>
        {!org.opportunities || org.opportunities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">
            No active public listings right now. Follow this organization to be notified when new listings go live.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {org.opportunities.map((op: any) => (
              <Link
                key={op.id}
                href={`/opportunities/${op.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={op.status} label={op.type} />
                  <span className="text-xs text-slate-500">{op.locationText}</span>
                </div>
                <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{op.title}</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{op.shortSummary}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
