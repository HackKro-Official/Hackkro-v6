"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  Users,
  Search,
  Send,
  FileText,
  Calendar,
  Sparkles,
  RefreshCw,
  Mail,
  UserCheck,
  Building,
  Phone,
} from "lucide-react"

interface MentorOption {
  _id: string
  name: string
  email: string
  role: string
  position?: string
  profilePhoto?: string
}

interface InternItem {
  _id: string
  name: string
  email: string
  role: string
  position?: string
  profilePhoto?: string
  phone?: string
  college?: string
  bio?: string
  skills?: string[]
  mentorId?: string | null
  mentorName?: string
  mentorEmail?: string
  pointsEarned?: number
  completedTasks?: number
  addedAt?: string
  isIntern: boolean
}

interface TaskItem {
  _id: string
  title: string
  description: string
  points: number
  deadline: string
  priority: "low" | "medium" | "high"
  status: string
  isAllInterns: boolean
  assignedTo: string
  assignedEmails: string[]
  assignedInterns?: Array<{ _id: string; name: string; email: string }>
  createdAt: string
  stats?: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
}

interface SubmissionItem {
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
    role: string
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

export function InternTaskManager() {
  const { toast } = useToast()

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<"tasks" | "submissions" | "interns">("tasks")

  // Tasks Data
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [isTasksLoading, setIsTasksLoading] = useState(true)
  const [taskSearch, setTaskSearch] = useState("")
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all")

  // Interns & Mentors List
  const [interns, setInterns] = useState<InternItem[]>([])
  const [mentors, setMentors] = useState<MentorOption[]>([])
  const [isInternsLoading, setIsInternsLoading] = useState(true)
  const [internSearch, setInternSearch] = useState("")
  const [isAssigningMentor, setIsAssigningMentor] = useState<string | null>(null)
  const [isSendingInternInvite, setIsSendingInternInvite] = useState<string | null>(null)

  // Submissions Data
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(true)
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("all")
  const [submissionTaskFilter, setSubmissionTaskFilter] = useState("all")
  const [submissionSearch, setSubmissionSearch] = useState("")
  const [submissionCounts, setSubmissionCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })

  // Create Task Modal State
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    deadline: "",
    points: 100,
    priority: "medium" as "low" | "medium" | "high",
    isAllInterns: true,
    selectedInternIds: [] as string[],
    notes: "",
  })

  // Add Intern Modal State
  const [isAddInternOpen, setIsAddInternOpen] = useState(false)
  const [isAddingIntern, setIsAddingIntern] = useState(false)
  const [newInternForm, setNewInternForm] = useState({
    name: "",
    email: "",
    position: "Software Engineering Intern",
    mentorId: "unassigned",
  })

  // Review Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    status: "approved" as "approved" | "rejected",
    pointsAwarded: 100,
    feedback: "",
  })

  // Delete Task Dialog State
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null)
  const [isDeletingTask, setIsDeletingTask] = useState(false)

  // Fetch Interns and Mentors
  const fetchInterns = async () => {
    setIsInternsLoading(true)
    try {
      const res = await fetch("/api/users/interns")
      const data = await res.json()
      if (res.ok && data.success) {
        setInterns(data.interns || [])
        setMentors(data.mentors || [])
      }
    } catch (err) {
      console.error("Failed to load interns", err)
    } finally {
      setIsInternsLoading(false)
    }
  }

  // Fetch Tasks
  const fetchTasks = async () => {
    setIsTasksLoading(true)
    try {
      const url = new URL("/api/tasks", window.location.origin)
      if (taskSearch) url.searchParams.set("search", taskSearch)
      if (taskPriorityFilter !== "all") url.searchParams.set("priority", taskPriorityFilter)

      const res = await fetch(url.toString())
      const data = await res.json()
      if (res.ok && data.success) {
        setTasks(data.tasks || [])
      } else {
        toast({ title: "Error", description: data.message || "Failed to load tasks", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect to tasks API", variant: "destructive" })
    } finally {
      setIsTasksLoading(false)
    }
  }

  // Fetch Submissions
  const fetchSubmissions = async () => {
    setIsSubmissionsLoading(true)
    try {
      const url = new URL("/api/submissions", window.location.origin)
      if (submissionStatusFilter !== "all") url.searchParams.set("status", submissionStatusFilter)
      if (submissionTaskFilter !== "all") url.searchParams.set("taskId", submissionTaskFilter)
      if (submissionSearch) url.searchParams.set("search", submissionSearch)

      const res = await fetch(url.toString())
      const data = await res.json()
      if (res.ok && data.success) {
        setSubmissions(data.submissions || [])
        if (data.counts) setSubmissionCounts(data.counts)
      } else {
        toast({ title: "Error", description: data.message || "Failed to load submissions", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect to submissions API", variant: "destructive" })
    } finally {
      setIsSubmissionsLoading(false)
    }
  }

  useEffect(() => {
    fetchInterns()
    fetchTasks()
    fetchSubmissions()
  }, [])

  // Assign Mentor to Intern
  const handleAssignMentor = async (internId: string, mentorId: string) => {
    setIsAssigningMentor(internId)
    try {
      const res = await fetch("/api/admin/interns/mentor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId, mentorId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: "Mentor Updated 🤝",
          description: data.message || "Intern mentor assigned successfully.",
        })
        fetchInterns()
      } else {
        toast({ title: "Error", description: data.message || "Failed to assign mentor", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error assigning mentor", variant: "destructive" })
    } finally {
      setIsAssigningMentor(null)
    }
  }

  // Resend Intern Onboarding Email
  const handleResendInternInvite = async (intern: InternItem) => {
    setIsSendingInternInvite(intern._id)
    try {
      const res = await fetch("/api/admin/interns/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: intern.email,
          name: intern.name,
          position: intern.position,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: "Intern Welcome Email Dispatched! 🚀",
          description: `Access instructions sent to ${intern.email}.`,
        })
      } else {
        toast({ title: "Error", description: data.message || "Failed to send email", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error sending email", variant: "destructive" })
    } finally {
      setIsSendingInternInvite(null)
    }
  }

  // Add New Intern
  const handleAddNewIntern = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newInternForm.email.trim() || !newInternForm.name.trim()) {
      toast({ title: "Required Fields", description: "Please enter intern name and email.", variant: "destructive" })
      return
    }

    setIsAddingIntern(true)
    try {
      const res = await fetch("/api/admin/interns/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newInternForm.name.trim(),
          email: newInternForm.email.trim(),
          position: newInternForm.position.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // If a mentor was selected, assign them
        if (newInternForm.mentorId && newInternForm.mentorId !== "unassigned" && data.intern?._id) {
          await fetch("/api/admin/interns/mentor", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              internId: data.intern._id,
              mentorId: newInternForm.mentorId,
            }),
          })
        }

        toast({
          title: "Intern Added & Onboarding Email Sent! 🎉",
          description: `Welcome email and dashboard credentials sent to ${newInternForm.email}.`,
        })
        setIsAddInternOpen(false)
        setNewInternForm({
          name: "",
          email: "",
          position: "Software Engineering Intern",
          mentorId: "unassigned",
        })
        fetchInterns()
      } else {
        toast({ title: "Error", description: data.message || "Failed to add intern", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error adding intern", variant: "destructive" })
    } finally {
      setIsAddingIntern(false)
    }
  }

  // Create Task Submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!taskForm.title.trim() || !taskForm.description.trim() || !taskForm.deadline) {
      toast({
        title: "Required Fields Missing",
        description: "Please provide a task title, description, and deadline.",
        variant: "destructive",
      })
      return
    }

    if (!taskForm.isAllInterns && taskForm.selectedInternIds.length === 0) {
      toast({
        title: "No Intern Selected",
        description: "Please assign to at least one intern or toggle 'Assign to All Interns'.",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingTask(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          deadline: taskForm.deadline,
          points: Number(taskForm.points) || 100,
          priority: taskForm.priority,
          assignedTo: taskForm.isAllInterns ? "all" : taskForm.selectedInternIds,
          notes: taskForm.notes,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: "Task Created Successfully! 📋",
          description: "Task assigned and notification emails dispatched.",
        })
        setIsCreateTaskOpen(false)
        setTaskForm({
          title: "",
          description: "",
          deadline: "",
          points: 100,
          priority: "medium",
          isAllInterns: true,
          selectedInternIds: [],
          notes: "",
        })
        fetchTasks()
      } else {
        toast({ title: "Error", description: data.message || "Failed to create task", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network Error", description: "Failed to save task", variant: "destructive" })
    } finally {
      setIsSubmittingTask(false)
    }
  }

  // Delete Task
  const handleDeleteTask = async () => {
    if (!taskToDelete) return
    setIsDeletingTask(true)
    try {
      const res = await fetch(`/api/tasks/${taskToDelete._id}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: "Task Deleted",
          description: `"${taskToDelete.title}" and its submissions have been removed.`,
        })
        setTaskToDelete(null)
        fetchTasks()
        fetchSubmissions()
      } else {
        toast({ title: "Error", description: data.message || "Could not delete task", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error while deleting task", variant: "destructive" })
    } finally {
      setIsDeletingTask(false)
    }
  }

  // Open Review Dialog
  const handleOpenReview = (submission: SubmissionItem) => {
    setSelectedSubmission(submission)
    setReviewForm({
      status: submission.status === "rejected" ? "rejected" : "approved",
      pointsAwarded: submission.pointsAwarded || submission.taskId?.points || 100,
      feedback: submission.feedback || "",
    })
    setIsReviewModalOpen(true)
  }

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubmission) return

    setIsSubmittingReview(true)
    try {
      const res = await fetch(`/api/submissions/${selectedSubmission._id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewForm.status,
          pointsAwarded: reviewForm.status === "approved" ? Number(reviewForm.pointsAwarded) : 0,
          feedback: reviewForm.feedback.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: `Submission ${reviewForm.status === "approved" ? "Approved! ✅" : "Marked for Revision ❌"}`,
          description: `Feedback and score notification email sent to ${selectedSubmission.internEmail}.`,
        })
        setIsReviewModalOpen(false)
        setSelectedSubmission(null)
        fetchSubmissions()
        fetchTasks()
        fetchInterns()
      } else {
        toast({ title: "Error", description: data.message || "Failed to submit review", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network Error", description: "Failed to save evaluation", variant: "destructive" })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-600/90 text-white hover:bg-emerald-700 text-[10px]">Approved ✅</Badge>
      case "rejected":
        return <Badge className="bg-rose-600/90 text-white hover:bg-rose-700 text-[10px]">Needs Revision ❌</Badge>
      default:
        return <Badge className="bg-amber-600/90 text-white hover:bg-amber-700 animate-pulse text-[10px]">Pending Review ⏳</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="outline" className="border-rose-500 text-rose-400 text-[10px]">High</Badge>
      case "medium":
        return <Badge variant="outline" className="border-amber-500 text-amber-400 text-[10px]">Medium</Badge>
      default:
        return <Badge variant="outline" className="border-blue-500 text-blue-400 text-[10px]">Low</Badge>
    }
  }

  const filteredInterns = interns.filter((i) => {
    if (!internSearch) return true
    const q = internSearch.toLowerCase()
    return (
      i.name.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.college && i.college.toLowerCase().includes(q)) ||
      (i.position && i.position.toLowerCase().includes(q)) ||
      (i.mentorName && i.mentorName.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner Stats Grid - Responsive 1 to 4 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/60 bg-gradient-to-br from-blue-950/20 via-background to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Intern Tasks</p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1">{tasks.length}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-amber-950/20 via-background to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Evaluations</p>
              <h3 className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{submissionCounts.pending}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-emerald-950/20 via-background to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Approved Submissions</p>
              <h3 className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{submissionCounts.approved}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-purple-950/20 via-background to-background">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Appointed Interns</p>
              <h3 className="text-xl sm:text-2xl font-bold text-purple-400 mt-1">{interns.length}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Card className="border-border w-full">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
              Intern Management, Tasks & Mentorship
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Assign tasks, pair interns under core team mentors, grade project deliverables, and track performance.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchTasks()
                fetchSubmissions()
                fetchInterns()
              }}
              disabled={isTasksLoading || isSubmissionsLoading || isInternsLoading}
              className="text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isTasksLoading || isInternsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddInternOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium"
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Add Intern
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateTaskOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Task
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <div className="flex items-center justify-between border-b pb-2 overflow-x-auto">
              <TabsList className="bg-muted/60 p-1 flex-nowrap">
                <TabsTrigger value="tasks" className="text-xs gap-1.5 whitespace-nowrap">
                  <FileText className="h-3.5 w-3.5" />
                  Task Manager ({tasks.length})
                </TabsTrigger>
                <TabsTrigger value="submissions" className="text-xs gap-1.5 whitespace-nowrap">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Submissions & Review ({submissions.length})
                  {submissionCounts.pending > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] font-black text-black">
                      {submissionCounts.pending}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="interns" className="text-xs gap-1.5 whitespace-nowrap">
                  <UserCheck className="h-3.5 w-3.5" />
                  Interns Roster & Mentors ({interns.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: TASKS LIST */}
            <TabsContent value="tasks" className="space-y-4 pt-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks by title..."
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchTasks()}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={taskPriorityFilter} onValueChange={(v) => { setTaskPriorityFilter(v); setTimeout(fetchTasks, 50); }}>
                    <SelectTrigger className="h-8 text-xs w-[130px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button size="sm" variant="secondary" onClick={fetchTasks} className="h-8 text-xs">
                    Apply Filter
                  </Button>
                </div>
              </div>

              {/* Tasks Table */}
              <div className="rounded-xl border overflow-x-auto">
                <Table className="min-w-[650px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[30%]">Task Title & Details</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isTasksLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                          <p className="text-xs text-muted-foreground mt-2">Loading tasks...</p>
                        </TableCell>
                      </TableRow>
                    ) : tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                          No tasks found. Click "+ Create Task" to assign one to interns.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((task) => {
                        const isOverdue = new Date(task.deadline).getTime() < Date.now()
                        return (
                          <TableRow key={task._id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="font-semibold text-xs text-foreground">{task.title}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">{task.description}</p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="font-bold text-amber-500 text-xs flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                {task.points} Pts
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="text-xs space-y-0.5">
                                <span className={isOverdue ? "text-rose-400 font-semibold" : "text-foreground"}>
                                  {new Date(task.deadline).toLocaleDateString()}
                                </span>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-[9px] px-1 py-0 ml-1">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              {task.isAllInterns ? (
                                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  All Interns
                                </Badge>
                              ) : task.assignedInterns && task.assignedInterns.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                  {task.assignedInterns.slice(0, 2).map((intern) => (
                                    <Badge key={intern._id} variant="outline" className="text-[10px] truncate max-w-[120px]">
                                      {intern.name || intern.email.split("@")[0]}
                                    </Badge>
                                  ))}
                                  {task.assignedInterns.length > 2 && (
                                    <span className="text-[10px] text-muted-foreground self-center">
                                      +{task.assignedInterns.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground truncate max-w-[140px] block">
                                  {task.assignedTo}
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-medium text-foreground">{task.stats?.total || 0} received</span>
                                {task.stats && task.stats.pending > 0 && (
                                  <Badge className="bg-amber-500 text-black text-[9px] px-1 py-0 font-bold">
                                    {task.stats.pending} pending
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>{getPriorityBadge(task.priority)}</TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSubmissionTaskFilter(task._id)
                                    setActiveTab("submissions")
                                    setTimeout(fetchSubmissions, 50)
                                  }}
                                  title="View Submissions for this task"
                                  className="h-7 text-xs text-blue-400 hover:text-blue-300 px-2"
                                >
                                  Submissions
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setTaskToDelete(task)}
                                  className="h-7 w-7 text-slate-400 hover:text-rose-400"
                                  title="Delete Task"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 2: SUBMISSIONS & EVALUATION */}
            <TabsContent value="submissions" className="space-y-4 pt-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by intern name, email, notes..."
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchSubmissions()}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={submissionStatusFilter}
                    onValueChange={(v) => { setSubmissionStatusFilter(v); setTimeout(fetchSubmissions, 50); }}
                  >
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses ({submissionCounts.total})</SelectItem>
                      <SelectItem value="pending">Pending Review ({submissionCounts.pending})</SelectItem>
                      <SelectItem value="approved">Approved ({submissionCounts.approved})</SelectItem>
                      <SelectItem value="rejected">Needs Revision ({submissionCounts.rejected})</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={submissionTaskFilter}
                    onValueChange={(v) => { setSubmissionTaskFilter(v); setTimeout(fetchSubmissions, 50); }}
                  >
                    <SelectTrigger className="h-8 text-xs w-[160px]">
                      <SelectValue placeholder="Filter by Task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      {tasks.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button size="sm" variant="secondary" onClick={fetchSubmissions} className="h-8 text-xs">
                    Filter
                  </Button>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="rounded-xl border overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Intern</TableHead>
                      <TableHead>Task Title</TableHead>
                      <TableHead>Submission Link</TableHead>
                      <TableHead>Submitted On</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isSubmissionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                          <p className="text-xs text-muted-foreground mt-2">Loading submissions...</p>
                        </TableCell>
                      </TableRow>
                    ) : submissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                          No submissions found under current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      submissions.map((sub) => {
                        const maxPoints = sub.taskId?.points || 100
                        return (
                          <TableRow key={sub._id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-semibold text-xs text-foreground">
                                  {sub.internName || sub.internId?.name || "Intern"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">{sub.internEmail}</p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-xs text-foreground line-clamp-1">
                                {sub.taskId?.title || "Task"}
                              </p>
                            </TableCell>

                            <TableCell>
                              <a
                                href={sub.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline max-w-[160px] truncate"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="truncate">{sub.submissionUrl.replace(/^https?:\/\//, "")}</span>
                              </a>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(sub.createdAt).toLocaleDateString()}
                            </TableCell>

                            <TableCell>{getStatusBadge(sub.status)}</TableCell>

                            <TableCell>
                              {sub.status === "approved" ? (
                                <span className="font-bold text-amber-400 text-xs">
                                  {sub.pointsAwarded} / {maxPoints}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-- / {maxPoints}</span>
                              )}
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
                                onClick={() => handleOpenReview(sub)}
                              >
                                {sub.status === "pending" ? "Grade & Review" : "Edit Review"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 3: INTERNS ROSTER & MENTORS */}
            <TabsContent value="interns" className="space-y-4 pt-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search interns by name, email, college..."
                    value={internSearch}
                    onChange={(e) => setInternSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {filteredInterns.length} Active Interns
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => setIsAddInternOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Intern
                  </Button>
                </div>
              </div>

              {/* Interns Table */}
              <div className="rounded-xl border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Intern Details</TableHead>
                      <TableHead>Contact & College</TableHead>
                      <TableHead>Assigned Team Lead (Mentor)</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isInternsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                          <p className="text-xs text-muted-foreground mt-2">Loading interns roster...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredInterns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                          No interns found. Click "+ Add Intern" to onboard new team members.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInterns.map((intern) => {
                        return (
                          <TableRow key={intern._id} className="hover:bg-muted/30">
                            {/* Intern Avatar + Name */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {intern.profilePhoto ? (
                                  <img
                                    src={intern.profilePhoto}
                                    alt={intern.name}
                                    className="h-9 w-9 rounded-full object-cover border border-border"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                                    {intern.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-xs text-foreground">{intern.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{intern.position || "Tech Intern"}</p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Contact & College */}
                            <TableCell>
                              <div className="space-y-0.5 text-xs">
                                <p className="font-mono text-[11px] text-foreground">{intern.email}</p>
                                {intern.phone && (
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-2.5 w-2.5" /> {intern.phone}
                                  </p>
                                )}
                                {intern.college && (
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Building className="h-2.5 w-2.5" /> {intern.college}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            {/* Mentor Selector */}
                            <TableCell>
                              <div className="space-y-1">
                                <Select
                                  value={intern.mentorId || "unassigned"}
                                  disabled={isAssigningMentor === intern._id}
                                  onValueChange={(val) => handleAssignMentor(intern._id, val)}
                                >
                                  <SelectTrigger className="h-7 text-xs w-[190px] bg-background">
                                    <SelectValue placeholder="Assign Mentor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned" className="text-muted-foreground text-xs">
                                      Unassigned (Admin Only)
                                    </SelectItem>
                                    {mentors.map((m) => (
                                      <SelectItem key={m._id} value={m._id} className="text-xs">
                                        {m.name} ({m.role || "Lead"})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {intern.mentorName && (
                                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Mentored by {intern.mentorName}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            {/* Performance */}
                            <TableCell>
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 font-bold text-amber-400 text-xs">
                                  <Trophy className="h-3 w-3" />
                                  {intern.pointsEarned || 0} Pts
                                </span>
                                <p className="text-[10px] text-muted-foreground">
                                  {intern.completedTasks || 0} tasks completed
                                </p>
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isSendingInternInvite === intern._id}
                                  onClick={() => handleResendInternInvite(intern)}
                                  title="Resend Onboarding Email with Portal Guide"
                                  className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2"
                                >
                                  {isSendingInternInvite === intern._id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="h-3 w-3 mr-1" />
                                      Email Invite
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ADD INTERN DIALOG */}
      <Dialog open={isAddInternOpen} onOpenChange={setIsAddInternOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              Onboard New Intern
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              An exclusive Intern Onboarding Welcome Email will be automatically dispatched to their inbox.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddNewIntern} className="space-y-3.5 py-1 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-300">Intern Full Name *</Label>
              <Input
                value={newInternForm.name}
                onChange={(e) => setNewInternForm({ ...newInternForm, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="h-8 text-xs bg-slate-900 border-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Email Address *</Label>
              <Input
                type="email"
                value={newInternForm.email}
                onChange={(e) => setNewInternForm({ ...newInternForm, email: e.target.value })}
                placeholder="intern@example.com"
                className="h-8 text-xs bg-slate-900 border-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Designation / Role Title</Label>
              <Input
                value={newInternForm.position}
                onChange={(e) => setNewInternForm({ ...newInternForm, position: e.target.value })}
                placeholder="e.g. Frontend Engineering Intern"
                className="h-8 text-xs bg-slate-900 border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Assign Under Core Team Lead (Mentor)</Label>
              <Select
                value={newInternForm.mentorId}
                onValueChange={(val) => setNewInternForm({ ...newInternForm, mentorId: val })}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-800">
                  <SelectValue placeholder="Select Team Lead / Mentor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Direct Admin Ownership (No Lead)</SelectItem>
                  {mentors.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name} ({m.position || m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddInternOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isAddingIntern} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isAddingIntern ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Add Intern & Send Email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE TASK DIALOG */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Plus className="h-4 w-4 text-blue-400" />
              Create & Assign Intern Task
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Specify task expectations, deadlines, and maximum score. Notification emails will be triggered automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-slate-300">Task Title *</Label>
              <Input
                className="mt-1 h-8 text-xs bg-slate-900 border-slate-800"
                placeholder="e.g. Build Responsive User Profile Page"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Detailed Description & Deliverables *</Label>
              <Textarea
                className="mt-1 text-xs bg-slate-900 border-slate-800 min-h-[90px]"
                placeholder="Describe key requirements, user stories, tech stack expectations, and acceptance criteria..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Submission Deadline *</Label>
                <Input
                  type="date"
                  className="mt-1 h-8 text-xs bg-slate-900 border-slate-800"
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Maximum Points</Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  className="mt-1 h-8 text-xs bg-slate-900 border-slate-800"
                  value={taskForm.points}
                  onChange={(e) => setTaskForm({ ...taskForm, points: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(val: any) => setTaskForm({ ...taskForm, priority: val })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs bg-slate-900 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee selection */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Assign to All Active Interns</p>
                  <p className="text-[11px] text-slate-400">All registered interns will receive this task.</p>
                </div>
                <Switch
                  checked={taskForm.isAllInterns}
                  onCheckedChange={(checked) => setTaskForm({ ...taskForm, isAllInterns: checked })}
                />
              </div>

              {!taskForm.isAllInterns && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <Label className="text-xs text-slate-300">Select Specific Intern(s):</Label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    {interns.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-2">No active interns found.</p>
                    ) : (
                      interns.map((intern) => {
                        const isSelected = taskForm.selectedInternIds.includes(intern._id)
                        return (
                          <div
                            key={intern._id}
                            onClick={() => {
                              const updated = isSelected
                                ? taskForm.selectedInternIds.filter((id) => id !== intern._id)
                                : [...taskForm.selectedInternIds, intern._id]
                              setTaskForm({ ...taskForm, selectedInternIds: updated })
                            }}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                              isSelected ? "bg-blue-600/20 border border-blue-500/40 text-blue-300" : "hover:bg-slate-900 text-slate-300"
                            }`}
                          >
                            <span className="font-medium truncate">
                              {intern.name} ({intern.email})
                            </span>
                            <span className="text-[10px] text-slate-400 ml-2">
                              {intern.position || intern.role}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-slate-300">Internal Admin Notes (Optional)</Label>
              <Input
                className="mt-1 h-8 text-xs bg-slate-900 border-slate-800"
                placeholder="Optional mentor/admin notes..."
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateTaskOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingTask} className="bg-blue-600 hover:bg-blue-700">
                {isSubmittingTask ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Assigning & Emailing...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Assign Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* REVIEW & EVALUATE DIALOG */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-lg bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Evaluate Intern Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Grade the solution, award points, and provide constructive feedback. An automated email report will be sent to the intern.
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <form onSubmit={handleSubmitReview} className="space-y-4 pt-1">
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Intern:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedSubmission.internName} ({selectedSubmission.internEmail})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Task:</span>
                  <span className="font-semibold text-slate-200">{selectedSubmission.taskId?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Achievable:</span>
                  <span className="font-bold text-amber-400">{selectedSubmission.taskId?.points || 100} Points</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block mb-1">Submitted Project Link:</span>
                  <a
                    href={selectedSubmission.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:underline break-all font-medium"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {selectedSubmission.submissionUrl}
                  </a>
                </div>

                {selectedSubmission.notes && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 block mb-1">Intern's Notes:</span>
                    <p className="text-slate-300 italic">"{selectedSubmission.notes}"</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-300">Decision *</Label>
                  <Select
                    value={reviewForm.status}
                    onValueChange={(val: any) => setReviewForm({ ...reviewForm, status: val })}
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
                    Points Awarded (Max: {selectedSubmission.taskId?.points || 100})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={selectedSubmission.taskId?.points || 100}
                    disabled={reviewForm.status === "rejected"}
                    className="mt-1 h-8 text-xs bg-slate-900 border-slate-800"
                    value={reviewForm.status === "rejected" ? 0 : reviewForm.pointsAwarded}
                    onChange={(e) => setReviewForm({ ...reviewForm, pointsAwarded: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Mentor Remarks & Feedback</Label>
                <Textarea
                  className="mt-1 text-xs bg-slate-900 border-slate-800 min-h-[80px]"
                  placeholder="Share constructive feedback, code architecture suggestions, or what went well..."
                  value={reviewForm.feedback}
                  onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsReviewModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingReview}
                  className={
                    reviewForm.status === "approved"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      : "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  }
                >
                  {isSubmittingReview ? (
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

      {/* DELETE TASK CONFIRMATION DIALOG */}
      <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Delete Task Confirmation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Are you sure you want to delete <span className="font-semibold text-slate-200">"{taskToDelete?.title}"</span>? This will permanently remove the task and all associated intern submissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setTaskToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeletingTask}
              onClick={handleDeleteTask}
            >
              {isDeletingTask ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
              Delete Task Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
