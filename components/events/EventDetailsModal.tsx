"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  MapPin,
  Trophy,
  Users,
  ShieldAlert,
  Gift,
  Layers,
  CheckCircle,
  Clock,
  Sparkles,
  PlayCircle,
  ExternalLink,
  Medal,
  Award,
  Crown,
  Lock,
  ArrowRight,
} from "lucide-react"
import type { EventItem, EventRound, EventWinner } from "@/lib/events-data"

interface EventDetailsModalProps {
  event: EventItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegisterClick: (event: EventItem) => void
}

export function EventDetailsModal({
  event,
  open,
  onOpenChange,
  onRegisterClick,
}: EventDetailsModalProps) {
  const router = useRouter()

  if (!event) return null

  const isLive = event.statusOverride === "live"
  const isUpcoming = event.statusOverride === "coming-soon"
  const isPast =
    event.statusOverride === "past" ||
    event.statusOverride === "closed" ||
    event.statusOverride === "Closed"

  const isRoundLive = (round: EventRound) => {
    if (round.status === "live") return true
    if (round.status === "completed") return false
    if (!round.scheduledDate) return false

    const todayStr = new Date().toISOString().split("T")[0]
    return round.scheduledDate === todayStr
  }

  const structuredWinners: EventWinner[] =
    event.structuredWinners && event.structuredWinners.length > 0
      ? event.structuredWinners
      : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0 sm:rounded-2xl border-border bg-card text-card-foreground">
        {/* Cover Image & Header Hero */}
        <div className="relative h-60 w-full sm:h-72">
          <Image
            src={event.image || "https://res.cloudinary.com/payb7fsq/image/upload/v1793190149/1_1.png"}
            alt={event.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

          {/* Badges on Cover */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-900/50 backdrop-blur-sm animate-pulse">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                Live & In Progress
              </span>
            ) : isUpcoming ? (
              <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-md shadow-amber-900/40 backdrop-blur-sm">
                ⏳ Upcoming Event
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-sm">
                🏁 Concluded & Archived
              </span>
            )}

            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              {event.category}
            </span>
            <span className="rounded-full bg-black/60 border border-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {event.mode}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <DialogTitle className="text-2xl font-black tracking-tight sm:text-3xl text-white drop-shadow-md">
              {event.title}
            </DialogTitle>
            {event.tagline && (
              <p className="mt-1 text-xs sm:text-sm text-gray-200 line-clamp-1 drop-shadow">
                {event.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="space-y-6 p-6 sm:p-8">
          {/* Key Facts Strip */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card/60 p-4 sm:grid-cols-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Date</p>
                <p className="text-xs font-bold text-foreground">{event.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="truncate">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                <p className="text-xs font-bold text-foreground truncate">{event.venue || event.location || "Virtual"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Prize Pool</p>
                <p className="text-xs font-bold text-amber-500">{event.prizePool || "Goodies & Certificates"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Team Size</p>
                <p className="text-xs font-bold text-foreground">
                  {event.teamSize ? `${event.teamSize.min}-${event.teamSize.max} Members` : "1-4 Members"}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: IF CONCLUDED / PAST -> SHOW TOP WINNERS HALL OF FAME (TEST PORTAL REPLACED) */}
          {isPast ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-foreground">Top Winners & Hall of Fame</h4>
                    <p className="text-xs text-muted-foreground">
                      Official results announced by the event organizers.
                    </p>
                  </div>
                </div>

                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs">
                  🏆 Concluded Results
                </Badge>
              </div>

              {structuredWinners.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {structuredWinners.map((winner, idx) => {
                    const isFirst = winner.rank === 1
                    const isSecond = winner.rank === 2
                    const isThird = winner.rank === 3

                    return (
                      <div
                        key={idx}
                        className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                          isFirst
                            ? "border-amber-500/50 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-card shadow-lg shadow-amber-500/10 sm:scale-105"
                            : isSecond
                            ? "border-slate-300/40 bg-gradient-to-b from-slate-400/15 via-slate-400/5 to-card dark:border-slate-700"
                            : "border-amber-700/40 bg-gradient-to-b from-amber-700/15 via-amber-700/5 to-card"
                        }`}
                      >
                        {/* Rank Badge */}
                        <div className="flex items-center justify-between pb-3 border-b border-border/50">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isFirst
                                ? "bg-amber-500 text-black font-black"
                                : isSecond
                                ? "bg-slate-300 text-black dark:bg-slate-700 dark:text-white"
                                : "bg-amber-700 text-white"
                            }`}
                          >
                            {isFirst ? (
                              <Crown className="h-3.5 w-3.5" />
                            ) : (
                              <Medal className="h-3.5 w-3.5" />
                            )}
                            {winner.title || (isFirst ? "1st Place / Champion" : isSecond ? "1st Runner Up" : "2nd Runner Up")}
                          </span>
                        </div>

                        {/* Team & Member Details */}
                        <div className="space-y-1.5 py-3">
                          <h5 className="font-extrabold text-base text-foreground line-clamp-1">
                            {winner.teamName}
                          </h5>

                          {winner.leaderName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>Lead:</span>
                              <strong className="text-foreground">{winner.leaderName}</strong>
                            </p>
                          )}

                          {winner.collegeOrOrg && (
                            <p className="text-xs text-blue-500 font-medium truncate">
                              {winner.collegeOrOrg}
                            </p>
                          )}

                          {winner.projectName && (
                            <div className="mt-2 rounded-lg bg-background/80 p-2 border border-border/60">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Project</p>
                              <p className="text-xs font-semibold text-foreground line-clamp-2">
                                {winner.projectName}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Prize Award & Project Link */}
                        <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
                          {winner.prizeWon && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Award:</span>
                              <span className="font-black text-amber-500">{winner.prizeWon}</span>
                            </div>
                          )}

                          {winner.projectUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="w-full text-xs h-7"
                            >
                              <Link href={winner.projectUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                View Project
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : event.winners && event.winners.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                  <h5 className="text-sm font-bold text-amber-500 flex items-center gap-1.5">
                    <Award className="h-4 w-4" />
                    Announced Winners:
                  </h5>
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {event.winners.map((w, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 font-bold text-[10px]">
                          {i + 1}
                        </span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card/60 p-6 text-center space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <h5 className="font-bold text-sm text-foreground">Official Results in Review</h5>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    This event has concluded. The jury and organizing team are reviewing project evaluations. Top winners will be announced here shortly!
                  </p>
                </div>
              )}

              {/* Assessment Closed Notice (Replaces test portal) */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <span>
                    Test portal and coding submissions for this competition are now permanently closed.
                  </span>
                </div>
                {event.resultsUrl && (
                  <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                    <Link href={event.resultsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Results Sheet
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* SECTION 2: IF LIVE OR UPCOMING -> SHOW ACTIVE ASSESSMENT & TEST ROUNDS */
            event.rounds && event.rounds.length > 0 && (
              <div className="rounded-2xl border-2 border-blue-500/30 bg-blue-50/40 p-5 dark:border-blue-500/20 dark:bg-blue-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-base font-bold text-foreground">
                      Event Test & Assessment Rounds ({event.rounds.length})
                    </h4>
                  </div>
                  <Badge variant="secondary" className="bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs">
                    Direct Test Portal
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Scheduled tests open directly here at their allotted time. Registered participants can start their test session with their Unique Pass ID.
                </p>

                <div className="space-y-3">
                  {event.rounds.map((round, idx) => {
                    const live = isRoundLive(round)
                    const isCompleted = round.status === "completed"

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 transition-all ${
                          live
                            ? "border-green-500/60 bg-green-500/5 shadow-md shadow-green-500/10"
                            : isCompleted
                            ? "border-border/60 bg-muted/30 opacity-80"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                                {round.roundNumber || idx + 1}
                              </span>
                              <h5 className="font-bold text-sm text-foreground">{round.title}</h5>
                              {live ? (
                                <Badge className="bg-green-600 text-white text-[10px] animate-pulse">
                                  🔴 LIVE NOW
                                </Badge>
                              ) : isCompleted ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                                  Scheduled
                                </Badge>
                              )}
                            </div>

                            {round.description && (
                              <p className="text-xs text-muted-foreground">{round.description}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                <span>{round.scheduledDate || event.date}</span>
                              </div>
                              {round.startTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                                  <span>{round.startTime} {round.endTime ? `- ${round.endTime}` : ""}</span>
                                </div>
                              )}
                              {round.durationMinutes && (
                                <div className="flex items-center gap-1 font-medium text-foreground">
                                  <span>⏱️ {round.durationMinutes} Mins</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <Button
                              size="sm"
                              className={
                                live
                                  ? "w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold shadow-md"
                                  : isCompleted
                                  ? "w-full sm:w-auto"
                                  : "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                              }
                              variant={isCompleted ? "outline" : "default"}
                              onClick={() => {
                                onOpenChange(false)
                                const targetTestId =
                                  round.testId || `TEST-${event.id.slice(0, 6).toUpperCase()}-R${idx + 1}`
                                router.push(`/test?testId=${targetTestId}&eventId=${event.id}`)
                              }}
                            >
                              <PlayCircle className="mr-1.5 h-4 w-4" />
                              {live ? "Enter Test Round Now" : isCompleted ? "View Round Details" : "Open Test Portal"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          )}

          {/* Description */}
          <div>
            <h4 className="text-lg font-bold text-foreground">About the Event</h4>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {event.longDescription || event.description}
            </p>
          </div>

          {/* Tracks / Themes */}
          {event.tracks && event.tracks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Layers className="h-4 w-4 text-blue-600" />
                <h4>Themes & Challenge Tracks</h4>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {event.tracks.map((track) => (
                  <Badge key={track} variant="secondary" className="px-3 py-1 text-xs">
                    {track}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Perks */}
          {event.perks && event.perks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Gift className="h-4 w-4 text-emerald-600" />
                <h4>Prizes & Benefits</h4>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {event.perks.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Eligibility */}
          {event.eligibility && (
            <div>
              <h4 className="font-semibold text-foreground">Who Can Participate?</h4>
              <p className="mt-1 text-sm text-muted-foreground">{event.eligibility}</p>
            </div>
          )}

          {/* Rules */}
          {event.rules && event.rules.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h4>Guidelines & Rules</h4>
              </div>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {event.rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-300 font-semibold dark:border-slate-700"
            >
              Close
            </Button>

            {isLive ? (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-bold shadow-lg shadow-blue-500/25"
                onClick={() => {
                  onOpenChange(false)
                  onRegisterClick(event)
                }}
              >
                Register for this Event
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : isUpcoming ? (
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 font-bold shadow-md shadow-amber-600/20"
                onClick={() => {
                  onOpenChange(false)
                  onRegisterClick(event)
                }}
              >
                Pre-Register Now
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground italic">
                  Registrations Closed
                </span>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="text-xs border-slate-300 font-semibold dark:border-slate-700"
                >
                  Explore Other Competitions
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
