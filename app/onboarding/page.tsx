"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserAuth } from "@/lib/user-auth-context"
import { apiFetch } from "@/lib/api-client"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshUser } = useUserAuth()

  const [primaryIntent, setPrimaryIntent] = useState(user?.primaryIntent || "student")
  const [collegeName, setCollegeName] = useState("")
  const [degree, setDegree] = useState("B.Tech")
  const [branch, setBranch] = useState("Computer Science & Engineering")
  const [graduationYear, setGraduationYear] = useState("2026")
  const [skillsText, setSkillsText] = useState("TypeScript, React, Python")
  const [interestsText, setInterestsText] = useState("Hackathon, Generative AI, Internships")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await apiFetch("/api/v1/auth/onboarding", {
      method: "POST",
      body: JSON.stringify({
        primaryIntent,
        collegeName,
        degree,
        branch,
        graduationYear,
        skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
        interests: interestsText.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    })
    setLoading(false)
    if (res.success) {
      await refreshUser()
      router.push(res.destination || "/dashboard")
    }
  }

  return (
    <div className="container py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 mb-1">
            <Sparkles className="h-3.5 w-3.5" /> Progressive Onboarding
          </div>
          <CardTitle className="text-2xl font-bold">Personalize your HackKro workspace</CardTitle>
          <CardDescription>
            We collect education and skill details only to evaluate transparent opportunity eligibility and tailor recommendations. You are never locked into a single role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="onb-intent">Primary Starting Workspace</Label>
              <select
                id="onb-intent"
                value={primaryIntent}
                onChange={(e) => setPrimaryIntent(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="student">Participant / Student</option>
                <option value="organizer">Event Organizer</option>
                <option value="recruiter">Recruiter / Employer</option>
                <option value="mentor">Mentor / Evaluator</option>
                <option value="college">College / Institution</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="onb-college">College / Institution / Current Org</Label>
                <Input id="onb-college" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="e.g., IIT Delhi" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onb-grad">Graduation Year</Label>
                <Input id="onb-grad" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="2026" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onb-degree">Degree</Label>
                <Input id="onb-degree" value={degree} onChange={(e) => setDegree(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onb-branch">Branch / Specialization</Label>
                <Input id="onb-branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="onb-skills">Core Skills (comma separated)</Label>
              <Input id="onb-skills" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="onb-interests">Opportunity Interests</Label>
              <Input id="onb-interests" value={interestsText} onChange={(e) => setInterestsText(e.target.value)} />
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => router.push("/dashboard")}>
                Skip for now
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? "Saving..." : "Continue to Workspace"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
