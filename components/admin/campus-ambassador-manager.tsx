"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Mail,
  Building,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Send,
  Loader2,
  Linkedin,
  Instagram,
  FileText,
} from "lucide-react"

export interface AmbassadorApplication {
  _id: string
  applicationId: string
  name: string
  email: string
  mobile: string
  collegeName: string
  universityName: string
  collegeCity: string
  state: string
  courseBranch: string
  currentYearSemester: string
  collegeStudentId?: string
  profilePhoto?: string
  linkedinUrl?: string
  instagramUrl?: string
  whyJoin: string
  status: "Pending" | "Under Review" | "Approved" | "Rejected"
  adminNotes?: string
  ambassadorId?: string
  referralCode?: string
  approvedAt?: string
  reviewedAt?: string
  customPosition?: string
  team?: string
  points: number
  createdAt: string
}

export function CampusAmbassadorManager() {
  const { toast } = useToast()

  const [applications, setApplications] = useState<AmbassadorApplication[]>([])
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Review Modal State
  const [selectedApp, setSelectedApp] = useState<AmbassadorApplication | null>(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Edit form state inside Review Modal
  const [newStatus, setNewStatus] = useState<string>("Pending")
  const [adminNotes, setAdminNotes] = useState("")
  const [customPosition, setCustomPosition] = useState("Campus Ambassador")
  const [team, setTeam] = useState("General Outreach")
  const [notifyApplicant, setNotifyApplicant] = useState(true)

  // Delete State
  const [appToDelete, setAppToDelete] = useState<AmbassadorApplication | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/ambassadors?status=${filterStatus}&search=${encodeURIComponent(searchTerm)}`)
      const data = await res.json()

      if (data.success && Array.isArray(data.applications)) {
        setApplications(data.applications)
        if (data.counts) {
          setCounts(data.counts)
        }
      } else {
        toast({ title: "Failed to load applications", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not fetch applications.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [filterStatus])

  // Open Review Dialog
  const handleOpenReview = (app: AmbassadorApplication) => {
    setSelectedApp(app)
    setNewStatus(app.status)
    setAdminNotes(app.adminNotes || "")
    setCustomPosition(app.customPosition || "Campus Ambassador")
    setTeam(app.team || "General Outreach")
    setNotifyApplicant(true)
    setIsReviewOpen(true)
  }

  // Save Status / Notes
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedApp) return

    setIsUpdating(true)

    try {
      const res = await fetch("/api/admin/ambassadors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApp.applicationId,
          status: newStatus,
          adminNotes,
          customPosition,
          team,
          notifyApplicant,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: "Application Updated! ✅",
          description: `Status changed to ${newStatus}.${
            data.notificationSent ? " Applicant notified via email." : ""
          }`,
        })
        setIsReviewOpen(false)
        fetchApplications()
      } else {
        toast({ title: "Update Failed", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to update application.", variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }

  // Quick Action: Approve / Reject from Table
  const handleQuickStatus = async (app: AmbassadorApplication, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch("/api/admin/ambassadors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.applicationId,
          status,
          notifyApplicant: true,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: status === "Approved" ? "Ambassador Approved! 🎉" : "Application Rejected",
          description: `${app.name} is now ${status}. Notification email sent.`,
        })
        fetchApplications()
      } else {
        toast({ title: "Action Failed", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" })
    }
  }

  // Delete Application
  const handleDelete = async () => {
    if (!appToDelete) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/admin/ambassadors?applicationId=${appToDelete.applicationId}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast({ title: "Application Deleted", description: `Record for ${appToDelete.name} removed.` })
        setAppToDelete(null)
        fetchApplications()
      } else {
        toast({ title: "Delete Failed", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Applicants</p>
              <h3 className="text-2xl font-black text-foreground">{counts.total}</h3>
            </div>
            <GraduationCap className="h-8 w-8 text-blue-500/20" />
          </CardContent>
        </Card>

        <Card className={`border-border ${counts.pending > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Pending Review</p>
              <h3 className="text-2xl font-black text-amber-500">{counts.pending}</h3>
            </div>
            <Clock className="h-8 w-8 text-amber-500/30" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Under Review</p>
              <h3 className="text-2xl font-black text-blue-400">{counts.underReview}</h3>
            </div>
            <Clock className="h-8 w-8 text-blue-400/30" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Approved Ambassadors</p>
              <h3 className="text-2xl font-black text-green-500">{counts.approved}</h3>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500/30" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Rejected</p>
              <h3 className="text-2xl font-black text-red-500">{counts.rejected}</h3>
            </div>
            <XCircle className="h-8 w-8 text-red-500/30" />
          </CardContent>
        </Card>
      </div>

      {/* Main Applications Table Card */}
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-500" />
              Campus Ambassador Applications
            </CardTitle>
            <CardDescription>
              Review student applications, manage approval statuses, add internal notes, and dispatch official decision emails.
            </CardDescription>
          </div>

          <Button variant="outline" size="sm" onClick={fetchApplications} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
                className="text-xs"
              >
                All ({counts.total})
              </Button>
              <Button
                variant={filterStatus === "Pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("Pending")}
                className="text-xs"
              >
                Pending ({counts.pending})
              </Button>
              <Button
                variant={filterStatus === "Under Review" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("Under Review")}
                className="text-xs"
              >
                Under Review ({counts.underReview})
              </Button>
              <Button
                variant={filterStatus === "Approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("Approved")}
                className="text-xs"
              >
                Approved ({counts.approved})
              </Button>
              <Button
                variant={filterStatus === "Rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("Rejected")}
                className="text-xs"
              >
                Rejected ({counts.rejected})
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, college, email, ref ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchApplications()}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
              <p className="mt-2 text-xs text-muted-foreground">Loading ambassador applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No applications found</p>
              <p className="text-xs">Applications submitted through the public page will appear here.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">Application ID & Name</TableHead>
                    <TableHead className="font-semibold">College & Location</TableHead>
                    <TableHead className="font-semibold">Branch & Year</TableHead>
                    <TableHead className="font-semibold">Contact Details</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Ambassador ID</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.applicationId}>
                      <TableCell>
                        <div className="font-bold text-foreground text-sm">{app.name}</div>
                        <div className="font-mono text-xs text-blue-500">{app.applicationId}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground max-w-[200px] truncate" title={app.collegeName}>
                          {app.collegeName}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {app.collegeCity}, {app.state}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{app.courseBranch}</div>
                        <div className="text-muted-foreground">{app.currentYearSemester}</div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="text-foreground">{app.email}</div>
                        <div className="text-muted-foreground font-mono">{app.mobile}</div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            app.status === "Approved"
                              ? "bg-green-600 text-white"
                              : app.status === "Under Review"
                              ? "bg-blue-600 text-white"
                              : app.status === "Pending"
                              ? "bg-amber-600 text-white animate-pulse"
                              : "bg-red-600 text-white"
                          }`}
                        >
                          {app.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-mono">
                        {app.ambassadorId ? (
                          <span className="font-bold text-blue-500">{app.ambassadorId}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReview(app)}
                            className="h-8 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Review
                          </Button>

                          {app.status === "Pending" || app.status === "Under Review" ? (
                            <>
                              <Button
                                size="sm"
                                className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-2.5"
                                onClick={() => handleQuickStatus(app, "Approved")}
                                title="Approve Ambassador"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs px-2.5"
                                onClick={() => handleQuickStatus(app, "Rejected")}
                                title="Reject Application"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : null}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => setAppToDelete(app)}
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FULL APPLICANT REVIEW & STATUS MODAL */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto sm:rounded-2xl">
          {selectedApp && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                    Application Review: {selectedApp.name}
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedApp.applicationId}
                  </Badge>
                </div>
                <DialogDescription>
                  Full application details, statement of purpose, and status administration.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveReview} className="space-y-6 py-2">
                {/* Applicant Summary Strip */}
                <div className="rounded-xl border border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Full Name:</span>
                      <p className="font-bold text-foreground text-sm">{selectedApp.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium text-foreground">{selectedApp.email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mobile:</span>
                      <p className="font-medium text-foreground font-mono">{selectedApp.mobile}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Applied Date:</span>
                      <p className="font-medium text-foreground">
                        {new Date(selectedApp.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-border/40">
                    <div>
                      <span className="text-muted-foreground">College:</span>
                      <p className="font-semibold text-foreground">{selectedApp.collegeName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">University:</span>
                      <p className="font-semibold text-foreground">{selectedApp.universityName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">City & State:</span>
                      <p className="font-medium text-foreground">{selectedApp.collegeCity}, {selectedApp.state}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Branch & Year:</span>
                      <p className="font-medium text-foreground">{selectedApp.courseBranch} ({selectedApp.currentYearSemester})</p>
                    </div>
                  </div>

                  {/* Verification Docs & Socials */}
                  <div className="flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-border/40">
                    {selectedApp.collegeStudentId && (
                      <div>
                        <span className="text-muted-foreground">Student ID / Roll: </span>
                        <strong className="text-foreground">{selectedApp.collegeStudentId}</strong>
                      </div>
                    )}
                    {selectedApp.linkedinUrl && (
                      <a
                        href={selectedApp.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <Linkedin className="h-3.5 w-3.5" /> LinkedIn Profile <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedApp.instagramUrl && (
                      <a
                        href={selectedApp.instagramUrl.startsWith("http") ? selectedApp.instagramUrl : `https://instagram.com/${selectedApp.instagramUrl.replace("@", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pink-500 hover:underline flex items-center gap-1"
                      >
                        <Instagram className="h-3.5 w-3.5" /> Instagram ({selectedApp.instagramUrl}) <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Statement of Purpose */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Why do you want to become a Campus Ambassador?
                  </Label>
                  <div className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                    {selectedApp.whyJoin}
                  </div>
                </div>

                {/* Status & Administration Section */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Application Decision & Administration
                  </h4>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="statusSelect">Application Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger id="statusSelect">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending Review</SelectItem>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Approved">Approved (Grants Dashboard)</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="posInput">Role Title</Label>
                      <Input
                        id="posInput"
                        value={customPosition}
                        onChange={(e) => setCustomPosition(e.target.value)}
                        placeholder="Campus Ambassador"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="teamInput">Assigned Team / Zone</Label>
                      <Input
                        id="teamInput"
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                        placeholder="e.g. North Zone / Outreach"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notesArea">Internal Admin Notes / Feedback</Label>
                    <Textarea
                      id="notesArea"
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes visible to selection team or included in candidate emails..."
                      className="text-xs"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="notifyCheck"
                      checked={notifyApplicant}
                      onCheckedChange={(checked) => setNotifyApplicant(!!checked)}
                    />
                    <label
                      htmlFor="notifyCheck"
                      className="text-xs font-medium text-foreground cursor-pointer"
                    >
                      Send automated status update email to applicant ({selectedApp.email})
                    </label>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Decision & Notes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!appToDelete} onOpenChange={(open) => !open && setAppToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campus Ambassador Application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the application record for <strong>{appToDelete?.name}</strong> ({appToDelete?.applicationId}) from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
