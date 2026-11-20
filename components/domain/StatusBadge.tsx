import { Badge } from "@/components/ui/badge"

const TONE_MAP: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  verified: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  valid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  selected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  hired: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  submitted: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  shortlisted: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  scheduled: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  pending_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  under_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  flagged: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  revoked: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  suspended: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  withdrawn: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  cancelled: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = status.toLowerCase()
  const style = TONE_MAP[key] || "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
  const text = label || status.replace(/_/g, " ")
  return (
    <Badge variant="outline" className={`capitalize font-semibold text-xs ${style}`}>
      {text}
    </Badge>
  )
}
