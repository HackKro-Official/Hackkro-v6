"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Users, Lock, Send, Plus, CheckSquare, UserMinus, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

function TeamWorkspaceContent() {
  const { user, isLoggedIn } = useUserAuth()
  const searchParams = useSearchParams()
  const initialOpId = searchParams.get("opportunityId") || ""
  const initialTeamId = searchParams.get("teamId") || ""
  const { toast } = useToast()

  const [opportunities, setOpportunities] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState<any>(null)

  const [newTeamOpId, setNewTeamOpId] = useState(initialOpId)
  const [newTeamName, setNewTeamName] = useState("")
  const [inviteIdentifier, setInviteIdentifier] = useState("")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newMessage, setNewMessage] = useState("")

  const loadTeams = async (focusId?: string) => {
    const [opsRes, teamsRes] = await Promise.all([
      apiFetch("/api/v1/opportunities?limit=25"),
      apiFetch("/api/v1/teams"),
    ])
    if (opsRes.success) {
      const teamOps = (opsRes.items || []).filter((o: any) => (o.teamMax || 1) > 1)
      setOpportunities(teamOps)
      if (!newTeamOpId && teamOps[0]?.id) setNewTeamOpId(teamOps[0].id)
    }
    if (teamsRes.success) {
      setTeams(teamsRes.teams || [])
      const targetId = focusId || initialTeamId || teamsRes.teams?.[0]?.id
      if (targetId) loadTeamDetail(targetId)
    }
  }

  const loadTeamDetail = async (teamId: string) => {
    const res = await apiFetch(`/api/v1/teams?teamId=${teamId}`)
    if (res.success && res.team) setSelectedTeam(res.team)
  }

  useEffect(() => {
    if (isLoggedIn) loadTeams()
  }, [isLoggedIn])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch("/api/v1/teams", {
      method: "POST",
      body: JSON.stringify({ action: "create", opportunityId: newTeamOpId, name: newTeamName }),
    })
    if (res.success) {
      toast({ title: "Team created!" })
      setNewTeamName("")
      loadTeams(res.team.id)
    } else {
      toast({ title: "Could not create team", description: res.message, variant: "destructive" })
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam) return
    const res = await apiFetch("/api/v1/teams", {
      method: "POST",
      body: JSON.stringify({ action: "invite", teamId: selectedTeam.id, identifier: inviteIdentifier }),
    })
    if (res.success) {
      toast({ title: "Invitation sent" })
      setInviteIdentifier("")
      loadTeamDetail(selectedTeam.id)
    } else {
      toast({ title: "Invite failed", description: res.message, variant: "destructive" })
    }
  }

  const handleAction = async (payload: Record<string, unknown>, successMsg: string) => {
    const res = await apiFetch("/api/v1/teams", { method: "POST", body: JSON.stringify(payload) })
    if (res.success) {
      toast({ title: successMsg })
      if (selectedTeam) loadTeamDetail(selectedTeam.id)
    } else {
      toast({ title: "Action failed", description: res.message, variant: "destructive" })
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="container py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Sign in to manage Teams &amp; Collaboration</h1>
        <Button asChild className="bg-blue-600 text-white"><Link href="/login?returnTo=/team">Sign in</Link></Button>
      </div>
    )
  }

  const isCaptain = selectedTeam?.captainId === user?.id

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" /> Team Formation &amp; Collaboration Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Create teams, invite teammates by username/email, lock rosters, track milestones, and collaborate securely.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Create & List */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Create a New Team</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam} className="space-y-3">
                <div className="space-y-1">
                  <Label>Opportunity</Label>
                  <Select value={newTeamOpId} onValueChange={setNewTeamOpId}>
                    <SelectTrigger><SelectValue placeholder="Select team event" /></SelectTrigger>
                    <SelectContent>
                      {opportunities.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="team-name-in">Team Name</Label>
                  <Input id="team-name-in" required value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g., NeuralBuilders" />
                </div>
                <Button type="submit" className="w-full bg-blue-600 text-white" size="sm">Create Team</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">My Teams</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => loadTeamDetail(t.id)}
                  className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${
                    selectedTeam?.id === t.id ? "border-blue-600 bg-blue-500/10" : "hover:bg-muted/50"
                  }`}
                >
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-muted-foreground">{t.opportunity.title}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Active Team Workspace */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedTeam ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Select or create a team to open its workspace.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{selectedTeam.name}</CardTitle>
                      <StatusBadge status={selectedTeam.isLocked ? "locked" : "active"} label={selectedTeam.isLocked ? "Roster Locked" : "Roster Open"} />
                    </div>
                    <CardDescription>{selectedTeam.opportunity.title} • Team size {selectedTeam.opportunity.teamMin}–{selectedTeam.opportunity.teamMax}</CardDescription>
                  </div>
                  {isCaptain && !selectedTeam.isLocked && (
                    <Button size="sm" variant="outline" onClick={() => handleAction({ action: "lock", teamId: selectedTeam.id }, "Team roster locked")}>
                      <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock Roster
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {selectedTeam.members.map((m: any) => (
                      <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-xs">
                        <div>
                          <span className="font-semibold">{m.user?.displayName || m.invitedEmail}</span>{" "}
                          <span className="text-muted-foreground">({m.role})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={m.status} />
                          {isCaptain && m.userId !== selectedTeam.captainId && m.status === "accepted" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => handleAction({ action: "transfer_captain", teamId: selectedTeam.id, memberId: m.id }, "Captaincy transferred")}>
                                <Crown className="h-3 w-3 mr-1" /> Make Captain
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] text-rose-600" onClick={() => handleAction({ action: "remove_member", teamId: selectedTeam.id, memberId: m.id }, "Member removed & access revoked")}>
                                <UserMinus className="h-3 w-3 mr-1" /> Remove
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isCaptain && !selectedTeam.isLocked && (
                    <form onSubmit={handleInvite} className="flex gap-2">
                      <Input
                        value={inviteIdentifier}
                        onChange={(e) => setInviteIdentifier(e.target.value)}
                        placeholder="Invite teammate by email or username..."
                        required
                      />
                      <Button type="submit" size="sm" className="bg-blue-600 text-white">Invite</Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Milestones & Tasks */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-1.5"><CheckSquare className="h-4 w-4 text-blue-600" /> Milestones &amp; Tasks</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!newTaskTitle.trim()) return
                        handleAction({ action: "add_task", teamId: selectedTeam.id, title: newTaskTitle }, "Task added")
                        setNewTaskTitle("")
                      }}
                      className="flex gap-2"
                    >
                      <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add milestone task..." />
                      <Button type="submit" size="icon"><Plus className="h-4 w-4" /></Button>
                    </form>
                    <div className="space-y-2">
                      {selectedTeam.tasks.map((task: any) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleAction({ action: "toggle_task", taskId: task.id }, "Task updated")}
                          className="w-full flex items-center justify-between rounded-lg border p-2.5 text-xs hover:bg-muted/40"
                        >
                          <span className={task.status === "done" ? "line-through text-muted-foreground" : "font-medium"}>
                            {task.title}
                          </span>
                          <StatusBadge status={task.status} />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Scoped Discussion & Activity Log */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Scoped Team Discussion</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {selectedTeam.discussions.map((d: any) => (
                        <div key={d.id} className="rounded-lg bg-muted/50 p-2.5 text-xs">
                          <p className="font-semibold">{d.author.displayName}</p>
                          <p className="text-muted-foreground">{d.message}</p>
                        </div>
                      ))}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!newMessage.trim()) return
                        handleAction({ action: "post_discussion", teamId: selectedTeam.id, message: newMessage }, "Message posted")
                        setNewMessage("")
                      }}
                      className="flex gap-2"
                    >
                      <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Share update with team..." />
                      <Button type="submit" size="icon" className="bg-blue-600 text-white"><Send className="h-4 w-4" /></Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="container py-12 text-center text-sm">Loading teams...</div>}>
      <TeamWorkspaceContent />
    </Suspense>
  )
}
