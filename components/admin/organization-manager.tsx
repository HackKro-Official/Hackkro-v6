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
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  ExternalLink,
  ShieldCheck,
  Send,
  Loader2,
  Globe,
  User,
  Calendar,
} from "lucide-react"

export interface OrganizerRecord {
  _id: string
  name: string
  email: string
  organization: string
  designation?: string
  phone?: string
  website?: string
  collegeOrCompany?: string
  description?: string
  status: "active" | "approved" | "pending" | "rejected" | "suspended"
  active: boolean
  adminNotes?: string
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
  lastLogin?: string
}

export function OrganizationManager() {
  const [organizers, setOrganizers] = useState<OrganizerRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrganizer, setSelectedOrganizer] = useState<OrganizerRecord | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [organizerToReject, setOrganizerToReject] = useState<OrganizerRecord | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [organizerToDelete, setOrganizerToDelete] = useState<OrganizerRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notifyOrganizer, setNotifyOrganizer] = useState(true)

  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  const { toast } = useToast()

  const fetchOrganizers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (search.trim()) params.append("search", search.trim())

      const res = await fetch(`/api/admin/organizers?${params.toString()}`)
      const data = await res.json()

      if (res.ok && data.success) {
        setOrganizers(data.organizers || [])
        if (data.counts) setCounts(data.counts)
      } else {
        toast({
          title: "Error fetching organizers",
          description: data.message || "Failed to load organizations.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Network Error",
        description: "Could not connect to the server.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizers()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchOrganizers()
  }

  // Quick Approve
  const handleApprove = async (organizer: OrganizerRecord) => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/organizers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerId: organizer._id,
          status: "approved",
          notifyOrganizer: true,
          adminNotes: "Approved by HackKro Admin Team. Welcome to the Organizer Hub!",
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: "Organization Approved 🎉",
          description: `${organizer.organization} is now approved. Notification email sent to ${organizer.email}.`,
        })
        fetchOrganizers()
      } else {
        toast({
          title: "Approval Failed",
          description: data.message || "Could not update status.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong while approving.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirm Reject with reason
  const handleConfirmReject = async () => {
    if (!organizerToReject) return
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/admin/organizers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerId: organizerToReject._id,
          status: "rejected",
          adminNotes: rejectReason.trim() || "Details could not be verified by the admin team.",
          notifyOrganizer,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: "Organization Rejected",
          description: `${organizerToReject.organization} has been set to rejected.`,
        })
        setIsRejectModalOpen(false)
        setOrganizerToReject(null)
        setRejectReason("")
        fetchOrganizers()
      } else {
        toast({
          title: "Action Failed",
          description: data.message || "Failed to update status.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not complete rejection.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Organizer
  const handleDelete = async () => {
    if (!organizerToDelete) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/admin/organizers?organizerId=${organizerToDelete._id}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: "Organizer Deleted",
          description: `${organizerToDelete.organization} has been permanently removed.`,
        })
        setOrganizerToDelete(null)
        fetchOrganizers()
      } else {
        toast({
          title: "Deletion Failed",
          description: data.message || "Could not delete organizer.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error during deletion.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase()
    switch (s) {
      case "approved":
      case "active":
        return (
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 font-semibold gap-1">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 font-semibold gap-1">
            <Clock className="h-3 w-3" /> Pending Review
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-rose-600/20 text-rose-400 border-rose-500/30 font-semibold gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building className="h-6 w-6 text-emerald-500" />
            Organizations & Event Hosts
          </h2>
          <p className="text-sm text-muted-foreground">
            Review, approve, and manage colleges, student clubs, and tech communities hosting hackathons on HackKro.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrganizers} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Counter Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Organizations</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{counts.total}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Building className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Pending Review</p>
              <p className="text-2xl font-black mt-1 text-amber-500">{counts.pending}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Approved Hosts</p>
              <p className="text-2xl font-black mt-1 text-emerald-500">{counts.approved}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30 bg-rose-500/5 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Rejected</p>
              <p className="text-2xl font-black mt-1 text-rose-500">{counts.rejected}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by organization name, person, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses ({counts.total})</SelectItem>
                  <SelectItem value="pending">Pending Approval ({counts.pending})</SelectItem>
                  <SelectItem value="approved">Approved ({counts.approved})</SelectItem>
                  <SelectItem value="rejected">Rejected ({counts.rejected})</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card className="border-border/60 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm">Loading organization partner records...</p>
            </div>
          ) : organizers.length === 0 ? (
            <div className="text-center py-20 px-4">
              <Building className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No organizations found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                No organizations match the current filter or search criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">Organization / College</TableHead>
                    <TableHead className="font-semibold">Representative</TableHead>
                    <TableHead className="font-semibold">Contact Info</TableHead>
                    <TableHead className="font-semibold">Applied Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizers.map((org) => {
                    const isPending = (org.status || "").toLowerCase() === "pending"
                    const isApproved = (org.status || "").toLowerCase() === "approved" || (org.status || "").toLowerCase() === "active"

                    return (
                      <TableRow key={org._id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{org.organization}</span>
                            {org.website && (
                              <a
                                href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-blue-500"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground block">
                            {org.designation || "Event Host"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm text-foreground">{org.name}</div>
                          <span className="text-xs text-muted-foreground">{org.email}</span>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {org.phone ? (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3 text-emerald-500" />
                                <span>{org.phone}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">No phone</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(org.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>

                        <TableCell>{getStatusBadge(org.status)}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs font-semibold gap-1"
                                onClick={() => handleApprove(org)}
                                disabled={isSubmitting}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve
                              </Button>
                            )}

                            {isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 h-8 px-2 text-xs"
                                onClick={() => {
                                  setOrganizerToReject(org)
                                  setIsRejectModalOpen(true)
                                }}
                                disabled={isSubmitting}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            )}

                            {isApproved && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-500 hover:bg-rose-500/10 h-8 px-2 text-xs"
                                onClick={() => {
                                  setOrganizerToReject(org)
                                  setIsRejectModalOpen(true)
                                }}
                                disabled={isSubmitting}
                              >
                                Revoke
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedOrganizer(org)
                                setIsViewModalOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                              onClick={() => setOrganizerToDelete(org)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-emerald-500" />
              Organization Details
            </DialogTitle>
            <DialogDescription>
              Full profile and application credentials for {selectedOrganizer?.organization}
            </DialogDescription>
          </DialogHeader>

          {selectedOrganizer && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Organization / College</span>
                  <span className="font-semibold text-foreground text-base">{selectedOrganizer.organization}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Approval Status</span>
                  <div className="mt-1">{getStatusBadge(selectedOrganizer.status)}</div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Representative Person</span>
                  <span className="font-medium text-foreground">{selectedOrganizer.name}</span>
                  <span className="text-xs text-muted-foreground block">({selectedOrganizer.designation || "Host"})</span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Official Email</span>
                  <a href={`mailto:${selectedOrganizer.email}`} className="text-blue-500 hover:underline">
                    {selectedOrganizer.email}
                  </a>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Contact Phone</span>
                  <span className="text-foreground">{selectedOrganizer.phone || "Not specified"}</span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Website</span>
                  {selectedOrganizer.website ? (
                    <a
                      href={selectedOrganizer.website.startsWith("http") ? selectedOrganizer.website : `https://${selectedOrganizer.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {selectedOrganizer.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">None provided</span>
                  )}
                </div>
              </div>

              {selectedOrganizer.adminNotes && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
                  <strong>Internal Admin Note:</strong> {selectedOrganizer.adminNotes}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Registered: {new Date(selectedOrganizer.createdAt).toLocaleString()}</span>
                {selectedOrganizer.lastLogin && (
                  <span>Last Login: {new Date(selectedOrganizer.lastLogin).toLocaleString()}</span>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedOrganizer && (selectedOrganizer.status || "").toLowerCase() === "pending" && (
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setIsViewModalOpen(false)
                  handleApprove(selectedOrganizer)
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve Account
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-500 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Reject Organizer Application
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the application for <strong>{organizerToReject?.organization}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reason for Rejection (Optional note for records & email)</Label>
              <Textarea
                id="rejectReason"
                placeholder="e.g. Could not verify college affiliation or invalid credentials."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyApplicant"
                checked={notifyOrganizer}
                onCheckedChange={(c) => setNotifyOrganizer(!!c)}
              />
              <Label htmlFor="notifyApplicant" className="text-xs cursor-pointer">
                Send notification email to {organizerToReject?.email}
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!organizerToDelete} onOpenChange={(open) => !open && setOrganizerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organizer Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organizer account for{" "}
              <strong>{organizerToDelete?.organization}</strong> ({organizerToDelete?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
