import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { buildSignedDownloadUrl, processPrivateFileUpload } from "@/backend/adapters/storage.adapter"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const purpose = String(formData.get("purpose") || "submission")

    if (!file) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "No file uploaded.", 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const processed = await processPrivateFileUpload({
      buffer,
      originalName: file.name,
      declaredMime: file.type || "application/octet-stream",
    })

    const asset = await prisma.fileAsset.create({
      data: {
        ownerId: ctx.userId,
        organizationId: ctx.activeOrganizationId,
        storageKey: processed.storageKey,
        originalName: processed.originalName,
        declaredMime: processed.declaredMime,
        detectedMime: processed.detectedMime,
        sizeBytes: processed.sizeBytes,
        checksumSha256: processed.checksumSha256,
        scanStatus: processed.scanStatus,
        purpose,
      },
    })

    return apiSuccess(
      {
        fileAsset: asset,
        signedDownloadUrl: buildSignedDownloadUrl(asset.id, ctx.userId),
      },
      201
    )
  } catch (err) {
    return apiError(err)
  }
}
