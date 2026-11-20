"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Compass, ShieldCheck, Sparkles, Trophy, Briefcase, BookOpen, Users, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { OpportunityCard, type OpportunitySummary } from "@/components/domain/OpportunityCard"
import { OPPORTUNITY_TYPES } from "@/config/taxonomies"

export default function HomePage() {
  const { user, isLoggedIn } = useUserAuth()
  const [featured, setFeatured] = useState<OpportunitySummary[]>([])
  const [recommended, setRecommended] = useState<OpportunitySummary[]>([])
  const [personalized, setPersonalized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch("/api/v1/opportunities?sort=popularity&limit=6"),
      apiFetch("/api/v1/recommendations"),
    ])
      .then(([opsRes, recRes]) => {
        if (opsRes.success) setFeatured(opsRes.items || [])
        if (recRes.success) {
          setRecommended(recRes.items || [])
          setPersonalized(Boolean(recRes.personalized))
        }
      })
      .finally(() => setLoading(false))
  }, [isLoggedIn])

  return (
    <div className="space-y-16 pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white py-16 md:py-24">
        <div className="container relative z-10 grid gap-10 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3.5 py-1 text-xs font-semibold text-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>One Identity • Transparent Eligibility • Auditable Hiring &amp; Judging</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.12]">
              {isLoggedIn
                ? `Welcome back, ${user?.displayName.split(" ")[0]} — build, compete, and get hired.`
                : "Discover Hackathons, Assessments, Learning & Hiring on HackKro"}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
              One unified profile unlocks competitions, coding challenges, structured courses, 1:1 mentorship, campus placement drives, and recruiter ATS pipelines without re-entering the same details.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                <Link href="/discover">
                  <Compass className="mr-2 h-4 w-4" aria-hidden="true" /> Explore Opportunities
                </Link>
              </Button>
              {!isLoggedIn ? (
                <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/signup">Create Free Account</Link>
                </Button>
              ) : (
                <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/dashboard">Open My Workspace</Link>
                </Button>
              )}
              <Button asChild size="lg" variant="ghost" className="text-blue-200 hover:text-white hover:bg-white/10">
                <Link href="/organizer/dashboard">Host an Opportunity</Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            {[
              { title: "Hackathons & Contests", desc: "Solo & team tracks, live check-in, versioned submissions & blind judging.", icon: Trophy, href: "/events" },
              { title: "Jobs & Recruiter ATS", desc: "Transparent pay, consent-first sourcing, scorecards & offer approvals.", icon: Briefcase, href: "/jobs" },
              { title: "Courses & Practice", desc: "Structured cohorts, coding sandbox & AI-labeled mock interviews.", icon: BookOpen, href: "/learning" },
              { title: "1:1 Mentorship", desc: "Verified mentor profiles, atomic slot booking & completion reviews.", icon: Users, href: "/mentorship" },
            ].map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="rounded-2xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition-colors space-y-2"
                >
                  <Icon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-white">{card.title}</h2>
                  <p className="text-xs text-slate-300 leading-relaxed">{card.desc}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Personalized Section (only when signed in and consented) */}
      {isLoggedIn && personalized && recommended.length > 0 && (
        <section className="container space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" aria-hidden="true" /> Recommended for Your Profile
              </h2>
              <p className="text-sm text-muted-foreground">
                Transparent rule-based matches using your skills, graduation year, and consented preferences.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/privacy">Tune Privacy &amp; Personalization</Link>
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 3).map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Popular Categories */}
      <section className="container space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold">Explore All 17 Opportunity Categories</h2>
            <p className="text-sm text-muted-foreground">
              Every listing uses unified eligibility rules, atomic seat reservation, and verifiable credentials.
            </p>
          </div>
          <Link href="/discover" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
            Browse marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {OPPORTUNITY_TYPES.map((t) => (
            <Link key={t.key} href={`/discover?type=${t.key}`}>
              <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium hover:border-blue-600 hover:bg-blue-500/10 cursor-pointer">
                {t.label}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Opportunities */}
      <section className="container space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold">Live &amp; Featured Opportunities</h2>
            <p className="text-sm text-muted-foreground">Real-time database listings with verified organizer status.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/discover">View all listings</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-xl border border-border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* How HackKro Works / Trust Signals */}
      <section className="container">
        <Card className="border-border bg-muted/30">
          <CardHeader>
            <CardTitle className="text-xl font-bold">How HackKro Works</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3 text-sm">
            <div className="space-y-1.5">
              <div className="font-bold text-blue-600 flex items-center gap-1.5">
                <Code2 className="h-4 w-4" /> 1. One Profile, Explainable Eligibility
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Your profile auto-fills dynamic forms and evaluates eligibility transparently server-side before submission.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="font-bold text-blue-600 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> 2. Fair Assessments &amp; Blind Judging
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Sandboxed coding evaluations, consented proctoring risk bands with appeal SLAs, and COI-guarded rubrics.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="font-bold text-blue-600 flex items-center gap-1.5">
                <Trophy className="h-4 w-4" /> 3. Portable Credentials &amp; Hiring
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Earn QR-verifiable certificates and assessed skill badges that transition directly into recruiter pipelines.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
