import { NextRequest } from "next/server"
import prisma, { toJsonString } from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import { dispatchOrganizationWebhook } from "@/backend/modules/ecosystem-platform.service"
import { sha256Hex, generateOpaqueToken } from "@/backend/utils/crypto"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get("organizationId") || ctx.activeOrganizationId
    if (!organizationId) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Organization context required.", 400)
    }
    assertPermission(ctx, "webhook:manage", organizationId)

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { organizationId },
      include: { deliveries: { orderBy: { createdAt: "desc" }, take: 20 } },
    })
    return apiSuccess({ endpoints })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const organizationId = body.organizationId || ctx.activeOrganizationId
    if (!organizationId) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Organization context required.", 400)
    }
    assertPermission(ctx, "webhook:manage", organizationId)

    if (body.action === "test_dispatch") {
      const deliveries = await dispatchOrganizationWebhook(
        organizationId,
        body.eventType || "application.submitted",
        body.payload || { test: true, triggeredBy: ctx.userId }
      )
      return apiSuccess({ deliveries })
    }

    const rawSecret = generateOpaqueToken(24)
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        organizationId,
        url: body.url,
        eventsJson: toJsonString(body.events || ["*"]),
        secretHash: sha256Hex(rawSecret),
      },
    })

    return apiSuccess({ endpoint, signingSecretOneTimePreview: rawSecret }, 201)
  } catch (err) {
    return apiError(err)
  }
}
