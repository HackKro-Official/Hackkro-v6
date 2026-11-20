import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import { issueCertificateRecord } from "@/backend/modules/assessments-judging.service"
import { recordAuditEvent } from "@/backend/modules/audit.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const certificates = await prisma.certificate.findMany({
      where: { userId: ctx.userId },
      orderBy: { issuedAt: "desc" },
    })
    return apiSuccess({ certificates })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const cert = await issueCertificateRecord(ctx, body)
    return apiSuccess({ certificate: cert }, 201)
  } catch (err) {
    return apiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    assertPermission(ctx, "certificate:correct")
    const body = await req.json()

    const cert = await prisma.certificate.findUnique({ where: { id: body.certificateId } })
    if (!cert) throw new AppError(ERROR_CODES.NOT_FOUND, "Certificate not found.", 404)

    const updated = await prisma.certificate.update({
      where: { id: cert.id },
      data: {
        status: body.status, // valid | corrected | revoked
        revocationReason: body.revocationReason || "",
        ...(body.recipientName ? { recipientName: body.recipientName } : {}),
        ...(body.title ? { title: body.title } : {}),
      },
    })

    await recordAuditEvent({
      actorId: ctx.userId,
      actorRole: ctx.activeRole,
      action: "certificate.updated",
      resourceType: "certificate",
      resourceId: cert.id,
      beforeSummary: { status: cert.status },
      afterSummary: { status: updated.status, reason: updated.revocationReason },
    })

    return apiSuccess({ certificate: updated })
  } catch (err) {
    return apiError(err)
  }
}
