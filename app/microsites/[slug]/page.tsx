"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiFetch } from "@/lib/api-client"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { ArrowRight, ShieldCheck } from "lucide-react"

export default function MicrositePage() {
  const params = useParams<{ slug: string }>()
  const [site, setSite] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await apiFetch<{ microsite: any }>(
        `/api/v1/microsites?slug=${encodeURIComponent(params.slug)}`
      )
      if (res.success) setSite(res.microsite)
      else setError((res.message || "Request failed."))
      setLoading(false)
    }
    if (params.slug) void load()
  }, [params.slug])

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </main>
    )
  }

  if (error || !site) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {error || "Microsite Unavailable"}
        </h1>
        <Link href="/discover" className="mt-4 inline-block text-sm font-semibold text-indigo-600 underline">
          Explore Public Opportunities
        </Link>
      </main>
    )
  }

  const accent = site.themeTokens?.primaryColor || "#4f46e5"

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <section
        className="rounded-3xl p-8 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${accent}, #0f172a)` }}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold opacity-90">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>{site.organization?.displayName}</span>
          <span>·</span>
          <StatusBadge status={site.status} label={`v${site.publishedVersion}`} />
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{site.title}</h1>
        {site.opportunity && (
          <div className="mt-6">
            <Link
              href={`/opportunities/${site.opportunity.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100"
            >
              Register & View Full Rules <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <div className="mt-8 space-y-6">
        {(site.sections || []).map((sec: any, idx: number) => (
          <section
            key={sec.id || idx}
            className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{sec.title || sec.heading}</h2>
            <div
              className="prose prose-sm mt-3 max-w-none text-slate-700 dark:prose-invert dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: sec.htmlContent || sec.sanitizedHtml || sec.body || "" }}
            />
          </section>
        ))}
      </div>
    </main>
  )
}
