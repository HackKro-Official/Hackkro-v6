import { NextRequest } from "next/server"
import QRCode from "qrcode"
import prisma from "@/lib/db"
import { enforceRateLimit } from "@/backend/utils/rate-limiter"
import { getClientMeta } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { credentialId: string } }
) {
  try {
    const { ipAddress } = getClientMeta(req)
    enforceRateLimit({ key: `cert_verify:${ipAddress}`, limit: 60, windowMs: 60 * 1000 })

    const cert = await prisma.certificate.findUnique({
      where: { credentialId: params.credentialId },
      include: {
        organization: { select: { displayName: true, verificationStatus: true, logoUrl: true } },
      },
    })

    if (!cert) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Credential ID not found.", 404)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const verifyUrl = `${appUrl}/verify/${encodeURIComponent(cert.credentialId)}`
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 180, margin: 1 })

    // Public verification reveals ONLY intended credential data (never private PII like email/phone)
    return apiSuccess({
      credential: {
        credentialId: cert.credentialId,
        recipientName: cert.recipientName,
        issuerName: cert.issuerName,
        issuerVerified: cert.organization?.verificationStatus === "verified",
        title: cert.title,
        achievementType: cert.achievementType,
        criteriaText: cert.criteriaText,
        status: cert.status,
        revocationReason: cert.status === "revoked" ? cert.revocationReason || "Revoked by issuer" : null,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        verifyUrl,
        qrDataUrl,
      },
    })
  } catch (err) {
    return apiError(err)
  }
}
