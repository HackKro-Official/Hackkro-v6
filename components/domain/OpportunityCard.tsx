import Link from "next/link"
import { Calendar, MapPin, ShieldCheck, Trophy, Users, ArrowRight, Sparkles } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "./StatusBadge"

export interface OpportunitySummary {
  id: string
  slug: string
  title: string
  shortSummary: string
  type: string
  category: string
  status?: string
  bannerAssetUrl?: string
  locationMode: string
  locationText: string
  registrationCloseAt?: string | Date | null
  teamMin?: number
  teamMax?: number
  feeAmount?: number
  currency?: string
  prizeText?: string
  stipendText?: string
  salaryShared?: boolean
  salaryMin?: number | null
  salaryMax?: number | null
  skills?: string[]
  reasons?: string[]
  organization: {
    displayName: string
    verificationStatus: string
  }
}

export function OpportunityCard({ item }: { item: OpportunitySummary }) {
  const reward =
    item.prizeText ||
    item.stipendText ||
    (item.salaryShared && item.salaryMin
      ? `${item.currency || "INR"} ${(item.salaryMin / 100000).toFixed(1)}L+`
      : item.type === "job"
      ? "Salary not shared"
      : "Verified Certificate")

  const deadlineText = item.registrationCloseAt
    ? new Date(item.registrationCloseAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Open rolling"

  return (
    <Card className="flex flex-col overflow-hidden border-border/80 hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md">
      <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
        <img
          src={item.bannerAssetUrl || "/placeholder.jpg"}
          alt={`${item.title} cover`}
          loading="lazy"
          className="h-full w-full object-cover opacity-85"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.jpg"
          }}
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <Badge className="bg-blue-600 text-white text-[11px] capitalize">
            {item.type.replace(/_/g, " ")}
          </Badge>
          {item.status && <StatusBadge status={item.status} />}
        </div>
        <div className="absolute top-2.5 right-2.5">
          <Badge variant="secondary" className="text-[11px] font-semibold">
            {item.feeAmount && item.feeAmount > 0 ? `${item.currency || "INR"} ${item.feeAmount / 100}` : "Free"}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium truncate">{item.organization.displayName}</span>
          {item.organization.verificationStatus === "verified" ? (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-label="Verified organization" />
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">Unverified</span>
          )}
        </div>
        <h3 className="text-base font-bold leading-snug line-clamp-2 text-foreground">
          <Link href={`/opportunities/${item.slug}`} className="hover:text-blue-600 transition-colors">
            {item.title}
          </Link>
        </h3>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-xs text-muted-foreground">
        <p className="line-clamp-2 leading-relaxed">{item.shortSummary}</p>

        {item.reasons && item.reasons.length > 0 && (
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{item.reasons[0]}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="truncate font-medium text-foreground">{reward}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{deadlineText}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate capitalize">{item.locationMode} • {item.locationText}</span>
          </div>
          {item.teamMax && item.teamMax > 1 ? (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Team {item.teamMin || 1}–{item.teamMax}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Individual</span>
            </div>
          )}
        </div>

        {item.skills && item.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.skills.slice(0, 3).map((sk) => (
              <span
                key={sk}
                className="px-2 py-0.5 rounded-md bg-muted text-foreground/80 text-[11px] font-medium"
              >
                {sk}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 border-t border-border/60">
        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" size="sm">
          <Link href={`/opportunities/${item.slug}`}>
            View & Apply <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
