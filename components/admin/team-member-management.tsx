"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Pencil, Trash2, UserPlus, Mail, Send, Sparkles, RefreshCw, Users, Shield, Phone, Search } from "lucide-react"
import { useAdminAuth } from "@/app/admin/auth-provider"

interface TeamMember {
  _id: string
  email: string
  name: string
  role: string
  position?: string
  phone?: string
  bio?: string
  isAdmin: boolean
  active: boolean
  addedAt: string
  lastLogin: string | null
  assignedInternsCount?: number
}

export function TeamMemberManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isSendingInvite, setIsSendingInvite] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"core" | "all">("core")

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "Lead",
    position: "Core Team Lead",
    phone: "",
    isAdmin: false,
  })

  const { toast } = useToast()
  const { isMainAdmin } = useAdminAuth()

  useEffect(() => {
    fetchTeamMembers()
  }, [filterType])

  const fetchTeamMembers = async () => {
    setIsLoading(true)
    try {
      const url = filterType === "core" ? "/api/admin/team-members?type=core" : "/api/admin/team-members"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setTeamMembers(data)
        } else if (data.teamMembers && Array.isArray(data.teamMembers)) {
          setTeamMembers(data.teamMembers)
        } else {
          setTeamMembers([])
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch team members",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while fetching team members",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!formData.email.trim() || !formData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and email.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/team-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Team Member Added! 🚀",
          description: `Invitation and access instructions sent to ${formData.email}.`,
        })
        setIsAddDialogOpen(false)
        setFormData({
          email: "",
          name: "",
          role: "Lead",
          position: "Core Team Lead",
          phone: "",
          isAdmin: false,
        })
        fetchTeamMembers()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add team member",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while saving team member",
        variant: "destructive",
      })
    }
  }

  const handleEditMember = async () => {
    if (!selectedMember) return

    try {
      const response = await fetch("/api/admin/team-members", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMember._id,
          name: formData.name,
          role: formData.role,
          position: formData.position,
          phone: formData.phone,
          isAdmin: formData.isAdmin,
          active: selectedMember.active,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team member updated successfully",
        })
        setIsEditDialogOpen(false)
        setSelectedMember(null)
        fetchTeamMembers()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update team member",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while updating team member",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMember = async () => {
    if (!selectedMember) return

    try {
      const response = await fetch(`/api/admin/team-members/${selectedMember._id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team member removed successfully",
        })
        setIsDeleteDialogOpen(false)
        setSelectedMember(null)
        fetchTeamMembers()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete team member",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while deleting member",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (member: TeamMember) => {
    try {
      const response = await fetch("/api/admin/team-members", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: member._id,
          name: member.name,
          role: member.role,
          position: member.position,
          isAdmin: member.isAdmin,
          active: !member.active,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Team member ${member.active ? "deactivated" : "activated"} successfully`,
        })
        fetchTeamMembers()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update status",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while changing status",
        variant: "destructive",
      })
    }
  }

  // Re-send Invitation Email
  const handleResendInvite = async (member: TeamMember) => {
    setIsSendingInvite(member._id)
    try {
      const isIntern = member.role?.toLowerCase().includes("intern")
      const endpoint = isIntern ? "/api/admin/interns/invite" : "/api/admin/team-members"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: member.email,
          name: member.name,
          role: member.role,
          position: member.position,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: isIntern ? "Intern Onboarding Email Sent! 🚀" : "Invitation Sent! 📬",
          description: `Access instructions dispatched to ${member.email}.`,
        })
      } else {
        toast({ title: "Failed", description: data.message || "Could not send email", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error sending email", variant: "destructive" })
    } finally {
      setIsSendingInvite(null)
    }
  }

  const openEditDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setFormData({
      email: member.email,
      name: member.name,
      role: member.role || "Lead",
      position: member.position || "",
      phone: member.phone || "",
      isAdmin: member.isAdmin,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setIsDeleteDialogOpen(true)
  }

  const filteredMembers = teamMembers.filter((m) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.position?.toLowerCase().includes(q)
    )
  })

  return (
    <Card className="w-full border-border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-3">
        <div>
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500 shrink-0" />
            Core Team & Technical Leads
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Core members receive direct instructions and lead assigned interns across engineering, events, and operations.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border text-xs">
            <button
              onClick={() => setFilterType("core")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === "core" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Core Team Only
            </button>
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Members
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={fetchTeamMembers} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add Team Member
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search */}
        <div className="mb-4 max-w-sm relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <p className="text-xs text-muted-foreground">Loading team members...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl">
                <p className="text-sm font-semibold text-foreground">No team members found</p>
                <p className="text-xs text-muted-foreground mt-1">Click "+ Add Team Member" to onboard someone.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="py-2.5 px-4 text-left font-semibold">Name & Position</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Email & Phone</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Role</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Interns Mentored</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Admin Access</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const isIntern = member.role?.toLowerCase().includes("intern")
                      return (
                        <tr key={member._id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-foreground text-xs">{member.name || "-"}</p>
                              {member.position && (
                                <p className="text-[11px] text-muted-foreground">{member.position}</p>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-mono text-[11px] text-foreground">{member.email}</p>
                            {member.phone && (
                              <p className="text-[10px] text-muted-foreground">{member.phone}</p>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isIntern ? (
                              <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                                🚀 Intern
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                {member.role || "Member"}
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {member.assignedInternsCount && member.assignedInternsCount > 0 ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                                👥 {member.assignedInternsCount} Interns Assigned
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">0 Interns</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {member.isAdmin ? (
                              <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Yes (Admin)
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">No</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                member.active
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {member.active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isSendingInvite === member._id}
                                onClick={() => handleResendInvite(member)}
                                title="Re-send invitation email"
                                className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2"
                              >
                                {isSendingInvite === member._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="h-3 w-3 mr-1" />
                                    Invite
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(member)}
                                className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2"
                              >
                                {member.active ? "Deactivate" : "Activate"}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(member)}
                                title="Edit Member"
                                className="h-7 w-7 text-slate-400 hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(member)}
                                title="Delete Member"
                                className="h-7 w-7 text-slate-400 hover:text-rose-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-400" />
              Add Core Team Member
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Onboard a lead, developer, designer, or coordinator. Instructions and dashboard credentials will be sent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-300">Email Address *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="colleague@example.com"
                className="h-8 text-xs bg-slate-900 border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="h-8 text-xs bg-slate-900 border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-slate-300">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-800">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Technical Lead</SelectItem>
                    <SelectItem value="Developer">Core Developer</SelectItem>
                    <SelectItem value="Designer">UI/UX Designer</SelectItem>
                    <SelectItem value="Manager">Project Manager</SelectItem>
                    <SelectItem value="Coordinator">Event Coordinator</SelectItem>
                    <SelectItem value="Head">Department Head</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Position / Title</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g. Lead Engineer"
                  className="h-8 text-xs bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Phone Number (Optional)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="h-8 text-xs bg-slate-900 border-slate-800"
              />
            </div>

            {isMainAdmin && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <Label htmlFor="isAdmin" className="text-slate-200 cursor-pointer font-medium">Grant Admin Access</Label>
                  <p className="text-[10px] text-slate-400">Allows managing events, approvals, and platform settings.</p>
                </div>
                <Switch
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddMember} className="bg-blue-600 hover:bg-blue-700 text-white">
              Add & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Edit Member Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-400">Email Address (Read-only)</Label>
              <Input value={formData.email} disabled className="h-8 text-xs bg-slate-900/50 border-slate-800 text-slate-400" />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Full Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="h-8 text-xs bg-slate-900 border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-slate-300">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-800">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Technical Lead</SelectItem>
                    <SelectItem value="Developer">Core Developer</SelectItem>
                    <SelectItem value="Designer">UI/UX Designer</SelectItem>
                    <SelectItem value="Manager">Project Manager</SelectItem>
                    <SelectItem value="Coordinator">Event Coordinator</SelectItem>
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Position / Title</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g. Lead Engineer"
                  className="h-8 text-xs bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="h-8 text-xs bg-slate-900 border-slate-800"
              />
            </div>

            {isMainAdmin && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <Label htmlFor="edit-isAdmin" className="text-slate-200 cursor-pointer font-medium">Grant Admin Access</Label>
                  <p className="text-[10px] text-slate-400">Allows managing events and approvals.</p>
                </div>
                <Switch
                  id="edit-isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleEditMember} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-400">Remove Member</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-300">
            Are you sure you want to remove <strong className="text-white">{selectedMember?.name || selectedMember?.email}</strong>? They will no longer have access to the platform.
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteMember}>
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
