import React from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Trophy, Users, ArrowRight } from "lucide-react"

function CTA() {
  return (
    <section className="container py-12">
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-6 py-12 text-center text-white md:px-12 md:py-16 shadow-2xl relative overflow-hidden border border-blue-500/30">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-200 border border-white/20 mb-4 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" /> Start Your Innovation Journey
        </span>

        <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl max-w-3xl mx-auto leading-tight">
          Ready to Build, Compete and Get Discovered?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-blue-100/90 text-sm md:text-base leading-relaxed">
          Join 100,000+ developers, colleges, and top tech companies on HackKro. Compete in national hackathons, launch your projects, or host your own contests.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-7 shadow-lg">
            <Link href="/events">
              <Trophy className="mr-2 h-4 w-4" /> Explore Competitions
            </Link>
          </Button>
          <Button asChild size="lg" className="border-2 border-white/60 bg-white/15 hover:bg-white/25 text-white font-bold px-6 backdrop-blur-md shadow-md transition-all">
            <Link href="/organizer">
              For Organizations / Hosts
            </Link>
          </Button>
          <Button asChild size="lg" className="border border-white/30 bg-transparent hover:bg-white/10 text-white font-semibold px-6 transition-all">
            <Link href="/campus-ambassador/apply">
              <Users className="mr-2 h-4 w-4" /> Campus Ambassador
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export default CTA
