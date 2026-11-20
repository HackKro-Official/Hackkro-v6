import { NextRequest } from "next/server"
import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get("organizationId") || ctx.activeOrganizationId

    const inst = orgId
      ? await prisma.institution.findUnique({
          where: { organizationId: orgId },
          include: {
            organization: true,
            cohorts: true,
            placementDrives: { include: { opportunity: { select: { title: true, slug: true } } } },
          },
        })
      : await prisma.institution.findFirst({
          include: {
            organization: true,
            cohorts: true,
            placementDrives: { include: { opportunity: { select: { title: true, slug: true } } } },
          },
        })

    if (!inst) return apiSuccess({ institution: null })

    if (ctx.activeRole !== "platform_admin") {
      assertPermission(ctx, "institution:manage", inst.organizationId)
    }

    return apiSuccess({
      institution: {
        ...inst,
        departments: safeParseJson(inst.departmentsJson, []),
        cohorts: inst.cohorts.map((c) => ({
          ...c,
          verifiedEmails: safeParseJson(c.verifiedEmailsJson, []),
        })),
      },
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const inst = await prisma.institution.findUnique({ where: { id: body.institutionId } })
    if (!inst) throw new AppError(ERROR_CODES.NOT_FOUND, "Institution not found.", 404)
    assertPermission(ctx, "cohort:manage", inst.organizationId)

    if (body.action === "create_cohort") {
      const emails = Array.isArray(body.verifiedEmails) ? body.verifiedEmails : []
      const cohort = await prisma.campusCohort.create({
        data: {
          institutionId: inst.id,
          name: body.name,
          graduationYear: String(body.graduationYear || "2026"),
          department: body.department || "CSE",
          verifiedEmailsJson: toJsonString(emails),
          studentCount: Number(body.studentCount || emails.length),
        },
      })
      return apiSuccess({ cohort }, 201)
    }

    if (body.action === "create_drive") {
      const drive = await prisma.placementDrive.create({
        data: {
          institutionId: inst.id,
          companyName: body.companyName,
          title: body.title,
          eligibilityJson: toJsonString(body.eligibility || {}),
          driveDate: body.driveDate ? new Date(body.driveDate) : null,
          status: "open",
        },
      })
      return apiSuccess({ drive }, 201)
    }

    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Unsupported institution action.", 400)
  } catch (err) {
    return apiError(err)
  }
}
