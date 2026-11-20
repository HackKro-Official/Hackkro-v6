"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Award,
  Bookmark,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Trophy,
  Users,
  Briefcase,
  BookOpen,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { EmptyState } from "@/components/domain/EmptyState"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

function DashboardContent() {
  const { user, isLoggedIn, isLoading: authLoading } = useUserAuth()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") || "overview"
  const [activeTab, setActiveTab] = useState(initialTab)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    const res = await apiFetch("/api/v1/participant/dashboard")
    setLoading(false)
    if (res.success) setData(res)
  }

  useEffect(() => {
    if (isLoggedIn) load()
    else if (!authLoading) setLoading(false)
  }, [isLoggedIn, authLoading])

  const completeTask = async (taskId: string) => {
    const res = await apiFetch("/api/v1/participant/dashboard", {
      method: "PATCH",
      body: JSON.stringify({ taskId, status: "completed" }),
    })
    if (res.success) {
      toast({ title: "Task marked completed" })
      load()
    }
  }

  const withdrawApplication = async (applicationId: string) => {
    const res = await apiFetch(`/api/v1/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({ toStatus: "withdrawn", reasonCategory: "participant_withdrew" }),
    })
    if (res.success) {
      toast({ title: "Application withdrawn" })
      load()
    }
  }

  const respondTeamInvite = async (teamId: string, accept: boolean) => {
    const res = await apiFetch("/api/v1/teams", {
      method: "POST",
      body: JSON.stringify({ action: "respond", teamId, accept }),
    })
    if (res.success) {
      toast({ title: accept ? "Joined team!" : "Invitation declined" })
      load()
    }
  }

  const respondOffer = async (applicationId: string, accept: boolean) => {
    const res = await apiFetch("/api/v1/recruiter/pipeline", {
      method: "POST",
      body: JSON.stringify({
        action: "offer",
        applicationId,
        offerAction: accept ? "candidate_accept" : "candidate_decline",
      }),
    })
    if (res.success) {
      toast({ title: accept ? "Offer accepted!" : "Offer declined" })
      load()
    }
  }

  if (authLoading || loading) {
    return <div className="container py-16 text-center text-sm text-muted-foreground">Loading your workspace...</div>
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-16 max-w-lg text-center space-y-4">
        <h1 className="text-2xl font-bold">Sign in to access your Participant Dashboard</h1>
        <p className="text-sm text-muted-foreground">Track applications, teams, assessments, courses, mentorships, and verified credentials.</p>
        <Button asChild className="bg-blue-600 text-white"><Link href="/login?returnTo=/dashboard">Sign in</Link></Button>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Welcome, {user?.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Timezone: {user?.timezone} • Active Role: <span className="font-semibold capitalize">{user?.activeRole.replace(/_/g, " ")}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/profile">Edit Profile &amp; Resumes</Link></Button>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"><Link href="/discover">Explore Opportunities</Link></Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Active Applications", value: data?.stats?.activeApplications ?? 0, icon: Briefcase },
          { label: "Pending Tasks", value: data?.stats?.pendingTasks ?? 0, icon: ClipboardList },
          { label: "Saved Items", value: data?.stats?.savedCount ?? 0, icon: Bookmark },
          { label: "Verified Certificates", value: data?.stats?.certificatesCount ?? 0, icon: Award },
          { label: "Pioneer Points", value: data?.stats?.points ?? 100, icon: Trophy },
        ].map((st) => {
          const Icon = st.icon
          return (
            <Card key={st.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{st.label}</p>
                  <p className="text-2xl font-extrabold">{st.value}</p>
                </div>
                <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Profile Completion Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 w-full">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Profile Completeness</span>
              <span>{data?.profileCompletion ?? 0}%</span>
            </div>
            <Progress value={data?.profileCompletion ?? 0} className="h-2" />
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">Complete Profile</Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="overview">Task Center ({data?.tasks?.filter((t: any) => t.status === "pending").length || 0})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({data?.applications?.length || 0})</TabsTrigger>
          <TabsTrigger value="teams">Teams &amp; Invites ({(data?.teams?.length || 0) + (data?.teamInvites?.length || 0)})</TabsTrigger>
          <TabsTrigger value="learning">Courses &amp; Bookings</TabsTrigger>
          <TabsTrigger value="certificates">Certificates ({data?.certificates?.length || 0})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({data?.saved?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {(data?.offers || []).filter((o: any) => o.status === "sent").map((offer: any) => (
            <Card key={offer.id} className="border-emerald-500/50 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Job Offer Received: {offer.requisition.opportunity.title} ({offer.requisition.organization.displayName})
                </CardTitle>
                <CardDescription>{offer.termsText}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" onClick={() => respondOffer(offer.applicationId, true)} className="bg-emerald-600 text-white">
                  Accept Offer
                </Button>
                <Button size="sm" variant="outline" onClick={() => respondOffer(offer.applicationId, false)}>
                  Decline Offer
                </Button>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Task Center</CardTitle>
              <CardDescription>Aggregated actions across applications, payments, teams, and profile setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.tasks || []).length === 0 ? (
                <EmptyState icon={CheckCircle2} title="All tasks completed" description="You have no pending actions right now." />
              ) : (
                data.tasks.map((task: any) => (
                  <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 text-sm">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{task.title}</span>
                        <StatusBadge status={task.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={task.actionUrl}>Open</Link>
                      </Button>
                      {task.status === "pending" && (
                        <Button size="sm" onClick={() => completeTask(task.id)}>
                          Mark Done
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-3">
          {(data?.applications || []).length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No applications yet"
              description="Discover hackathons, internships, jobs, and contests to apply with one click."
              actionLabel="Browse Opportunities"
              actionHref="/discover"
            />
          ) : (
            data.applications.map((app: any) => (
              <Card key={app.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/opportunities/${app.opportunity.slug}`} className="font-bold text-base hover:text-blue-600">
                        {app.opportunity.title}
                      </Link>
                      <StatusBadge status={app.status} label={app.customStatusLabel || undefined} />
                      <StatusBadge status={app.paymentState} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receipt: <span className="font-mono font-semibold">{app.receiptCode}</span> • Organizer:{" "}
                      {app.opportunity.organization.displayName} • Eligibility:{" "}
                      {app.eligibilityPassed ? "Passed" : "Manual Review"}
                    </p>
                    {app.statusHistory?.[0]?.participantNote && (
                      <p className="text-xs text-blue-600">Latest note: {app.statusHistory[0].participantNote}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/submissions?opportunityId=${app.opportunityId}`}>Submissions</Link>
                    </Button>
                    {!["withdrawn", "cancelled", "rejected"].includes(app.status) && (
                      <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => withdrawApplication(app.id)}>
                        Withdraw
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          {data?.teamInvites?.length > 0 && (
            <Card className="border-blue-500/40">
              <CardHeader><CardTitle className="text-base">Pending Team Invitations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.teamInvites.map((inv: any) => (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-bold">{inv.team.name}</p>
                      <p className="text-xs text-muted-foreground">Event: {inv.team.opportunity.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondTeamInvite(inv.teamId, true)} className="bg-blue-600 text-white">Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => respondTeamInvite(inv.teamId, false)}>Decline</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <div className="flex justify-end">
            <Button asChild size="sm" className="bg-blue-600 text-white"><Link href="/team">Open Full Team Workspace</Link></Button>
          </div>
          {(data?.teams || []).length === 0 ? (
            <EmptyState icon={Users} title="Not part of any team yet" description="Create a team or accept an invitation to collaborate." actionLabel="Go to Teams" actionHref="/team" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.teams.map((t: any) => (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{t.name}</span>
                      <StatusBadge status={t.isLocked ? "locked" : "active"} label={t.isLocked ? "Roster Locked" : "Open"} />
                    </CardTitle>
                    <CardDescription>{t.opportunity.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center text-xs">
                    <span>{t.members.filter((m: any) => m.status === "accepted").length} member(s)</span>
                    <Button asChild variant="outline" size="sm"><Link href={`/team?teamId=${t.id}`}>Open Workspace</Link></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="learning" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-blue-600" /> Enrolled Courses</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(data?.enrollments || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No active courses yet. <Link href="/learning" className="text-blue-600 underline">Browse courses</Link>.</p>
              ) : (
                data.enrollments.map((en: any) => (
                  <div key={en.id} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>{en.course.title}</span>
                      <span>{en.progressPercent}%</span>
                    </div>
                    <Progress value={en.progressPercent} className="h-1.5" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Mentorship Sessions</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(data?.bookings || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No mentorship bookings yet. <Link href="/mentorship" className="text-blue-600 underline">Find a mentor</Link>.</p>
              ) : (
                data.bookings.map((b: any) => (
                  <div key={b.id} className="rounded-lg border p-3 text-xs space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>{b.topic}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-muted-foreground">Mentor: {b.mentor.user.displayName} • {new Date(b.slot.startAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="grid gap-4 sm:grid-cols-2">
          {(data?.certificates || []).length === 0 ? (
            <EmptyState icon={Award} title="No certificates issued yet" description="Participate in verified events or complete courses to earn verifiable credentials." />
          ) : (
            data.certificates.map((c: any) => (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{c.credentialId}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  <CardDescription>{c.issuerName} • {new Date(c.issuedAt).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/verify/${c.credentialId}`}>
                      Verify &amp; Share QR <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="saved" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.saved || []).length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved opportunities" description="Bookmark opportunities while browsing to keep track of deadlines." actionLabel="Discover" actionHref="/discover" />
          ) : (
            data.saved.map((s: any) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="text-base">{s.opportunity.title}</CardTitle>
                  <CardDescription>{s.opportunity.organization.displayName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm" className="bg-blue-600 text-white">
                    <Link href={`/opportunities/${s.opportunity.slug}`}>Open Listing</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-sm">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
