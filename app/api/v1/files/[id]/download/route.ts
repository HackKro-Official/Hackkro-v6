import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { readPrivateFileByKey, verifyFileDownloadToken } from "@/backend/adapters/storage.adapter"
import { apiError, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { recordAuditEvent } from "@/backend/modules/audit.service"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token") || ""
    const verified = verifyFileDownloadToken(token)
    if (!verified || verified.fileId !== params.id) {
      throw new AppError(ERROR_CODES.FORBIDDEN, "Invalid or expired download link.", 403)
    }

    const asset = await prisma.fileAsset.findUnique({ where: { id: params.id } })
    if (!asset || asset.scanStatus !== "clean") {
      throw new AppError(ERROR_CODES.NOT_FOUND, "File unavailable.", 404)
    }

    const bytes = await readPrivateFileByKey(asset.storageKey)

    await recordAuditEvent({
      actorId: verified.userId,
      actorRole: "authorized_downloader",
      action: "file.downloaded",
      resourceType: "file_asset",
      resourceId: asset.id,
    })

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": asset.detectedMime,
        "Content-Disposition": `attachment; filename="${asset.originalName.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err) {
    return apiError(err)
  }
}
