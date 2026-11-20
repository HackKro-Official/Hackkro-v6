import { NextResponse } from "next/server"
import prisma, { safeParseJson } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const opportunities = await prisma.opportunity.findMany({
      where: {
        visibility: "public",
        status: { in: ["live", "scheduled", "completed", "results_published"] },
      },
      include: {
        organization: { select: { displayName: true, verificationStatus: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const events = opportunities.map((op, idx) => ({
      _id: op.id,
      id: op.slug,
      numericId: idx + 1,
      title: op.title,
      category: op.category,
      type: op.type,
      tagline: op.shortSummary,
      description: op.shortSummary,
      longDescription: op.fullDescription,
      date: (op.eventStartAt || op.createdAt).toISOString().slice(0, 10),
      endDate: (op.eventEndAt || op.registrationCloseAt || op.createdAt).toISOString().slice(0, 10),
      mode: op.locationMode === "offline" ? "Offline" : op.locationMode === "hybrid" ? "Hybrid" : "Online",
      venue: op.venue,
      location: op.locationText,
      registrationDeadline: op.registrationCloseAt?.toISOString().slice(0, 10) || "",
      statusOverride: op.status === "completed" || op.status === "results_published" ? "past" : "live",
      featured: op.featured,
      image: op.bannerAssetUrl || "/placeholder.jpg",
      relatedImages: [],
      prizePool: op.prizeText || op.stipendText || "Certificate & Recognition",
      teamSize: { min: op.teamMin, max: op.teamMax },
      registrationFee: op.feeAmount > 0 ? `${op.currency} ${op.feeAmount / 100}` : "Free",
      tracks: safeParseJson<string[]>(op.tracksJson, []),
      perks: safeParseJson<string[]>(op.perksJson, []),
      rules: safeParseJson<string[]>(op.rulesJson, []),
      organizerName: op.organization.displayName,
      organizerVerified: op.organization.verificationStatus === "verified",
      registeredCount: op._count.applications,
    }))

    return NextResponse.json({ success: true, events })
  } catch (error: any) {
    console.error("Error fetching public events:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load events", events: [] },
      { status: 500 }
    )
  }
}
