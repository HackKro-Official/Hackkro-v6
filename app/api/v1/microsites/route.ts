import { NextRequest } from "next/server"
import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { assertPermission, getAuthContext, requireAuth } from "@/backend/utils/rbac-abac"
import { sanitizeMicrositeContent } from "@/backend/modules/ecosystem-platform.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")

    if (slug) {
      const site = await prisma.microsite.findUnique({
        where: { slug },
        include: { organization: true, opportunity: true },
      })
      if (!site) throw new AppError(ERROR_CODES.NOT_FOUND, "Microsite not found.", 404)
      const isOrgMember = ctx?.memberships.some((m) => m.organizationId === site.organizationId)
      if ((site.isPrivate || site.status !== "published") && !isOrgMember) {
        throw new AppError(ERROR_CODES.FORBIDDEN, "This event microsite is private.", 403)
      }
      return apiSuccess({
        microsite: {
          ...site,
          themeTokens: safeParseJson(site.themeTokensJson, {}),
          sections: safeParseJson(site.sectionsJson, []),
          seo: safeParseJson(site.seoJson, {}),
        },
      })
    }

    const sites = await prisma.microsite.findMany({
      where: { status: "published", isPrivate: false },
      include: { organization: { select: { displayName: true } } },
    })
    return apiSuccess({ microsites: sites })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    assertPermission(ctx, "event:write", body.organizationId)

    const sanitizedSections = await sanitizeMicrositeContent(body.sections || [])
    const slug = String(body.slug || body.title || "event-site")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")

    const site = await prisma.microsite.upsert({
      where: { slug },
      update: {
        title: body.title,
        themeTokensJson: toJsonString(body.themeTokens || {}),
        sectionsJson: toJsonString(sanitizedSections),
        seoJson: toJsonString(body.seo || {}),
        isPrivate: Boolean(body.isPrivate),
        status: body.publish ? "published" : "draft",
        publishedVersion: body.publish ? { increment: 1 } : undefined,
        publishedAt: body.publish ? new Date() : undefined,
      },
      create: {
        slug,
        opportunityId: body.opportunityId || null,
        organizationId: body.organizationId,
        title: body.title,
        themeTokensJson: toJsonString(body.themeTokens || {}),
        sectionsJson: toJsonString(sanitizedSections),
        seoJson: toJsonString(body.seo || {}),
        isPrivate: Boolean(body.isPrivate),
        status: body.publish ? "published" : "draft",
        publishedVersion: body.publish ? 1 : 0,
        publishedAt: body.publish ? new Date() : null,
      },
    })

    return apiSuccess({ microsite: site }, 201)
  } catch (err) {
    return apiError(err)
  }
}
