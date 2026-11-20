import connectToDatabase from "@/lib/mongoose"
import { EventModel, type IEventItemDoc, type IEventRound } from "@/models/event"
import { EventRegistration } from "@/models/event-registration"
import { EVENTS_DATA, type EventItem } from "@/lib/events-data"
import mongoose from "mongoose"

/**
 * Generate a clean, URL-safe slug ID from an event title
 */
export function generateEventSlug(title: string, year?: string | number): string {
  const cleanTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const currentYear = year || new Date().getFullYear()
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  
  // If title already has year, keep it clean
  if (cleanTitle.includes(String(currentYear))) {
    return `${cleanTitle}-${randomSuffix}`
  }
  return `${cleanTitle}-${currentYear}-${randomSuffix}`
}

/**
 * Seeds default hardcoded events into MongoDB ONLY ONCE on a virgin database.
 * Uses persistent system_settings flag so events deleted by an Admin are NEVER resurrected!
 */
export async function seedEventsIfNeeded(): Promise<void> {
  await connectToDatabase()

  try {
    const db = mongoose.connection.db
    if (!db) return

    const settingsCol = db.collection("system_settings")
    const initializedDoc = await settingsCol.findOne({ key: "events_initialized" })

    // If past events like byterush-2026 exist in DB but lack structured winners, populate them seamlessly
    const pastDoc = await EventModel.findOne({ id: "byterush-2026" })
    if (pastDoc && (!pastDoc.structuredWinners || pastDoc.structuredWinners.length === 0)) {
      const defaultPast = EVENTS_DATA.find((e) => e.id === "byterush-2026")
      if (defaultPast && defaultPast.structuredWinners && defaultPast.structuredWinners.length > 0) {
        await EventModel.updateOne(
          { id: "byterush-2026" },
          {
            $set: {
              structuredWinners: defaultPast.structuredWinners,
              resultsAnnounced: true,
              resultsAnnouncedAt: new Date("2026-10-10"),
            },
          }
        )
      }
    }

    // If system was already seeded/initialized, never resurrect deleted events!
    if (initializedDoc && initializedDoc.value === true) {
      return
    }

    // Check if Event collection already has documents
    const docCount = await EventModel.estimatedDocumentCount()
    if (docCount > 0) {
      await settingsCol.updateOne(
        { key: "events_initialized" },
        { $set: { key: "events_initialized", value: true, updatedAt: new Date() } },
        { upsert: true }
      )
      return
    }

    // Only seed on an entirely fresh database with 0 events
    for (const e of EVENTS_DATA) {
      const existing = await EventModel.findOne({ id: e.id })
      if (!existing) {
        try {
          await EventModel.create({
            id: e.id,
            numericId: e.numericId,
            title: e.title,
            category: e.category,
            tagline: e.tagline,
            description: e.description,
            longDescription: e.longDescription || e.description,
            date: e.date,
            endDate: e.endDate || e.date,
            mode: e.mode,
            venue: e.venue || "",
            location: e.location || "",
            registrationOpens: e.registrationOpens || "",
            registrationDeadline: e.registrationDeadline || "",
            statusOverride: (e.statusOverride as any) || "live",
            featured: !!e.featured,
            image: e.image,
            relatedImages: e.relatedImages || [],
            prizePool: e.prizePool || "Recognition Award for winners",
            teamSize: e.teamSize || { min: 1, max: 4 },
            registrationFee: e.registrationFee || "Free",
            tracks: e.tracks || [],
            perks: e.perks || [],
            eligibility: e.eligibility || "",
            rules: e.rules || [],
            winners: e.winners || [],
            structuredWinners: (e as any).structuredWinners || [],
            resultsAnnounced: !!(e as any).resultsAnnounced,
            resultsAnnouncedAt: (e as any).resultsAnnouncedAt ? new Date((e as any).resultsAnnouncedAt) : undefined,
            resultsUrl: e.resultsUrl || "",
            rounds:
              e.rounds && e.rounds.length > 0
                ? e.rounds
                : [
                    {
                      roundNumber: 1,
                      title: `${e.title} - Round 1 Preliminary Assessment`,
                      testId: e.id === "codefest-2026" ? "TEST-CS-01" : `TEST-${e.id.toUpperCase().slice(0, 6)}`,
                      description: "Official preliminary round testing aptitude, domain knowledge, and problem-solving skills.",
                      scheduledDate: e.date,
                      startTime: "10:00 AM",
                      endTime: "11:00 AM",
                      durationMinutes: 30,
                      mode: "online",
                      status: "scheduled",
                    },
                  ],
            approvalStatus: "approved",
            organizerId: "admin",
            organizerName: "HackKro Team",
            organizerEmail: "team@hackkro.com",
            organizerOrganization: "HackKro Community",
            emailBroadcastsSent: 0,
            emailBroadcasts: [],
          })
        } catch (err) {
          console.warn("Seeding event error for:", e.id, err)
        }
      }
    }

    // Persist that initial seeding has completed
    await settingsCol.updateOne(
      { key: "events_initialized" },
      { $set: { key: "events_initialized", value: true, seededAt: new Date() } },
      { upsert: true }
    )
  } catch (err) {
    console.warn("Seeding check error:", err)
  }
}

/**
 * Fetch events with registration counts
 */
export async function getEventsWithCounts(filter: {
  approvalStatus?: "approved" | "pending" | "rejected" | "all"
  organizerId?: string
  statusOverride?: string
}) {
  await connectToDatabase()
  await seedEventsIfNeeded()

  const query: any = {}

  if (filter.approvalStatus && filter.approvalStatus !== "all") {
    query.approvalStatus = filter.approvalStatus
  }

  if (filter.organizerId) {
    query.organizerId = filter.organizerId
  }

  if (filter.statusOverride) {
    query.statusOverride = filter.statusOverride
  }

  const events = await EventModel.find(query).sort({ createdAt: -1 }).lean()

  // Get registration counts from EventRegistration
  const counts = await EventRegistration.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $group: { _id: "$eventId", count: { $sum: 1 } } },
  ])

  const countMap: Record<string, number> = {}
  counts.forEach((c) => {
    countMap[c._id] = c.count
  })

  return events.map((e: any) => ({
    ...e,
    _id: e._id.toString(),
    registeredCount: countMap[e.id] || 0,
  }))
}
