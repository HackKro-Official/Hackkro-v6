"use client"

import { useState, useEffect } from "react"
import { useTeamAuth } from "../auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  LogOut,
  CheckCircle2,
  Clock,
  Trophy,
  ExternalLink,
  Send,
  FileText,
  AlertCircle,
  Calendar,
  Sparkles,
  Search,
  RefreshCw,
  Mail,
  User,
  Users,
  ShieldCheck,
  Building,
  Phone,
  Pencil,
  Github,
  Linkedin,
  Globe,
  Award,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserProfile {
  _id: string
  name: string
  email: string
  role: string
  position?: string
  profilePhoto?: string
  phone?: string
  bio?: string
  college?: string
  githubUrl?: string
  linkedinUrl?: string
  portfolioUrl?: string
  skills?: string[]
  isIntern: boolean
  mentorId?: string
  mentorName?: string
  mentorEmail?: string
}

interface MentorData {
  _id?: string
  name: string
  email: string
  role?: string
  position?: string
  profilePhoto?: string
  phone?: string
  linkedinUrl?: string
}

interface AssignedIntern {
  _id: string
  name: string
  email: string
  role: string
  position?: string
  profilePhoto?: string
  phone?: string
  college?: string
  githubUrl?: string
  linkedinUrl?: string
  pointsEarned: number
  completedTasks: number
}

interface MyTaskItem {
  _id: string
  title: string
  description: string
  deadline: string
  points: number
  priority: "low" | "medium" | "high"
  status: string
  createdAt: string
  submissionState: "not_submitted" | "pending" | "approved" | "rejected"
  mySubmission?: {
    _id: string
    submissionUrl: string
    notes?: string
    status: "pending" | "approved" | "rejected"
    pointsAwarded: number
    feedback?: string
    reviewedAt?: string
    createdAt: string
  } | null
}

interface InternSubmissionForLead {
  _id: string
  taskId: {
    _id: string
    title: string
    points: number
    deadline: string
  }
  internId: {
    _id: string
    name: string
    email: string
    position?: string
    profilePhoto?: string
  }
  internEmail: string
  internName: string
  submissionUrl: string
  notes?: string
  status: "pending" | "approved" | "rejected"
  pointsAwarded: number
  feedback?: string
  reviewedAt?: string
  reviewedBy?: string
  createdAt: string
}

interface StatsData {
  totalAssigned: number
  submitted: number
  approved: number
  pending: number
  rejected: number
  notSubmitted: number
  totalPointsEarned: number
  maxAchievablePoints: number
  completionRate: number
}

export default function TeamDashboardPage() {
  const { logout, teamMember: authMember } = useTeamAuth()
  const { toast } = useToast()

  // Profile and Mentorship State
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [mentor, setMentor] = useState<MentorData | null>(null)
  const [assignedInterns, setAssignedInterns] = useState<AssignedIntern[]>([])
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  // Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: "",
    profilePhoto: "",
    phone: "",
    college: "",
    bio: "",
    skills: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
  })

  // Intern Tasks State (for Interns)
  const [tasks, setTasks] = useState<MyTaskItem[]>([])
  const [isTasksLoading, setIsTasksLoading] = useState(true)
  const [stats, setStats] = useState<StatsData>({
    totalAssigned: 0,
    submitted: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    notSubmitted: 0,
    totalPointsEarned: 0,
    maxAchievablePoints: 0,
    completionRate: 0,
  })
  const [taskSearchTerm, setTaskSearchTerm] = useState("")
  const [taskStatusFilter, setTaskStatusFilter] = useState("all")

  // Intern Submissions Evaluation State (for Team Leads)
  const [leadSubmissions, setLeadSubmissions] = useState<InternSubmissionForLead[]>([])
  const [isLeadSubmissionsLoading, setIsLeadSubmissionsLoading] = useState(false)
  const [selectedLeadSub, setSelectedLeadSub] = useState<InternSubmissionForLead | null>(null)
  const [isLeadReviewOpen, setIsLeadReviewOpen] = useState(false)
  const [isSubmittingLeadReview, setIsSubmittingLeadReview] = useState(false)
  const [leadReviewForm, setLeadReviewForm] = useState({
    status: "approved" as "approved" | "rejected",
    pointsAwarded: 100,
    feedback: "",
  })

  // Task Submission Modal State (for Interns)
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<MyTaskItem | null>(null)
  const [submissionUrl, setSubmissionUrl] = useState("")
  const [submissionNotes, setSubmissionNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Full Profile
  const loadProfile = async () => {
    setIsProfileLoading(true)
    try {
      const res = await fetch("/api/team/profile")
      const data = await res.json()
      if (res.ok && data.success) {
        setProfile(data.user)
        setMentor(data.mentor || null)
        setAssignedInterns(data.assignedInterns || [])
        // Init edit form
        setProfileForm({
          name: data.user.name || "",
          profilePhoto: data.user.profilePhoto || "",
          phone: data.user.phone || "",
          college: data.user.college || "",
          bio: data.user.bio || "",
          skills: Array.isArray(data.user.skills) ? data.user.skills.join(", ") : "",
          githubUrl: data.user.githubUrl || "",
          linkedinUrl: data.user.linkedinUrl || "",
          portfolioUrl: data.user.portfolioUrl || "",
        })

        // If user is a lead, also fetch intern submissions for evaluation
        if (!data.user.isIntern) {
          loadLeadSubmissions()
        }
      }
    } catch {
      console.warn("Failed to load profile details")
    } finally {
      setIsProfileLoading(false)
    }
  }

  // Fetch Assigned Tasks (for Interns)
  const loadTasks = async () => {
    setIsTasksLoading(true)
    try {
      const res = await fetch("/api/tasks/mine")
      const data = await res.json()
      if (res.ok && data.success) {
        setTasks(data.tasks || [])
      }
    } catch {
      console.warn("Failed to fetch assigned tasks")
    } finally {
      setIsTasksLoading(false)
    }
  }

  // Fetch Intern Stats
  const loadStats = async () => {
    try {
      const res = await fetch("/api/submissions/stats")
      const data = await res.json()
      if (res.ok && data.success) {
        setStats(data.stats)
      }
    } catch {
      console.warn("Failed to fetch stats")
    }
  }

  // Fetch Submissions for Team Lead
  const loadLeadSubmissions = async () => {
    setIsLeadSubmissionsLoading(true)
    try {
      const res = await fetch("/api/team/intern-submissions")
      const data = await res.json()
      if (res.ok && data.success) {
        setLeadSubmissions(data.submissions || [])
      }
    } catch {
      console.warn("Failed to fetch intern submissions")
    } finally {
      setIsLeadSubmissionsLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
    loadTasks()
    loadStats()
  }, [])

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    try {
      const res = await fetch("/api/team/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: "Profile Updated! ✨",
          description: "Your information has been saved successfully.",
        })
        setIsEditProfileOpen(false)
        loadProfile()
      } else {
        toast({ title: "Failed", description: data.message || "Could not update profile", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error saving profile", variant: "destructive" })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Open Submission Dialog (Intern)
  const handleOpenSubmit = (task: MyTaskItem) => {
    setSelectedTask(task)
    setSubmissionUrl(task.mySubmission?.submissionUrl || "")
    setSubmissionNotes(task.mySubmission?.notes || "")
    setIsSubmitOpen(true)
  }

  // Submit Solution (Intern)
  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return

    if (!submissionUrl.trim() || !submissionUrl.trim().startsWith("http")) {
      toast({
        title: "Valid URL Required",
        description: "Please provide a valid project link (starting with http:// or https://).",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask._id,
          submissionUrl: submissionUrl.trim(),
          notes: submissionNotes.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: "Solution Submitted! 🚀",
          description: "Your work is now submitted for review.",
        })
        setIsSubmitOpen(false)
        setSelectedTask(null)
        setSubmissionUrl("")
        setSubmissionNotes("")
        loadTasks()
        loadStats()
      } else {
        toast({ title: "Submission Failed", description: data.message || "Failed to submit task", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network Error", description: "Failed to submit solution", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Lead Review Modal
  const handleOpenLeadReview = (sub: InternSubmissionForLead) => {
    setSelectedLeadSub(sub)
    setLeadReviewForm({
      status: sub.status === "rejected" ? "rejected" : "approved",
      pointsAwarded: sub.pointsAwarded || sub.taskId?.points || 100,
      feedback: sub.feedback || "",
    })
    setIsLeadReviewOpen(true)
  }

  // Submit Lead Review
  const handleSubmitLeadReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadSub) return

    setIsSubmittingLeadReview(true)
    try {
      const res = await fetch("/api/team/intern-submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedLeadSub._id,
          status: leadReviewForm.status,
          pointsAwarded: leadReviewForm.status === "approved" ? Number(leadReviewForm.pointsAwarded) : 0,
          feedback: leadReviewForm.feedback.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: `Submission ${leadReviewForm.status === "approved" ? "Approved! ✅" : "Marked for Revision ❌"}`,
          description: `Evaluation and feedback sent to ${selectedLeadSub.internEmail}.`,
        })
        setIsLeadReviewOpen(false)
        setSelectedLeadSub(null)
        loadLeadSubmissions()
        loadProfile()
      } else {
        toast({ title: "Error", description: data.message || "Failed to evaluate submission", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network Error", description: "Failed to submit evaluation", variant: "destructive" })
    } finally {
      setIsSubmittingLeadReview(false)
    }
  }

  const isIntern = profile ? profile.isIntern : authMember?.role?.toLowerCase().includes("intern")

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = taskSearchTerm
      ? task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(taskSearchTerm.toLowerCase())
      : true

    const matchesStatus =
      taskStatusFilter === "all"
        ? true
        : taskStatusFilter === "todo"
        ? task.submissionState === "not_submitted"
        : taskStatusFilter === "pending"
        ? task.submissionState === "pending"
        : taskStatusFilter === "approved"
        ? task.submissionState === "approved"
        : taskStatusFilter === "rejected"
        ? task.submissionState === "rejected"
        : true

    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-background py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP PROFILE & WELCOME BANNER */}
        <Card className="border-border/60 bg-gradient-to-r from-blue-950/40 via-background to-background">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div className="flex items-center gap-3.5">
              {profile?.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={profile.name}
                  className="h-14 w-14 rounded-2xl object-cover border-2 border-blue-500/30 shadow-md shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-2xl shadow-inner shrink-0">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : "H"}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                    Welcome, {profile?.name || authMember?.name || "Member"}! 👋
                  </h1>
                  <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs">
                    {profile?.role || authMember?.role || (isIntern ? "Intern" : "Team Member")}
                  </Badge>
                  {profile?.position && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      • {profile.position}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span>{profile?.email || authMember?.email}</span>
                  {profile?.college && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" /> {profile.college}
                    </span>
                  )}
                  {profile?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {profile.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditProfileOpen(true)}
                className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadProfile()
                  loadTasks()
                  loadStats()
                }}
                disabled={isProfileLoading || isTasksLoading}
                className="text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isProfileLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* -------------------- VIEW 1: INTERN DASHBOARD -------------------- */}
        {isIntern ? (
          <>
            {/* Mentor Profile Card for Intern */}
            {mentor && (
              <Card className="border-blue-500/30 bg-gradient-to-r from-blue-950/20 via-background to-background">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {mentor.profilePhoto ? (
                      <img
                        src={mentor.profilePhoto}
                        alt={mentor.name}
                        className="h-12 w-12 rounded-xl object-cover border border-blue-500/40 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-lg shrink-0">
                        {mentor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-blue-400 font-bold">
                          Your Assigned Team Leader & Mentor
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <h3 className="text-base font-bold text-foreground mt-0.5">{mentor.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {mentor.position || mentor.role || "Technical Lead"} • {mentor.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      asChild
                    >
                      <a
                        href={`mailto:${mentor.email}?subject=HackKro%20Internship%20Query%20-%20${encodeURIComponent(profile?.name || "")}`}
                      >
                        <Mail className="h-3.5 w-3.5 mr-1.5" />
                        Mail Team Leader
                      </a>
                    </Button>
                    {mentor.phone && (
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <a href={`tel:${mentor.phone}`}>
                          <Phone className="h-3.5 w-3.5 mr-1.5" />
                          Call
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border-border/60 bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Assigned</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stats.totalAssigned}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{stats.notSubmitted} to do</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Under Review</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{stats.pending}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting feedback</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <Clock className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Approved Tasks</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{stats.approved}</h3>
                    <p className="text-[11px] text-emerald-500 font-medium mt-0.5">{stats.completionRate}% completion</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-gradient-to-br from-amber-950/20 via-card to-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Points Earned</p>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1">
                      {stats.totalPointsEarned} <span className="text-xs font-normal text-muted-foreground">/ {stats.maxAchievablePoints}</span>
                    </h3>
                    <p className="text-[11px] text-amber-500/80 mt-0.5">Performance Score</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <Trophy className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks Section */}
            <Card className="border-border">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Assigned Tasks & Deliverables
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Submit your GitHub repositories or live URLs to earn points and receive mentor evaluations.
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Tabs value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                  <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
                    <TabsTrigger value="all" className="text-xs">
                      All ({tasks.length})
                    </TabsTrigger>
                    <TabsTrigger value="todo" className="text-xs">
                      To Do ({stats.notSubmitted})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs">
                      Under Review ({stats.pending})
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="text-xs">
                      Approved ({stats.approved})
                    </TabsTrigger>
                    {stats.rejected > 0 && (
                      <TabsTrigger value="rejected" className="text-xs text-rose-400">
                        Needs Revision ({stats.rejected})
                      </TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>

                {isTasksLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-xs text-muted-foreground">Loading assigned tasks...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="py-16 text-center border border-dashed rounded-xl bg-card/40 space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto" />
                    <h4 className="text-sm font-semibold text-foreground">No tasks found</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {taskStatusFilter === "all"
                        ? "You currently have no tasks assigned. Great job staying on top of everything!"
                        : "There are no tasks currently in this status category."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTasks.map((task) => {
                      const isOverdue = new Date(task.deadline).getTime() < Date.now()
                      const isApproved = task.submissionState === "approved"
                      const isPending = task.submissionState === "pending"
                      const isRejected = task.submissionState === "rejected"
                      const isNotSubmitted = task.submissionState === "not_submitted"

                      return (
                        <Card
                          key={task._id}
                          className={`flex flex-col justify-between transition-all duration-200 hover:border-blue-500/50 ${
                            isApproved
                              ? "border-emerald-500/30 bg-emerald-950/5"
                              : isPending
                              ? "border-amber-500/30 bg-amber-950/5"
                              : isRejected
                              ? "border-rose-500/30 bg-rose-950/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs">
                                <Trophy className="h-3 w-3" />
                                {task.points} Pts Max
                              </span>

                              <Badge
                                variant="outline"
                                className={
                                  isOverdue && !isApproved
                                    ? "border-rose-500/50 text-rose-400 text-[10px]"
                                    : "border-slate-700 text-slate-300 text-[10px]"
                                }
                              >
                                <Calendar className="h-2.5 w-2.5 mr-1" />
                                Due: {new Date(task.deadline).toLocaleDateString()}
                              </Badge>
                            </div>

                            <CardTitle className="text-base font-bold text-foreground leading-snug line-clamp-1">
                              {task.title}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                              {task.description}
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="p-4 pt-2 space-y-3">
                            {isApproved && (
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                                  </span>
                                  <span className="font-extrabold text-amber-400">
                                    Awarded: {task.mySubmission?.pointsAwarded || 0} / {task.points} Pts
                                  </span>
                                </div>
                                {task.mySubmission?.feedback && (
                                  <div className="text-xs text-slate-300 italic pt-1 border-t border-emerald-500/20">
                                    <span className="text-[10px] text-emerald-400 font-semibold block uppercase">
                                      Mentor Feedback:
                                    </span>
                                    "{task.mySubmission.feedback}"
                                  </div>
                                )}
                              </div>
                            )}

                            {isPending && (
                              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-amber-400 flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 animate-spin" /> Pending Mentor Review
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    Submitted {new Date(task.mySubmission?.createdAt || "").toLocaleDateString()}
                                  </span>
                                </div>
                                {task.mySubmission?.submissionUrl && (
                                  <a
                                    href={task.mySubmission.submissionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline truncate block text-[11px]"
                                  >
                                    {task.mySubmission.submissionUrl}
                                  </a>
                                )}
                              </div>
                            )}

                            {isRejected && (
                              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-rose-400 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" /> Needs Revision
                                  </span>
                                </div>
                                {task.mySubmission?.feedback && (
                                  <div className="text-xs text-slate-300 italic pt-1 border-t border-rose-500/20">
                                    <span className="text-[10px] text-rose-400 font-semibold block uppercase">
                                      Mentor Remarks:
                                    </span>
                                    "{task.mySubmission.feedback}"
                                  </div>
                                )}
                              </div>
                            )}

                            {isNotSubmitted && (
                              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                                <span>Status: Not yet submitted</span>
                                {isOverdue && <span className="text-rose-400 font-semibold text-[11px]">Past Deadline</span>}
                              </div>
                            )}
                          </CardContent>

                          <CardFooter className="p-4 pt-0">
                            {isNotSubmitted ? (
                              <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold h-8"
                                onClick={() => handleOpenSubmit(task)}
                              >
                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                Submit Solution
                              </Button>
                            ) : isRejected ? (
                              <Button
                                className="w-full bg-rose-600 hover:bg-rose-700 text-xs font-semibold h-8"
                                onClick={() => handleOpenSubmit(task)}
                              >
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                Resubmit Solution
                              </Button>
                            ) : isPending ? (
                              <Button
                                variant="outline"
                                className="w-full text-xs h-8 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                                onClick={() => handleOpenSubmit(task)}
                              >
                                Update Submitted Link
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full text-xs h-8 border-emerald-500/30 text-emerald-400"
                                asChild
                              >
                                <a href={task.mySubmission?.submissionUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                  View Your Approved Work
                                </a>
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* -------------------- VIEW 2: TEAM LEADER / MEMBER DASHBOARD -------------------- */
          <div className="space-y-6">
            {/* Assigned Interns Roster Card */}
            <Card className="border-border">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    My Assigned Interns ({assignedInterns.length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Interns assigned directly under your mentorship. Review their progress, reach out via email, and evaluate deliverables.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {assignedInterns.length === 0 ? (
                  <div className="py-12 text-center border border-dashed rounded-xl bg-card/40 space-y-2">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                    <h4 className="text-sm font-semibold text-foreground">No Interns Assigned Yet</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      The HackKro administration team pairs interns with core technical leads. Any interns assigned under your guidance will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedInterns.map((intern) => (
                      <Card key={intern._id} className="border-border bg-card/60 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          {intern.profilePhoto ? (
                            <img
                              src={intern.profilePhoto}
                              alt={intern.name}
                              className="h-11 w-11 rounded-xl object-cover border border-border"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                              {intern.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs text-foreground truncate">{intern.name}</h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {intern.position || "Tech Intern"}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{intern.email}</p>
                          </div>
                        </div>

                        {intern.college && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                            <Building className="h-3 w-3 shrink-0" /> {intern.college}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                          <span className="font-bold text-amber-400 flex items-center gap-1 text-[11px]">
                            <Trophy className="h-3 w-3" /> {intern.pointsEarned} Pts
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {intern.completedTasks} completed
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                            asChild
                          >
                            <a
                              href={`mailto:${intern.email}?subject=HackKro%20Mentorship%20Update`}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Mail Intern
                            </a>
                          </Button>
                          {intern.githubUrl && (
                            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                              <a href={intern.githubUrl} target="_blank" rel="noopener noreferrer">
                                <Github className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          {intern.linkedinUrl && (
                            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                              <a href={intern.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                <Linkedin className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Intern Submissions & Evaluation Section for Lead */}
            <Card className="border-border">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    Intern Deliverables & Evaluation
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Review and grade submissions from your assigned interns.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadLeadSubmissions}
                  disabled={isLeadSubmissionsLoading}
                  className="text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLeadSubmissionsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>

              <CardContent>
                {isLeadSubmissionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    <p className="text-xs text-muted-foreground">Loading submissions...</p>
                  </div>
                ) : leadSubmissions.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-xl">
                    <p className="text-xs text-muted-foreground">No submissions from your interns yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border">
                    <Table className="min-w-[650px]">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead>Intern</TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead>Project Link</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadSubmissions.map((sub) => (
                          <TableRow key={sub._id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-semibold text-xs text-foreground">{sub.internName}</p>
                                <p className="text-[11px] text-muted-foreground">{sub.internEmail}</p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-xs text-foreground line-clamp-1">{sub.taskId?.title}</p>
                            </TableCell>

                            <TableCell>
                              <a
                                href={sub.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline max-w-[160px] truncate"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="truncate">{sub.submissionUrl.replace(/^https?:\/\//, "")}</span>
                              </a>
                            </TableCell>

                            <TableCell>
                              {sub.status === "approved" ? (
                                <Badge className="bg-emerald-600/90 text-white text-[10px]">Approved ✅</Badge>
                              ) : sub.status === "rejected" ? (
                                <Badge className="bg-rose-600/90 text-white text-[10px]">Needs Revision ❌</Badge>
                              ) : (
                                <Badge className="bg-amber-600/90 text-white text-[10px] animate-pulse">Pending Review ⏳</Badge>
                              )}
                            </TableCell>

                            <TableCell>
                              <span className="font-bold text-amber-400 text-xs">
                                {sub.status === "approved" ? sub.pointsAwarded : "--"} / {sub.taskId?.points || 100}
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={sub.status === "pending" ? "default" : "outline"}
                                className={
                                  sub.status === "pending"
                                    ? "bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 font-semibold"
                                    : "text-xs h-7"
                                }
                                onClick={() => handleOpenLeadReview(sub)}
                              >
                                {sub.status === "pending" ? "Review & Grade" : "Edit Review"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* -------------------- EDIT PROFILE MODAL -------------------- */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-400" />
              Edit Your Profile & Socials
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Keep your profile updated with your photo, contact info, university, and project links.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 py-1 text-xs">
            {/* Live Avatar Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
              {profileForm.profilePhoto ? (
                <img
                  src={profileForm.profilePhoto}
                  alt="Preview"
                  className="h-12 w-12 rounded-xl object-cover border border-blue-500/40 shrink-0"
                  onError={(e) => {
                    ;(e.target as any).src = "https://res.cloudinary.com/payb7fsq/image/upload/v1791981789/Hack_Kro_Logo.png"
                  }}
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
                  <User className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <Label className="text-slate-300">Profile Photo URL (Cloudinary / GitHub / Unsplash)</Label>
                <Input
                  value={profileForm.profilePhoto}
                  onChange={(e) => setProfileForm({ ...profileForm, profilePhoto: e.target.value })}
                  placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                  className="h-7 text-xs bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300">Full Name *</Label>
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="h-8 text-xs bg-slate-900 border-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Phone Number</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="h-8 text-xs bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">College / Institute / Organization</Label>
              <Input
                value={profileForm.college}
                onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                placeholder="e.g. IIT Delhi / NIT Trichy"
                className="h-8 text-xs bg-slate-900 border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Bio / About Me</Label>
              <Textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder="Passionate full-stack developer enthusiastic about building scalable web apps..."
                className="min-h-[70px] text-xs bg-slate-900 border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Skills (comma-separated)</Label>
              <Input
                value={profileForm.skills}
                onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                placeholder="React, Next.js, Node.js, TypeScript, Tailwind"
                className="h-8 text-xs bg-slate-900 border-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-slate-300">GitHub URL</Label>
                <Input
                  value={profileForm.githubUrl}
                  onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
                  placeholder="https://github.com/..."
                  className="h-8 text-xs bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">LinkedIn URL</Label>
                <Input
                  value={profileForm.linkedinUrl}
                  onChange={(e) => setProfileForm({ ...profileForm, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="h-8 text-xs bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Portfolio URL</Label>
                <Input
                  value={profileForm.portfolioUrl}
                  onChange={(e) => setProfileForm({ ...profileForm, portfolioUrl: e.target.value })}
                  placeholder="https://mywebsite.com"
                  className="h-8 text-xs bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditProfileOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingProfile} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSavingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Save Profile Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------- SUBMIT SOLUTION DIALOG (INTERN) -------------------- */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="max-w-lg bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Send className="h-4 w-4 text-blue-400" />
              Submit Task Solution
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Submit your GitHub repository, deployed preview link, or project deliverables for evaluation.
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <form onSubmit={handleSubmitSolution} className="space-y-4 pt-1">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs">
                <p className="font-semibold text-foreground text-sm">{selectedTask.title}</p>
                <div className="flex items-center justify-between text-slate-400 pt-1">
                  <span>Score Weight: {selectedTask.points} Points</span>
                  <span>Deadline: {new Date(selectedTask.deadline).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Project / GitHub / Live Demo URL *</Label>
                <Input
                  className="mt-1 h-8 text-xs bg-slate-900 border-slate-800"
                  placeholder="https://github.com/your-username/project-repo or https://myproject.vercel.app"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Implementation Notes & Approach (Optional)</Label>
                <Textarea
                  className="mt-1 text-xs bg-slate-900 border-slate-800 min-h-[90px]"
                  placeholder="Highlight key features built, architecture decisions, or any notes for your mentor..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsSubmitOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Submitting Solution...
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Submit Solution
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* -------------------- EVALUATE SUBMISSION DIALOG (LEAD) -------------------- */}
      <Dialog open={isLeadReviewOpen} onOpenChange={setIsLeadReviewOpen}>
        <DialogContent className="max-w-lg bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Evaluate Intern Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Grade the solution, award points, and provide constructive feedback to your intern.
            </DialogDescription>
          </DialogHeader>

          {selectedLeadSub && (
            <form onSubmit={handleSubmitLeadReview} className="space-y-4 pt-1">
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Intern:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedLeadSub.internName} ({selectedLeadSub.internEmail})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Task:</span>
                  <span className="font-semibold text-slate-200">{selectedLeadSub.taskId?.title}</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block mb-1">Submitted Project Link:</span>
                  <a
                    href={selectedLeadSub.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:underline break-all font-medium"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {selectedLeadSub.submissionUrl}
                  </a>
                </div>

                {selectedLeadSub.notes && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 block mb-1">Intern's Notes:</span>
                    <p className="text-slate-300 italic">"{selectedLeadSub.notes}"</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-300">Decision *</Label>
                  <Select
                    value={leadReviewForm.status}
                    onValueChange={(val: any) => setLeadReviewForm({ ...leadReviewForm, status: val })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs bg-slate-900 border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved" className="text-emerald-400 font-semibold">
                        ✓ Approve & Award Points
                      </SelectItem>
                      <SelectItem value="rejected" className="text-rose-400 font-semibold">
                        ✕ Needs Revision / Resubmit
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">
                    Points Awarded (Max: {selectedLeadSub.taskId?.points || 100})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={selectedLeadSub.taskId?.points || 100}
                    disabled={leadReviewForm.status === "rejected"}
                    className="mt-1 h-8 text-xs bg-slate-900 border-slate-800"
                    value={leadReviewForm.status === "rejected" ? 0 : leadReviewForm.pointsAwarded}
                    onChange={(e) => setLeadReviewForm({ ...leadReviewForm, pointsAwarded: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Mentor Remarks & Feedback</Label>
                <Textarea
                  className="mt-1 text-xs bg-slate-900 border-slate-800 min-h-[80px]"
                  placeholder="Share constructive feedback, code architecture suggestions, or what went well..."
                  value={leadReviewForm.feedback}
                  onChange={(e) => setLeadReviewForm({ ...leadReviewForm, feedback: e.target.value })}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsLeadReviewOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingLeadReview}
                  className={
                    leadReviewForm.status === "approved"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      : "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  }
                >
                  {isSubmittingLeadReview ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving & Emailing...
                    </>
                  ) : (
                    "Save & Notify Intern"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
