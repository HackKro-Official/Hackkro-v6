"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"
import { OpportunityCard, OpportunitySummary } from "@/components/domain/OpportunityCard"
import { EmptyState } from "@/components/domain/EmptyState"

export function EventList({
  title,
  subtitle,
}: {
  title?: string
  subtitle?: string
  showFilters?: boolean
}) {
  const [items, setItems] = useState<OpportunitySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await apiFetch<{ items: OpportunitySummary[] }>("/api/v1/opportunities?limit=24")
      if (res.success && Array.isArray(res.items)) {
        setItems(res.items.filter((i: OpportunitySummary) => !["job", "internship"].includes(i.type)))
      }
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 space-y-6">
      {(title || subtitle) && (
        <div className="text-center md:text-left">
          {title && <h2 className="text-2xl font-bold text-foreground">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState
          title="No hackathons or challenges scheduled right now"
          description="Explore all HackKro opportunities or create a new event from the Organizer Console."
          actionLabel="Open Discovery Marketplace"
          actionHref="/discover"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <OpportunityCard key={item.id} item={item} />
          ))}
        </div>
      )}
      <div className="text-center">
        <Link
          href="/discover"
          className="inline-block rounded-lg border border-indigo-600 px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300"
        >
          Filter All Opportunities in Discovery →
        </Link>
      </div>
    </div>
  )
}
