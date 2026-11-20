"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OpportunityCard, type OpportunitySummary } from "@/components/domain/OpportunityCard"
import { EmptyState } from "@/components/domain/EmptyState"
import { apiFetch } from "@/lib/api-client"
import { OPPORTUNITY_TYPES } from "@/config/taxonomies"

function DiscoverContent() {
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get("q") || "")
  const [type, setType] = useState(searchParams.get("type") || "all")
  const [locationMode, setLocationMode] = useState("all")
  const [skill, setSkill] = useState("")
  const [freeOnly, setFreeOnly] = useState(false)
  const [sort, setSort] = useState<"relevance" | "newest" | "deadline" | "popularity">("newest")
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<OpportunitySummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchResults = async (targetPage = page) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (type !== "all") params.set("type", type)
    if (locationMode !== "all") params.set("locationMode", locationMode)
    if (skill.trim()) params.set("skill", skill.trim())
    if (freeOnly) params.set("freeOnly", "true")
    params.set("sort", sort)
    params.set("page", String(targetPage))
    params.set("limit", "12")

    const res = await apiFetch(`/api/v1/opportunities?${params.toString()}`)
    setLoading(false)
    if (res.success) {
      setItems(res.items || [])
      setTotal(res.pagination?.total || 0)
      setTotalPages(res.pagination?.totalPages || 1)
    }
  }

  useEffect(() => {
    fetchResults(1)
  }, [type, locationMode, freeOnly, sort])

  const clearAll = () => {
    setQ("")
    setType("all")
    setLocationMode("all")
    setSkill("")
    setFreeOnly(false)
    setSort("newest")
    setPage(1)
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Discover Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          Typo-tolerant search across hackathons, jobs, internships, coding contests, case challenges, courses, and scholarships.
        </p>
      </div>

      {/* Search & Filters */}
      <search>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setPage(1)
            fetchResults(1)
          }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title, skill, organizer, or topic (e.g. AI, React, hackathon)..."
                aria-label="Search opportunities"
                className="pl-9 min-h-11"
              />
            </div>
            <Input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="Filter skill (e.g. Python)"
              aria-label="Filter by skill"
              className="sm:w-44 min-h-11"
            />
            <Button type="submit" className="min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6">
              Search
            </Button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-4 items-center">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger aria-label="Opportunity type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Opportunity Types</SelectItem>
                {OPPORTUNITY_TYPES.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={locationMode} onValueChange={setLocationMode}>
              <SelectTrigger aria-label="Work or event mode">
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="online">Online / Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="offline">In-Person / On-Site</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger aria-label="Sort results">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="deadline">Closest deadline</SelectItem>
                <SelectItem value="popularity">Most popular</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant={freeOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFreeOnly((f) => !f)}
                className="text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Free Entry Only
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="text-xs">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <span>Showing {items.length} of {total} verified public results</span>
            <div className="flex flex-wrap gap-1.5">
              {type !== "all" && <Badge variant="secondary">Type: {type.replace(/_/g, " ")}</Badge>}
              {locationMode !== "all" && <Badge variant="secondary">Mode: {locationMode}</Badge>}
              {skill && <Badge variant="secondary">Skill: {skill}</Badge>}
              {freeOnly && <Badge variant="secondary">Free Only</Badge>}
            </div>
          </div>
        </form>
      </search>

      {/* Results Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 rounded-xl border border-border bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching opportunities found"
          description="Try clearing filters or searching broader keywords like AI, internship, or hackathon."
          actionLabel="Reset All Filters"
          onAction={clearAll}
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1
                  setPage(p)
                  fetchResults(p)
                }}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const p = page + 1
                  setPage(p)
                  fetchResults(p)
                }}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="container py-12 text-center text-sm">Loading opportunities...</div>}>
      <DiscoverContent />
    </Suspense>
  )
}
