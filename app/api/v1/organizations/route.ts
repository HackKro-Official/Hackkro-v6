import { NextRequest } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { recordAuditEvent } from "@/backend/modules/audit.service"

export const dynamic = "force-dynamic"

const createOrgSchema = z.object({
  legalName: z.string().min(2).max(160),
  displayName: z.string().min(2).max(120),
  type: z.enum(["company", "college", "club", "community", "nonprofit", "government"]),
  domain: z.string().optional().default(""),
  officialEmail: z.string().email(),
  website: z.string().optional().default(""),
  address: z.string().optional().default(""),
  description: z.string().optional().default(""),
  evidenceType: z.string().optional().default("domain_email"),
  evidenceUrl: z.string().optional().default(""),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")
    if (slug) {
      const org = await prisma.organization.findUnique({
        where: { slug },
        include: {
          opportunities: {
            where: { visibility: "public", status: { in: ["live", "scheduled", "completed"] } },
            take: 10,
          },
          _count: { select: { followers: true, opportunities: true } },
        },
      })
      if (!org) throw new AppError(ERROR_CODES.NOT_FOUND, "Organization not found.", 404)
      return apiSuccess({ organization: org })
    }

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { opportunities: true, followers: true } } },
    })
    return apiSuccess({ organizations })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const parsed = createOrgSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }

    const slugBase = parsed.data.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    const slug = `${slugBase || "org"}-${Math.floor(1000 + Math.random() * 9000)}`

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          slug,
          legalName: parsed.data.legalName,
          displayName: parsed.data.displayName,
          type: parsed.data.type,
          domain: parsed.data.domain,
          officialEmail: parsed.data.officialEmail.toLowerCase(),
          website: parsed.data.website,
          address: parsed.data.address,
          description: parsed.data.description,
          evidenceType: parsed.data.evidenceType,
          evidenceUrl: parsed.data.evidenceUrl,
          verificationStatus: "pending_review",
          createdBy: ctx.userId,
        },
      })

      const roleKey =
        parsed.data.type === "college"
          ? "college_admin"
          : parsed.data.type === "company"
          ? "recruiter_admin"
          : "organizer_owner"

      await tx.organizationMembership.create({
        data: {
          userId: ctx.userId,
          organizationId: created.id,
          roleKey,
          status: "active",
          acceptedAt: new Date(),
        },
      })

      if (parsed.data.type === "college") {
        await tx.institution.create({
          data: {
            organizationId: created.id,
            placementCellEmail: parsed.data.officialEmail.toLowerCase(),
          },
        })
      }

      return created
    })

    await recordAuditEvent({
      actorId: ctx.userId,
      actorRole: ctx.activeRole,
      tenantId: org.id,
      action: "organization.created",
      resourceType: "organization",
      resourceId: org.id,
      afterSummary: { displayName: org.displayName, type: org.type },
    })

    return apiSuccess({ organization: org }, 201)
  } catch (err) {
    return apiError(err)
  }
}
