"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Sparkles,
  Layers,
  Users,
  Eye,
  RefreshCw,
  Loader2,
  AlertTriangle,
  X,
  ExternalLink,
  MapPin,
  Trophy,
  Medal,
  Tag,
  ShieldCheck,
} from "lucide-react"

export interface AdminEventRound {
  roundNumber: number
  title: string
  testId?: string
  description?: string
  scheduledDate?: string
  startTime?: string
  endTime?: string
  durationMinutes?: number
  mode?: "online" | "offline" | "hybrid"
  status?: "scheduled" | "live" | "completed"
}

export interface AdminEventItem {
  _id: string
  id: string
  numericId: number
  title: string
  category: string
  tagline: string
  description: string
  longDescription?: string
  date: string
  endDate?: string
  mode: "Online" | "Offline" | "Hybrid"
  venue?: string
  location?: string
  registrationOpens?: string
  registrationDeadline?: string
  statusOverride: "live" | "coming-soon" | "past" | "closed"
  featured: boolean
  image: string
  prizePool?: string
  teamSize?: { min: number; max: number }
  registrationFee?: string
  tracks?: string[]
  perks?: string[]
  eligibility?: string
  rules?: string[]
  winners?: string[]
  structuredWinners?: {
    rank: number
    title: string
    teamName: string
    leaderName?: string
    collegeOrOrg?: string
    projectName?: string
    prizeWon?: string
    projectUrl?: string
  }[]
  resultsAnnounced?: boolean
  resultsAnnouncedAt?: string
  resultsUrl?: string
  rounds?: AdminEventRound[]
  approvalStatus: "approved" | "pending" | "rejected"
  organizerId?: string
  organizerName?: string
  organizerEmail?: string
  organizerOrganization?: string
  registeredCount?: number
  emailBroadcastsSent?: number
  createdAt: string
}

export function EventManager() {
  const { toast } = useToast()

  const [events, setEvents] = useState<AdminEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Create / Edit Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogTab, setDialogTab] = useState("basic")

  // Delete State
  const [eventToDelete, setEventToDelete] = useState<AdminEventItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    category: "Hackathon",
    tagline: "",
    description: "",
    longDescription: "",
    date: "",
    endDate: "",
    mode: "Online" as "Online" | "Offline" | "Hybrid",
    venue: "",
    location: "",
    registrationOpens: "",
    registrationDeadline: "",
    statusOverride: "live" as "live" | "coming-soon" | "past" | "closed",
    featured: false,
    image: "https://res.cloudinary.com/payb7fsq/image/upload/v1793190149/1_1.png",
    prizePool: "Cash Prizes & Goodies",
    teamSizeMin: 1,
    teamSizeMax: 4,
    registrationFee: "Free",
    tracks: "",
    perks: "",
    eligibility: "Open to all students",
    rules: "",
    approvalStatus: "approved" as "approved" | "pending" | "rejected",
    structuredWinners: [] as {
      rank: number
      title: string
      teamName: string
      leaderName?: string
      collegeOrOrg?: string
      projectName?: string
      prizeWon?: string
      projectUrl?: string
    }[],
    resultsAnnounced: false,
    resultsUrl: "",
    rounds: [
      {
        roundNumber: 1,
        title: "Round 1: Preliminary Quiz",
        testId: "",
        scheduledDate: "",
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        durationMinutes: 30,
        description: "Official preliminary round testing aptitude and domain knowledge.",
        mode: "online" as const,
        status: "scheduled" as const,
      },
    ] as AdminEventRound[],
  })

  // Fetch all events from MongoDB
  const fetchEvents = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/events?approvalStatus=all")
      const data = await res.json()
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events)
      } else {
        toast({ title: "Failed to load events", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not fetch events.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // Auto-generate Event Slug ID helper
  const handleGenerateSlug = () => {
    if (!formData.title.trim()) {
      toast({ title: "Title Required", description: "Enter an event title first to generate an ID.", variant: "destructive" })
      return
    }
    const cleanTitle = formData.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    const year = formData.date ? formData.date.split("-")[0] : new Date().getFullYear()
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const generatedSlug = cleanTitle.includes(String(year))
      ? `${cleanTitle}-${randomSuffix}`
      : `${cleanTitle}-${year}-${randomSuffix}`

    setFormData((prev) => ({
      ...prev,
      id: generatedSlug,
      rounds: prev.rounds.map((r, i) => ({
        ...r,
        testId: r.testId || `TEST-${generatedSlug.slice(0, 8).toUpperCase()}-R${i + 1}`,
      })),
    }))

    toast({ title: "Slug ID Generated", description: `Assigned: ${generatedSlug}` })
  }

  // Open Create Dialog
  const handleOpenCreate = () => {
    setIsEditing(false)
    setDialogTab("basic")
    const today = new Date().toISOString().split("T")[0]
    setFormData({
      id: "",
      title: "",
      category: "Hackathon",
      tagline: "",
      description: "",
      longDescription: "",
      date: today,
      endDate: today,
      mode: "Online",
      venue: "",
      location: "India / Virtual",
      registrationOpens: today,
      registrationDeadline: today,
      statusOverride: "live",
      featured: false,
      image: "https://res.cloudinary.com/payb7fsq/image/upload/v1793190149/1_1.png",
      prizePool: "Cash Prizes & Goodies",
      teamSizeMin: 1,
      teamSizeMax: 4,
      registrationFee: "Free",
      tracks: "AI/ML, Web Development, Cloud & DevOps, Open Innovation",
      perks: "Verified Certificate of Participation\nExclusive HackKro Goodies & Badges\nMentorship from Industry Leaders",
      eligibility: "Open to all college students, developers, and tech enthusiasts",
      rules: "1. Respect submission deadlines and originality guidelines.\n2. All team members must be registered on HackKro.",
      approvalStatus: "approved",
      structuredWinners: [],
      resultsAnnounced: false,
      resultsUrl: "",
      rounds: [
        {
          roundNumber: 1,
          title: "Round 1: Preliminary Quiz & Screening",
          testId: "",
          scheduledDate: today,
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          durationMinutes: 30,
          description: "Online screening assessment round.",
          mode: "online",
          status: "scheduled",
        },
      ],
    })
    setIsDialogOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEdit = (event: AdminEventItem) => {
    setIsEditing(true)
    setDialogTab("basic")
    setFormData({
      id: event.id,
      title: event.title,
      category: event.category,
      tagline: event.tagline || "",
      description: event.description,
      longDescription: event.longDescription || "",
      date: event.date,
      endDate: event.endDate || event.date,
      mode: event.mode || "Online",
      venue: event.venue || "",
      location: event.location || "",
      registrationOpens: event.registrationOpens || event.date,
      registrationDeadline: event.registrationDeadline || event.date,
      statusOverride: event.statusOverride || "live",
      featured: !!event.featured,
      image: event.image || "",
      prizePool: event.prizePool || "",
      teamSizeMin: event.teamSize?.min || 1,
      teamSizeMax: event.teamSize?.max || 4,
      registrationFee: event.registrationFee || "Free",
      tracks: event.tracks ? event.tracks.join(", ") : "",
      perks: event.perks ? event.perks.join("\n") : "",
      eligibility: event.eligibility || "",
      rules: event.rules ? event.rules.join("\n") : "",
      approvalStatus: event.approvalStatus || "approved",
      structuredWinners: event.structuredWinners && event.structuredWinners.length > 0 ? event.structuredWinners : [],
      resultsAnnounced: !!event.resultsAnnounced,
      resultsUrl: event.resultsUrl || "",
      rounds:
        event.rounds && event.rounds.length > 0
          ? event.rounds
          : [
              {
                roundNumber: 1,
                title: "Round 1: Preliminary Quiz",
                testId: `TEST-${event.id.slice(0, 6).toUpperCase()}-R1`,
                scheduledDate: event.date,
                startTime: "10:00 AM",
                endTime: "11:00 AM",
                durationMinutes: 30,
                description: "Assessment round",
                mode: "online",
                status: "scheduled",
              },
            ],
    })
    setIsDialogOpen(true)
  }

  // Quick Status Change directly from Table
  const handleQuickStatusChange = async (
    event: AdminEventItem,
    newStatus: "live" | "coming-soon" | "past" | "closed"
  ) => {
    const prevEvents = [...events]
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, statusOverride: newStatus } : e))
    )

    try {
      const res = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          statusOverride: newStatus,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: "Status Updated",
          description: `"${event.title}" is now marked as ${newStatus}.`,
        })
      } else {
        setEvents(prevEvents)
        toast({ title: "Update Failed", description: data.message, variant: "destructive" })
      }
    } catch {
      setEvents(prevEvents)
      toast({ title: "Network error", description: "Failed to update event status.", variant: "destructive" })
    }
  }

  // Quick Approval Change directly from Table
  const handleQuickApprovalChange = async (
    event: AdminEventItem,
    newApproval: "approved" | "pending" | "rejected"
  ) => {
    const prevEvents = [...events]
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              approvalStatus: newApproval,
              statusOverride: newApproval === "approved" ? "live" : e.statusOverride,
            }
          : e
      )
    )

    try {
      const res = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          approvalStatus: newApproval,
          statusOverride: newApproval === "approved" ? "live" : undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: `Event ${newApproval === "approved" ? "Approved" : newApproval === "rejected" ? "Rejected" : "Marked Pending"}`,
          description: `"${event.title}" approval status set to ${newApproval}.`,
        })
      } else {
        setEvents(prevEvents)
        toast({ title: "Action Failed", description: data.message, variant: "destructive" })
      }
    } catch {
      setEvents(prevEvents)
      toast({ title: "Network error", description: "Could not update approval status.", variant: "destructive" })
    }
  }

  // Submit Save/Create Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.description || !formData.date) {
      toast({ title: "Missing Fields", description: "Title, description, and date are required.", variant: "destructive" })
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        id: formData.id || undefined,
        title: formData.title,
        category: formData.category,
        tagline: formData.tagline,
        description: formData.description,
        longDescription: formData.longDescription || formData.description,
        date: formData.date,
        endDate: formData.endDate || formData.date,
        mode: formData.mode,
        venue: formData.venue,
        location: formData.location,
        registrationOpens: formData.registrationOpens,
        registrationDeadline: formData.registrationDeadline,
        statusOverride: formData.statusOverride,
        featured: formData.featured,
        image: formData.image,
        prizePool: formData.prizePool,
        teamSize: {
          min: Number(formData.teamSizeMin) || 1,
          max: Number(formData.teamSizeMax) || 4,
        },
        registrationFee: formData.registrationFee,
        tracks: formData.tracks
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        perks: formData.perks
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        eligibility: formData.eligibility,
        rules: formData.rules
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        rounds: formData.rounds.map((r, i) => ({
          roundNumber: i + 1,
          title: r.title,
          testId: r.testId || `TEST-${(formData.id || formData.title.slice(0, 4)).toUpperCase()}-R${i + 1}`,
          scheduledDate: r.scheduledDate || formData.date,
          startTime: r.startTime || "10:00 AM",
          endTime: r.endTime || "11:00 AM",
          durationMinutes: Number(r.durationMinutes) || 30,
          description: r.description || "",
          mode: r.mode || "online",
          status: r.status || "scheduled",
        })),
        structuredWinners: formData.structuredWinners.filter((w) => w.teamName && w.teamName.trim().length > 0),
        resultsAnnounced: formData.resultsAnnounced,
        resultsUrl: formData.resultsUrl,
        approvalStatus: formData.approvalStatus,
      }

      const res = await fetch("/api/admin/events", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: isEditing ? "Event Updated! 🎉" : "Event Created! 🚀",
          description: isEditing ? `Changes to "${formData.title}" saved.` : `Event ID ${data.event?.id} created and published.`,
        })
        setIsDialogOpen(false)
        fetchEvents()
      } else {
        toast({ title: "Error", description: data.message || "Failed to save event.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Failed to save event.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Event with Optimistic Update
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return
    const target = eventToDelete
    setIsDeleting(true)

    // Optimistically remove from state so the user immediately sees it removed
    const previousEvents = [...events]
    setEvents((prev) => prev.filter((e) => e.id !== target.id))

    try {
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(target.id)}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: "Event Deleted Successfully 🗑️",
          description: `"${target.title}" (${target.id}) has been permanently deleted.`,
        })
        setEventToDelete(null)
      } else {
        // Revert on error
        setEvents(previousEvents)
        toast({
          title: "Delete Failed",
          description: data.message || "Could not delete event from database.",
          variant: "destructive",
        })
      }
    } catch {
      // Revert on network error
      setEvents(previousEvents)
      toast({ title: "Network error", description: "Could not delete event.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered Events
  const pendingEvents = useMemo(() => events.filter((e) => e.approvalStatus === "pending"), [events])

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterTab === "pending" && e.approvalStatus !== "pending") return false
      if (filterTab === "approved" && e.approvalStatus !== "approved") return false
      if (filterTab === "rejected" && e.approvalStatus !== "rejected") return false

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        return (
          e.title.toLowerCase().includes(term) ||
          e.id.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term) ||
          (e.organizerName && e.organizerName.toLowerCase().includes(term))
        )
      }
      return true
    })
  }, [events, filterTab, searchTerm])

  return (
    <div className="space-y-6">
      {/* Top Banner & Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Listings</p>
              <h3 className="text-2xl font-black text-foreground">{events.length}</h3>
            </div>
            <Calendar className="h-8 w-8 text-blue-500/20" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Approved & Live</p>
              <h3 className="text-2xl font-black text-green-500">
                {events.filter((e) => e.approvalStatus === "approved").length}
              </h3>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500/20" />
          </CardContent>
        </Card>

        <Card className={`border-border ${pendingEvents.length > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Pending Approvals</p>
              <h3 className="text-2xl font-black text-amber-500">{pendingEvents.length}</h3>
            </div>
            <Clock className="h-8 w-8 text-amber-500/30" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Registrations</p>
              <h3 className="text-2xl font-black text-blue-400">
                {events.reduce((sum, e) => sum + (e.registeredCount || 0), 0)}
              </h3>
            </div>
            <Users className="h-8 w-8 text-blue-400/20" />
          </CardContent>
        </Card>
      </div>

      {/* PENDING APPROVALS QUEUE (If any) */}
      {pendingEvents.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/10 dark:bg-amber-950/10 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
                <CardTitle className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  Organizer Event Approval Requests ({pendingEvents.length})
                </CardTitle>
              </div>
              <Badge variant="outline" className="border-amber-500 text-amber-500">
                Requires Admin Action
              </Badge>
            </div>
            <CardDescription>
              The following events have been submitted by registered organizers and are waiting for your approval to be listed publicly.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {pendingEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex flex-col gap-3 rounded-xl border border-amber-200/50 bg-card p-4 shadow-sm dark:border-amber-900/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-foreground">{evt.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {evt.category}
                    </Badge>
                    <code className="text-xs font-mono text-blue-400">ID: {evt.id}</code>
                  </div>

                  <p className="text-xs text-muted-foreground">{evt.tagline || evt.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span>
                      Organizer: <strong className="text-foreground">{evt.organizerName || "Partner"}</strong> (
                      {evt.organizerOrganization || evt.organizerEmail})
                    </span>
                    <span>Date: {evt.date}</span>
                    <span>Mode: {evt.mode}</span>
                    <span>Rounds: {evt.rounds?.length || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(evt)}
                    className="text-xs"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Review & Edit
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                    onClick={() => handleQuickApprovalChange(evt, "approved")}
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Approve Event
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => handleQuickApprovalChange(evt, "rejected")}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Events Manager Card */}
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Event Listings Management
            </CardTitle>
            <CardDescription>
              Create, edit, generate IDs, configure test rounds, and manage approvals without changing code.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-1.5 h-4 w-4" />
              Create New Event
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={filterTab === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab("all")}
                className="text-xs"
              >
                All ({events.length})
              </Button>
              <Button
                variant={filterTab === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab("approved")}
                className="text-xs"
              >
                Approved ({events.filter((e) => e.approvalStatus === "approved").length})
              </Button>
              <Button
                variant={filterTab === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab("pending")}
                className="text-xs"
              >
                Pending ({pendingEvents.length})
              </Button>
              <Button
                variant={filterTab === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab("rejected")}
                className="text-xs"
              >
                Rejected ({events.filter((e) => e.approvalStatus === "rejected").length})
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, category, slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Events Table */}
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
              <p className="mt-2 text-xs text-muted-foreground">Loading event listings...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No events matching filter</p>
              <p className="text-xs">Click &quot;Create New Event&quot; to generate an event listing.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">Event ID & Title</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Dates & Mode</TableHead>
                    <TableHead className="font-semibold">Rounds</TableHead>
                    <TableHead className="font-semibold">Registrations</TableHead>
                    <TableHead className="font-semibold">Approval</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((evt) => (
                    <TableRow key={evt.id}>
                      <TableCell className="max-w-[240px]">
                        <div className="font-bold text-foreground text-sm line-clamp-1">{evt.title}</div>
                        <div className="text-xs font-mono text-blue-500 flex items-center gap-1">
                          <span className="truncate">{evt.id}</span>
                          <span className="text-[10px] text-muted-foreground font-sans shrink-0">
                            (#{evt.numericId})
                          </span>
                        </div>
                        {evt.organizerName && evt.organizerName !== "HackKro Admin" && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            Org: {evt.organizerName}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {evt.category}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{evt.date}</div>
                        <div className="text-muted-foreground">{evt.mode}</div>
                      </TableCell>

                      <TableCell className="text-xs font-semibold">
                        {evt.rounds && evt.rounds.length > 0 ? (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">
                            {evt.rounds.length} Round(s)
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="font-bold text-blue-500 text-sm">
                        {evt.registeredCount || 0}
                      </TableCell>

                      {/* Interactive Approval Dropdown */}
                      <TableCell>
                        <Select
                          value={evt.approvalStatus}
                          onValueChange={(val: any) => handleQuickApprovalChange(evt, val)}
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs font-semibold border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved" className="text-green-500 font-semibold">
                              ✓ Approved
                            </SelectItem>
                            <SelectItem value="pending" className="text-amber-500 font-semibold">
                              ⏳ Pending
                            </SelectItem>
                            <SelectItem value="rejected" className="text-red-500 font-semibold">
                              ✕ Rejected
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Interactive Status Dropdown */}
                      <TableCell>
                        <Select
                          value={evt.statusOverride || "live"}
                          onValueChange={(val: any) => handleQuickStatusChange(evt, val)}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs font-semibold border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="live" className="text-green-500 font-medium">
                              ● Live & Open
                            </SelectItem>
                            <SelectItem value="coming-soon" className="text-amber-500 font-medium">
                              ● Coming Soon
                            </SelectItem>
                            <SelectItem value="closed" className="text-blue-400 font-medium">
                              ● Closed
                            </SelectItem>
                            <SelectItem value="past" className="text-slate-400 font-medium">
                              ● Past
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            onClick={() => handleOpenEdit(evt)}
                            title="Edit Event"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${
                              evt.structuredWinners && evt.structuredWinners.length > 0
                                ? "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                : "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                            }`}
                            onClick={() => {
                              handleOpenEdit(evt)
                              setDialogTab("winners")
                            }}
                            title="Announce & Manage Winners"
                          >
                            <Trophy className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-500/10"
                            title="View on Public Page"
                          >
                            <Link href="/events" target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => setEventToDelete(evt)}
                            title="Delete Event"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* CREATE / EDIT EVENT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              {isEditing ? `Edit Event: ${formData.title}` : "Create New Event & ID Generator"}
            </DialogTitle>
            <DialogDescription>
              Manage all event parameters, configure registration rules, prizes, and test rounds.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEvent} className="space-y-4 py-2">
            <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full">
              <TabsList className="grid grid-cols-5 w-full mb-3 text-xs">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="details">Prizes</TabsTrigger>
                <TabsTrigger value="rounds">Rounds ({formData.rounds.length})</TabsTrigger>
                <TabsTrigger value="winners" className="text-amber-500 font-semibold">
                  🏆 Winners ({formData.structuredWinners.length})
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: BASIC INFO */}
              <TabsContent value="basic" className="space-y-4">
                <div className="rounded-xl border border-blue-500/30 bg-blue-50/20 p-4 dark:bg-blue-950/20 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ev-title">Event Title *</Label>
                      <Input
                        id="ev-title"
                        placeholder="e.g. NATIONAL CODEFEST 2026"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ev-id">Unique Slug ID</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-blue-500 hover:text-blue-600 p-0"
                          onClick={handleGenerateSlug}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Auto-Generate
                        </Button>
                      </div>
                      <Input
                        id="ev-id"
                        placeholder="e.g. codefest-2026"
                        value={formData.id}
                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                        className="font-mono text-xs"
                        disabled={isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-cat">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                    >
                      <SelectTrigger id="ev-cat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hackathon">Hackathon</SelectItem>
                        <SelectItem value="Technical Quiz">Technical Quiz</SelectItem>
                        <SelectItem value="Business Quiz">Business Quiz</SelectItem>
                        <SelectItem value="Workshop & Masterclass">Workshop & Masterclass</SelectItem>
                        <SelectItem value="Pitching Challenge">Pitching Challenge</SelectItem>
                        <SelectItem value="Tech Conclave">Tech Conclave</SelectItem>
                        <SelectItem value="Innovation Expo">Innovation Expo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-mode">Participation Mode</Label>
                    <Select
                      value={formData.mode}
                      onValueChange={(val: any) => setFormData({ ...formData, mode: val })}
                    >
                      <SelectTrigger id="ev-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-status">Status Override</Label>
                    <Select
                      value={formData.statusOverride}
                      onValueChange={(val: any) => setFormData({ ...formData, statusOverride: val })}
                    >
                      <SelectTrigger id="ev-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live & Open</SelectItem>
                        <SelectItem value="coming-soon">Coming Soon</SelectItem>
                        <SelectItem value="past">Past / Completed</SelectItem>
                        <SelectItem value="closed">Registration Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-tagline">Tagline</Label>
                  <Input
                    id="ev-tagline"
                    placeholder="One-liner hook for event cards"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-desc">Short Description *</Label>
                  <Textarea
                    id="ev-desc"
                    rows={2}
                    placeholder="Concise overview..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-long-desc">Detailed Description / About Event</Label>
                  <Textarea
                    id="ev-long-desc"
                    rows={3}
                    placeholder="Comprehensive event details, agenda, and guidelines..."
                    value={formData.longDescription}
                    onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label className="font-semibold text-sm">Featured Event</Label>
                    <p className="text-xs text-muted-foreground">Highlight this event in hero banner and top carousels</p>
                  </div>
                  <Switch
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                </div>
              </TabsContent>

              {/* TAB 2: SCHEDULE & VENUE */}
              <TabsContent value="schedule" className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-date">Event Start Date *</Label>
                    <Input
                      id="ev-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-end">Event End Date</Label>
                    <Input
                      id="ev-end"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-reg-opens">Registration Opens</Label>
                    <Input
                      id="ev-reg-opens"
                      type="date"
                      value={formData.registrationOpens}
                      onChange={(e) => setFormData({ ...formData, registrationOpens: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-deadline">Registration Deadline</Label>
                    <Input
                      id="ev-deadline"
                      type="date"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-venue">Venue / Campus</Label>
                    <Input
                      id="ev-venue"
                      placeholder="e.g. Main Auditorium / Discord Virtual Server"
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-location">Location (City / State / Virtual)</Label>
                    <Input
                      id="ev-location"
                      placeholder="e.g. New Delhi, India or Virtual"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-img">Banner Image URL</Label>
                  <Input
                    id="ev-img"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                  />
                  {formData.image && (
                    <div className="mt-2 relative h-32 w-full rounded-lg overflow-hidden border border-border bg-slate-900">
                      <Image
                        src={formData.image}
                        alt="Event Banner Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 3: PRIZES & CRITERIA */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-prize">Prize Pool / Awards</Label>
                    <Input
                      id="ev-prize"
                      placeholder="e.g. ₹50,000 Cash + Swags + Mentorship"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-fee">Registration Fee</Label>
                    <Input
                      id="ev-fee"
                      placeholder="e.g. Free or ₹200 per team"
                      value={formData.registrationFee}
                      onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-min-team">Min Team Size</Label>
                    <Input
                      id="ev-min-team"
                      type="number"
                      min={1}
                      max={10}
                      value={formData.teamSizeMin}
                      onChange={(e) => setFormData({ ...formData, teamSizeMin: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-max-team">Max Team Size</Label>
                    <Input
                      id="ev-max-team"
                      type="number"
                      min={1}
                      max={20}
                      value={formData.teamSizeMax}
                      onChange={(e) => setFormData({ ...formData, teamSizeMax: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-eligibility">Eligibility</Label>
                  <Input
                    id="ev-eligibility"
                    placeholder="e.g. Open to all engineering, polytechnic, and MCA students"
                    value={formData.eligibility}
                    onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-tracks">Tracks / Problem Themes (Comma-separated)</Label>
                  <Input
                    id="ev-tracks"
                    placeholder="e.g. AI/ML, Web3, FinTech, Healthcare, Open Innovation"
                    value={formData.tracks}
                    onChange={(e) => setFormData({ ...formData, tracks: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-perks">Perks & Benefits (One per line)</Label>
                  <Textarea
                    id="ev-perks"
                    rows={2}
                    placeholder="Verified Certificate of Participation&#10;Exclusive HackKro Goodies&#10;Direct Internship Opportunities"
                    value={formData.perks}
                    onChange={(e) => setFormData({ ...formData, perks: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-rules">Rules & Guidelines (One per line)</Label>
                  <Textarea
                    id="ev-rules"
                    rows={2}
                    placeholder="1. Plagiarism is strictly prohibited.&#10;2. Projects must be built during the hackathon period."
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  />
                </div>
              </TabsContent>

              {/* TAB 4: TEST & ASSESSMENT ROUNDS */}
              <TabsContent value="rounds" className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-500" />
                      Scheduled Assessment & Test Rounds
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Linked to the Test Portal for automated screenings, coding assessments, or quizzes.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextNum = formData.rounds.length + 1
                      setFormData({
                        ...formData,
                        rounds: [
                          ...formData.rounds,
                          {
                            roundNumber: nextNum,
                            title: `Round ${nextNum}: Coding & Problem Solving`,
                            testId: `TEST-${(formData.id || "EVT").slice(0, 4).toUpperCase()}-R${nextNum}`,
                            scheduledDate: formData.date,
                            startTime: "02:00 PM",
                            endTime: "03:00 PM",
                            durationMinutes: 45,
                            description: "Assessment round",
                            mode: "online",
                            status: "scheduled",
                          },
                        ],
                      })
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Round
                  </Button>
                </div>

                {formData.rounds.map((rnd, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-blue-500 flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        Round {idx + 1}
                      </span>
                      {formData.rounds.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              rounds: formData.rounds.filter((_, i) => i !== idx),
                            })
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <Label className="text-[11px]">Round Title</Label>
                        <Input
                          className="h-8 text-xs"
                          value={rnd.title}
                          onChange={(e) => {
                            const updated = [...formData.rounds]
                            updated[idx].title = e.target.value
                            setFormData({ ...formData, rounds: updated })
                          }}
                        />
                      </div>

                      <div>
                        <Label className="text-[11px]">Test ID (links to test portal)</Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          value={rnd.testId}
                          onChange={(e) => {
                            const updated = [...formData.rounds]
                            updated[idx].testId = e.target.value
                            setFormData({ ...formData, rounds: updated })
                          }}
                          placeholder="e.g. TEST-CS-01"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[11px]">Date</Label>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={rnd.scheduledDate || formData.date}
                          onChange={(e) => {
                            const updated = [...formData.rounds]
                            updated[idx].scheduledDate = e.target.value
                            setFormData({ ...formData, rounds: updated })
                          }}
                        />
                      </div>

                      <div>
                        <Label className="text-[11px]">Start Time</Label>
                        <Input
                          className="h-8 text-xs"
                          value={rnd.startTime}
                          onChange={(e) => {
                            const updated = [...formData.rounds]
                            updated[idx].startTime = e.target.value
                            setFormData({ ...formData, rounds: updated })
                          }}
                          placeholder="10:00 AM"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px]">Duration (Mins)</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={rnd.durationMinutes}
                          onChange={(e) => {
                            const updated = [...formData.rounds]
                            updated[idx].durationMinutes = Number(e.target.value)
                            setFormData({ ...formData, rounds: updated })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* TAB 5: WINNERS & HALL OF FAME */}
              <TabsContent value="winners" className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-50/20 p-4 dark:bg-amber-950/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Official Results & Winners Announcement
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        When results are announced, the winners podium replaces the test portal on the public site.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="ev-res-announced" className="text-xs font-semibold cursor-pointer">
                        {formData.resultsAnnounced ? "Results Published ✅" : "Draft / Unpublished"}
                      </Label>
                      <Switch
                        id="ev-res-announced"
                        checked={formData.resultsAnnounced}
                        onCheckedChange={(checked) => setFormData({ ...formData, resultsAnnounced: checked })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-res-url">External Results / Verification Sheet URL (Optional)</Label>
                    <Input
                      id="ev-res-url"
                      placeholder="https://drive.google.com/... or https://youtube.com/live/..."
                      value={formData.resultsUrl}
                      onChange={(e) => setFormData({ ...formData, resultsUrl: e.target.value })}
                    />
                  </div>

                  {/* Winners Builder */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Winners Podium ({formData.structuredWinners.length} Declared)
                      </h5>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                        onClick={() => {
                          const nextRank = formData.structuredWinners.length + 1
                          const defaultTitle =
                            nextRank === 1
                              ? "Grand Champion / 1st Place"
                              : nextRank === 2
                              ? "1st Runner Up"
                              : nextRank === 3
                              ? "2nd Runner Up"
                              : "Special Recognition Award"
                          setFormData({
                            ...formData,
                            structuredWinners: [
                              ...formData.structuredWinners,
                              {
                                rank: nextRank,
                                title: defaultTitle,
                                teamName: "",
                                leaderName: "",
                                collegeOrOrg: "",
                                projectName: "",
                                prizeWon: "",
                                projectUrl: "",
                              },
                            ],
                          })
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Winner / Rank
                      </Button>
                    </div>

                    {formData.structuredWinners.map((winner, idx) => (
                      <div key={idx} className="rounded-xl border border-border bg-card p-3 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-amber-500 flex items-center gap-1.5">
                            <Medal className="h-4 w-4" />
                            Rank {winner.rank || idx + 1}: {winner.title || "Winner"}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                structuredWinners: formData.structuredWinners.filter((_, i) => i !== idx),
                              })
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[11px]">Rank</Label>
                            <Select
                              value={String(winner.rank || 1)}
                              onValueChange={(val) => {
                                const updated = [...formData.structuredWinners]
                                updated[idx].rank = Number(val)
                                setFormData({ ...formData, structuredWinners: updated })
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Rank 1 (1st Place / Winner)</SelectItem>
                                <SelectItem value="2">Rank 2 (1st Runner Up)</SelectItem>
                                <SelectItem value="3">Rank 3 (2nd Runner Up)</SelectItem>
                                <SelectItem value="0">Special Recognition Award</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="sm:col-span-2">
                            <Label className="text-[11px]">Title / Recognition</Label>
                            <Input
                              className="h-8 text-xs"
                              placeholder="e.g. Grand Champion / Best AI Solution"
                              value={winner.title}
                              onChange={(e) => {
                                const updated = [...formData.structuredWinners]
                                updated[idx].title = e.target.value
                                setFormData({ ...formData, structuredWinners: updated })
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px]">Team Name *</Label>
                            <Input
                              className="h-8 text-xs font-semibold"
                              placeholder="e.g. CyberKnights"
                              value={winner.teamName}
                              onChange={(e) => {
                                const updated = [...formData.structuredWinners]
                                updated[idx].teamName = e.target.value
                                setFormData({ ...formData, structuredWinners: updated })
                              }}
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-[11px]">Team Leader / Key Participant</Label>
                            <Input
                              className="h-8 text-xs"
                              placeholder="e.g. Aarav Sharma"
                              value={winner.leaderName}
                              onChange={(e) => {
                                const updated = [...formData.structuredWinners]
                                updated[idx].leaderName = e.target.value
                                setFormData({ ...formData, structuredWinners: updated })
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px]">College / University / Company</Label>
                            <Input
                              className="h-8 text-xs"
                              placeholder="e.g. IIT Roorkee"
                              value={winner.collegeOrOrg}
                              onChange={(e) => {
                                const updated = [...formData.structuredWinners]
                                updated[idx].collegeOrOrg = e.target.value
                                setFormData({ ...formData, structuredWinners: updated })
                              }}
                            />
                          </div>

                          <div>
                            <Label className="text-[11px]">Prize Awarded</Label>
                            <Input
                              className="h-8 text-xs font-semibold text-amber-500"
                              placeholder="e.g. ₹25,000 Cash + Trophy"
                              value={winner.prizeWon}
                              onChange={(e) => {
                                const updated = [...formData.structuredWinners]
                                updated[idx].prizeWon = e.target.value
                                setFormData({ ...formData, structuredWinners: updated })
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px]">Project Title</Label>
                            <Input
                              className="h-8 text-xs"
                              placeholder="e.g. AgroAI Crop Sentinel"
                              value={winner.projectName}
                              onChange={(e) => {
                                const updated = [...formData.structuredWinners]
                                updated[idx].projectName = e.target.value
                                setFormData({ ...formData, structuredWinners: updated })
                              }}
                            />
                          </div>

                          <div>
                            <Label className="text-[11px]">Project Demo / Repository URL</Label>
                            <Input
                              className="h-8 text-xs"
                              placeholder="https://github.com/..."
                              value={winner.projectUrl}
                              onChange={(e) => {
                                const updated = [...formData.structuredWinners]
                                updated[idx].projectUrl = e.target.value
                                setFormData({ ...formData, structuredWinners: updated })
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Update Event"
                ) : (
                  "Create & Publish Event"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Event?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{eventToDelete?.title}</strong> ({eventToDelete?.id})?
              This will remove the event completely from MongoDB and public listings. Registrations will remain preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
