"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { 
  Rocket, 
  Users, 
  ShieldCheck, 
  Trophy, 
  CheckCircle, 
  Code, 
  Globe, 
  BarChart3, 
  Award, 
  Sparkles,
  Mail,
  Clock,
  LayoutDashboard,
  LogIn,
  UserPlus,
  ArrowRight
} from "lucide-react"

export function HostContent() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    orgName: "",
    contactPerson: "",
    email: "",
    phone: "",
    eventType: "hackathon",
    estimatedParticipants: "100-500",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/host-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("Failed to submit request")
      }

      toast({
        title: "Request Received!",
        description: "Our Event Operations team will contact you within 24 hours.",
      })

      setFormData({
        orgName: "",
        contactPerson: "",
        email: "",
        phone: "",
        eventType: "hackathon",
        estimatedParticipants: "100-500",
        message: "",
      })
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 5000)
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Submission Error",
        description: "Something went wrong. Please try again or email us directly.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-12 sm:space-y-16 py-6 sm:py-12">
      {/* Hero Banner */}
      <section className="relative min-h-[460px] md:min-h-[440px] w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl mx-auto container flex items-center justify-center p-0">
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/payb7fsq/image/upload/v1792430791/WhatsApp_Image_2026-10-19_at_22.55.24.jpg"
            alt="HackKro For Organizations and Event Hosts Banner"
            fill
            className="object-cover brightness-50"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/90 pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-white max-w-4xl mx-auto w-full">
          <span className="px-3.5 py-1.5 bg-blue-600/90 text-xs font-semibold rounded-full mb-3 tracking-wider uppercase backdrop-blur-sm shadow-md">
            For Colleges, Clubs & Enterprises
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-md mb-3">
            Host Powerful Hackathons & Coding Contests
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-200 max-w-2xl leading-relaxed drop-shadow-sm mb-6">
            Scale your tech events with HackKro's complete hosting ecosystem — custom microsites, automated judging, proctored submissions, live participant tracking, and direct access to 100,000+ developers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-none">
            <Button asChild size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 h-11 sm:h-12 rounded-xl shadow-lg shadow-blue-600/30">
              <Link href="/organizer/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Organizer Hub
              </Link>
            </Button>
            <Button asChild size="lg" className="w-full sm:w-auto border-2 border-white/70 bg-white/15 hover:bg-white/25 text-white font-bold px-6 h-11 sm:h-12 rounded-xl backdrop-blur-md shadow-md transition-all">
              <Link href="/organizer/login">
                <LogIn className="mr-2 h-4 w-4" /> Organizer Login
              </Link>
            </Button>
            <Button asChild size="lg" className="w-full sm:w-auto border-2 border-white/70 bg-white/15 hover:bg-white/25 text-white font-bold px-6 h-11 sm:h-12 rounded-xl backdrop-blur-md shadow-md transition-all">
              <Link href="/organizer/register">
                <UserPlus className="mr-2 h-4 w-4" /> Register Organization
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="container grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="p-4 sm:p-6 rounded-xl border bg-card text-center space-y-1.5 sm:space-y-2 shadow-sm">
          <Rocket className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto" />
          <h3 className="font-bold text-xl sm:text-2xl">1000+</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Active Student & Developer Reach</p>
        </div>
        <div className="p-4 sm:p-6 rounded-xl border bg-card text-center space-y-1.5 sm:space-y-2 shadow-sm">
          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto" />
          <h3 className="font-bold text-xl sm:text-2xl">10+</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Campus Ambassador Partners</p>
        </div>
        <div className="p-4 sm:p-6 rounded-xl border bg-card text-center space-y-1.5 sm:space-y-2 shadow-sm">
          <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto" />
          <h3 className="font-bold text-xl sm:text-2xl">Automated</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Evaluation & Anti-Plagiarism Systems</p>
        </div>
        <div className="p-4 sm:p-6 rounded-xl border bg-card text-center space-y-1.5 sm:space-y-2 shadow-sm">
          <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto" />
          <h3 className="font-bold text-xl sm:text-2xl">Instant Payouts</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Escrow Rewards & E-Certificates</p>
        </div>
      </section>

      {/* Organizer Hub Portal Showcase */}
      <section className="container">
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-card to-indigo-950/20 p-8 md:p-10 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <LayoutDashboard className="h-3.5 w-3.5" /> Self-Serve Organizer Hub
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Everything You Need to Run Your Event
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                The HackKro Organizer Hub gives your club, community, or company full autonomy over your event lifecycle with integrated workflows, live rosters, and proctoring.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-background/60">
                  <CheckCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Direct Event Listing</p>
                    <p className="text-muted-foreground">Submit events with rounds & slug IDs for fast admin approval.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-background/60">
                  <CheckCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Live Registrations & Unique Pass IDs</p>
                    <p className="text-muted-foreground">Track registered attendees real-time with unique pass identifiers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-background/60">
                  <CheckCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Verified Email Broadcasts</p>
                    <p className="text-muted-foreground">Send up to 3 official HackKro email updates to all attendees.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-background/60">
                  <CheckCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Scheduled Test Rounds</p>
                    <p className="text-muted-foreground">Launch proctored tests and coding rounds directly from event pages.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
                <Button asChild className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md">
                  <Link href="/organizer/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Open Organizer Dashboard
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/organizer/login">
                    <LogIn className="mr-2 h-4 w-4" /> Organizer Login
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full sm:w-auto text-blue-600 dark:text-blue-400 font-semibold justify-center">
                  <Link href="/organizer/register">
                    New Host? Register Here <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-card/90 border rounded-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">
                    HK
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-none">Organizer Hub Portal</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Self-Serve Management System</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  LIVE PORTAL
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-muted/50 border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">Event Creation & Rounds</span>
                    <span className="text-[11px] text-muted-foreground">Slug ID generator + multi-round setup</span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">Enabled</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">Participant Roster</span>
                    <span className="text-[11px] text-muted-foreground">Live Unique Pass IDs + details</span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">Real-time</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">Official Broadcasts</span>
                    <span className="text-[11px] text-muted-foreground">Direct from HackKro Email API</span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">3 Mails/Event</span>
                </div>
              </div>

              <div className="pt-2">
                <Button asChild className="w-full text-xs font-semibold" variant="outline">
                  <Link href="/organizer/dashboard">
                    Enter Organizer Hub <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features for Hosts */}
      <section className="container space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-bold">Why Organizations Choose HackKro</h2>
          <p className="text-muted-foreground">
            Everything you need to plan, market, run, and evaluate high-impact developer competitions.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 space-y-3">
            <Globe className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-lg">Custom Branded Microsite</h3>
            <p className="text-sm text-muted-foreground">
              Launch your event with branded landing pages, customizable registration forms, timeline widgets, and problem statement disclosures.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <Code className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-lg">Automated Test & Code Evaluation</h3>
            <p className="text-sm text-muted-foreground">
              Integrated test runners, GitHub code-checkers, and anti-plagiarism filters to evaluate hundreds of submissions effortlessly.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-lg">Live Analytics & Dashboard</h3>
            <p className="text-sm text-muted-foreground">
              Track participant registrations, team formation status, submission rates, and leaderboard scores in real time.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <Users className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-lg">National Campus Promotions</h3>
            <p className="text-sm text-muted-foreground">
              Tap into HackKro's Ambassador Network across 200+ colleges to maximize student turnout and engagement.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <Award className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-lg">Automated E-Certificates & Badges</h3>
            <p className="text-sm text-muted-foreground">
              Distribute verified participation certificates and winner credentials directly to participants' profiles with one click.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-lg">Hiring & Talent Screening</h3>
            <p className="text-sm text-muted-foreground">
              Filter top-performing developers by skills, contest rank, and project quality to fast-track interview scheduling.
            </p>
          </Card>
        </div>
      </section>

      {/* Hosting Request & Direct Self-Serve Access */}
      <section className="container">
        <div className="grid gap-8 md:grid-cols-2 items-stretch">
          <div className="space-y-6 flex flex-col justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full text-xs font-semibold w-fit">
              <CheckCircle className="h-3.5 w-3.5" /> Self-Serve Organizer Hub Live
            </span>
            <h2 className="text-3xl font-bold">List and Manage Your Event on HackKro</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our self-serve host dashboard is now live! Organizers, colleges, and clubs can directly register, list events with custom rounds and slug IDs, and submit them for fast admin review.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Once approved by our core team, your event is immediately published. You can track participant rosters in real time with unique pass IDs and broadcast official updates directly via HackKro's email API.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Instant listing submission & quick admin review turnaround</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Real-time attendee pass IDs and exportable registrations</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">3 Free official email broadcasts to all registered participants</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Scheduled proctored test rounds live right inside event pages</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Link href="/organizer/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Organizer Dashboard
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/organizer/register">
                  <UserPlus className="mr-2 h-4 w-4" /> Register Organization
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-2 border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20 flex flex-col justify-between">
            <CardContent className="p-8 text-center space-y-6 flex flex-col justify-center h-full">
              <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                <Mail className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold uppercase tracking-wider">
                  Enterprise & Custom Partnerships
                </span>
                <h3 className="text-2xl font-bold pt-2">Need Custom Support or Sponsorships?</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  For large multi-city hackathons, corporate recruitment challenges, or bespoke anti-plagiarism pipelines, our operations team is ready to assist you.
                </p>
              </div>

              <div className="pt-2">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 rounded-full shadow-lg transition-all transform hover:scale-105"
                  asChild
                >
                  <a href="mailto:team@hackkro.com?subject=Host%20Event%20Request%20on%20HackKro&body=Hi%20HackKro%20Team,%0A%0AWe%20would%20like%20to%20host%20an%20event%20on%20your%20platform.%0A%0AOrganization/College%20Name:%0AContact%20Person:%0AEvent%20Type%20(Hackathon/Coding%20Contest):%0AExpected%20Participants:%0A%0APlease%20guide%20us%20through%20the%20verification%20and%20setup%20process.">
                    <Mail className="mr-2 h-4 w-4" /> Contact team@hackkro.com
                  </a>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                We typically review and respond to hosting inquiries within 24 hours.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Host FAQ Section */}
      <section className="container py-6 space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Common queries about hosting on HackKro platform.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-6 border rounded-lg bg-card space-y-2">
            <h3 className="font-semibold text-base">How do I list an event on HackKro?</h3>
            <p className="text-sm text-muted-foreground">
              Simply register an account in the Organizer Hub, fill in your contest details, timeline, prizes, and test rounds, then submit for admin approval. Once approved by our team, your event is published instantly!
            </p>
          </div>

          <div className="p-6 border rounded-lg bg-card space-y-2">
            <h3 className="font-semibold text-base">How can I see who is registering for my event?</h3>
            <p className="text-sm text-muted-foreground">
              Your Organizer Dashboard features a real-time Registrations section. You can view each participant's full name, email, phone number, and unique registration Pass ID generated at checkout.
            </p>
          </div>

          <div className="p-6 border rounded-lg bg-card space-y-2">
            <h3 className="font-semibold text-base">Can organizers send emails to registered participants?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! Each approved event is allocated up to 3 official email broadcasts. You can draft and dispatch custom announcements and test reminders directly via HackKro's email API with one click.
            </p>
          </div>

          <div className="p-6 border rounded-lg bg-card space-y-2">
            <h3 className="font-semibold text-base">How do scheduled proctored test rounds work?</h3>
            <p className="text-sm text-muted-foreground">
              You can configure multiple rounds (Quiz, Coding, Hackathon). When the scheduled start time arrives, participants can launch their test directly from your event details page with proctored verification.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
