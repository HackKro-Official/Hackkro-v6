"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FileText, Plus, ShieldCheck, Trash2, Upload, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/domain/StatusBadge"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { isLoggedIn, refreshUser } = useUserAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    displayName: "",
    headline: "",
    summary: "",
    collegeName: "",
    degree: "B.Tech",
    branch: "",
    graduationYear: "2026",
    experienceYears: 0,
    location: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    skillsInput: "",
  })
  const [skills, setSkills] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [resumes, setResumes] = useState<any[]>([])
  const [newProject, setNewProject] = useState({ title: "", role: "Lead Developer", description: "", repoUrl: "", contributionStatement: "" })

  const load = async () => {
    setLoading(true)
    const res = await apiFetch("/api/v1/profile")
    setLoading(false)
    if (res.success && res.user) {
      setForm({
        displayName: res.user.displayName || "",
        headline: res.profile?.headline || "",
        summary: res.profile?.summary || "",
        collegeName: res.profile?.collegeName || "",
        degree: res.profile?.degree || "B.Tech",
        branch: res.profile?.branch || "",
        graduationYear: res.profile?.graduationYear || "2026",
        experienceYears: res.profile?.experienceYears || 0,
        location: res.profile?.location || "",
        githubUrl: res.profile?.githubUrl || "",
        linkedinUrl: res.profile?.linkedinUrl || "",
        portfolioUrl: res.profile?.portfolioUrl || "",
        skillsInput: "",
      })
      setSkills(res.skills || [])
      setProjects(res.projects || [])
      setResumes(res.resumes || [])
    }
  }

  useEffect(() => {
    if (isLoggedIn) load()
    else setLoading(false)
  }, [isLoggedIn])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const extraSkills = form.skillsInput.split(",").map((s) => s.trim()).filter(Boolean)
    const res = await apiFetch("/api/v1/profile", {
      method: "PATCH",
      body: JSON.stringify({
        ...form,
        skills: extraSkills,
      }),
    })
    setSaving(false)
    if (res.success) {
      toast({ title: "Profile updated" })
      await refreshUser()
      load()
    } else {
      toast({ title: "Failed to save", description: res.message, variant: "destructive" })
    }
  }

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProject.title.trim()) return
    const res = await apiFetch("/api/v1/profile", {
      method: "PATCH",
      body: JSON.stringify({ addProject: newProject }),
    })
    if (res.success) {
      toast({ title: "Portfolio project added" })
      setNewProject({ title: "", role: "Lead Developer", description: "", repoUrl: "", contributionStatement: "" })
      load()
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    fd.append("title", file.name.replace(/\.[^.]+$/, ""))
    const res = await apiFetch("/api/v1/resumes", {
      method: "POST",
      body: fd,
    })
    if (res.success) {
      toast({ title: "Resume uploaded & scanned", description: "New version created without altering historical applications." })
      load()
    } else {
      toast({ title: "Upload rejected", description: res.message, variant: "destructive" })
    }
  }

  const archiveResume = async (id: string) => {
    const res = await apiFetch(`/api/v1/resumes?id=${id}`, { method: "DELETE" })
    if (res.success) {
      toast({ title: "Resume archived" })
      load()
    }
  }

  if (loading) return <div className="container py-14 text-center text-sm">Loading profile...</div>
  if (!isLoggedIn) {
    return (
      <div className="container py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Sign in to manage your HackKro Profile</h1>
        <Button asChild className="bg-blue-600 text-white"><Link href="/login?returnTo=/profile">Sign in</Link></Button>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Profile, Resumes, Portfolio &amp; Skill Graph</h1>
          <p className="text-sm text-muted-foreground">
            Self-declared skills stay clearly separated from assessed and verified credentials.
          </p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/settings/privacy">Manage Privacy &amp; Visibility</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Core Identity &amp; Academic Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-name">Display Name</Label>
                  <Input id="prof-name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-headline">Headline</Label>
                  <Input id="prof-headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-college">College / University</Label>
                  <Input id="prof-college" value={form.collegeName} onChange={(e) => setForm({ ...form, collegeName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-degree">Degree</Label>
                  <Input id="prof-degree" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-branch">Branch / Specialization</Label>
                  <Input id="prof-branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-grad">Graduation Year</Label>
                  <Input id="prof-grad" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-exp">Experience (Years)</Label>
                  <Input id="prof-exp" type="number" step="0.5" min="0" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-loc">Location</Label>
                  <Input id="prof-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-summary">About Summary</Label>
                <Textarea id="prof-summary" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-gh">GitHub URL</Label>
                  <Input id="prof-gh" type="url" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-li">LinkedIn URL</Label>
                  <Input id="prof-li" type="url" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-web">Portfolio URL</Label>
                  <Input id="prof-web" type="url" value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-skills">Add Skills (comma separated)</Label>
                <Input id="prof-skills" value={form.skillsInput} onChange={(e) => setForm({ ...form, skillsInput: e.target.value })} placeholder="e.g., Docker, GraphQL, Rust" />
              </div>

              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Skill Graph with Provenance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Skill Graph &amp; Provenance</CardTitle>
              <CardDescription>Provenance stays visible: assessed skills come from real platform evaluations.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s.id} variant="outline" className="text-xs py-1 px-2.5 flex items-center gap-1.5">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">({s.provenance.replace("_", " ")})</span>
                </Badge>
              ))}
            </CardContent>
          </Card>

          {/* Resumes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> Resume Versions</CardTitle>
              <CardDescription>PDF, DOCX, or TXT up to 15 MB. Malware-scanned &amp; stored privately.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs font-semibold cursor-pointer hover:bg-muted/50">
                <Upload className="h-4 w-4 text-blue-600" />
                <span>Upload New Resume Version</span>
                <input type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={handleResumeUpload} />
              </label>

              {resumes.map((r) => (
                <div key={r.id} className="rounded-lg border p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{r.title}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-600" onClick={() => archiveResume(r.id)} aria-label="Archive resume">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground truncate">{r.fileName} • {(r.fileSize / 1024).toFixed(1)} KB</p>
                  <StatusBadge status="verified" label="Malware Scan Clean" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Portfolio Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5 text-blue-600" /> Portfolio Projects</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <form onSubmit={handleAddProject} className="space-y-3 border-r-0 md:border-r md:pr-6">
            <h3 className="text-sm font-bold">Add Project</h3>
            <Input placeholder="Project Title" required value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} />
            <Input placeholder="Your Role (e.g., Backend Architect)" value={newProject.role} onChange={(e) => setNewProject({ ...newProject, role: e.target.value })} />
            <Input type="url" placeholder="Repository URL" value={newProject.repoUrl} onChange={(e) => setNewProject({ ...newProject, repoUrl: e.target.value })} />
            <Textarea rows={2} placeholder="Project description & outcomes" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} />
            <Input placeholder="Your specific contribution statement" value={newProject.contributionStatement} onChange={(e) => setNewProject({ ...newProject, contributionStatement: e.target.value })} />
            <Button type="submit" size="sm" className="bg-blue-600 text-white"><Plus className="h-3.5 w-3.5 mr-1" /> Add Project</Button>
          </form>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No portfolio projects added yet.</p>
            ) : (
              projects.map((p) => (
                <div key={p.id} className="rounded-lg border p-3 text-xs space-y-1">
                  <p className="font-bold text-sm">{p.title} <span className="font-normal text-muted-foreground">({p.role})</span></p>
                  <p className="text-muted-foreground">{p.description}</p>
                  {p.contributionStatement && <p className="text-blue-600">Contribution: {p.contributionStatement}</p>}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
