"use client"

import { useState } from "react"
import { Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"

export function ReportDialog({
  targetType,
  targetId,
  label = "Report listing",
}: {
  targetType: "opportunity" | "organization" | "user" | "post" | "review" | "submission"
  targetId: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [reasonCategory, setReasonCategory] = useState("suspicious_listing")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!details.trim()) return
    setSubmitting(true)
    const res = await apiFetch("/api/v1/admin", {
      method: "POST",
      body: JSON.stringify({
        action: "report_content",
        targetType,
        targetId,
        reasonCategory,
        details,
      }),
    })
    setSubmitting(false)
    if (res.success) {
      toast({
        title: "Report submitted",
        description: "Our Trust & Safety team will review this report promptly.",
      })
      setDetails("")
      setOpen(false)
    } else {
      toast({
        title: "Failed to submit report",
        description: res.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-rose-600">
          <Flag className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Trust &amp; Safety Issue</DialogTitle>
          <DialogDescription>
            Help keep HackKro safe. Reports are reviewed by human moderators with full audit logging.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">Reason Category</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger id="report-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suspicious_listing">Suspicious or fraudulent listing</SelectItem>
                <SelectItem value="misleading_reward">Misleading reward / hidden charge</SelectItem>
                <SelectItem value="impersonation">Organization impersonation</SelectItem>
                <SelectItem value="harassment">Harassment or abuse</SelectItem>
                <SelectItem value="spam">Spam or unrelated promotion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">Evidence / Details</Label>
            <Textarea
              id="report-details"
              required
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the concern clearly..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white">
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
