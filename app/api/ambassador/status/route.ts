import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongoose"
import { CampusAmbassador } from "@/models/campus-ambassador"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const identifier = searchParams.get("identifier")?.trim()

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "Please provide your Application ID or registered email." },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const clean = identifier.toLowerCase()
    const application = await CampusAmbassador.findOne({
      $or: [
        { applicationId: identifier.toUpperCase() },
        { applicationId: identifier },
        { email: clean },
        { mobile: identifier },
      ],
    })
      .select("applicationId name collegeName universityName status adminNotes ambassadorId createdAt reviewedAt")
      .lean()

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          message: "No Campus Ambassador application found with this reference ID or email.",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      application,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
