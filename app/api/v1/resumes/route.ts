import { NextRequest } from "next/server"
import prisma, { toJsonString } from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { processPrivateFileUpload } from "@/backend/adapters/storage.adapter"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const resumes = await prisma.resumeVersion.findMany({
      where: { userId: ctx.userId, isArchived: false },
      orderBy: { createdAt: "desc" },
    })
    return apiSuccess({ resumes })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const contentType = req.headers.get("content-type") || ""

    let title = "Resume"
    let fileName = "resume.pdf"
    let declaredMime = "application/pdf"
    let buffer: Buffer

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File | null
      title = String(formData.get("title") || file?.name || "Resume")
      if (!file) throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Select a PDF or DOCX resume file.", 400)
      fileName = file.name
      declaredMime = file.type || "application/pdf"
      buffer = Buffer.from(await file.arrayBuffer())
    } else {
      const body = await req.json()
      title = body.title || "Resume"
      fileName = body.fileName || "resume.txt"
      declaredMime = body.mimeType || "text/plain"
      const rawContent = body.contentBase64
        ? Buffer.from(body.contentBase64, "base64")
        : Buffer.from(String(body.contentText || ""), "utf8")
      buffer = rawContent
    }

    const uploaded = await processPrivateFileUpload({
      buffer,
      originalName: fileName,
      declaredMime,
    })

    const asset = await prisma.fileAsset.create({
      data: {
        ownerId: ctx.userId,
        storageKey: uploaded.storageKey,
        originalName: uploaded.originalName,
        declaredMime: uploaded.declaredMime,
        detectedMime: uploaded.detectedMime,
        sizeBytes: uploaded.sizeBytes,
        checksumSha256: uploaded.checksumSha256,
        scanStatus: uploaded.scanStatus,
        purpose: "resume",
      },
    })

    // Clearly mark machine-extracted summary so user can review & correct it
    const extractedKeywords = ["TypeScript", "React", "Python", "SQL", "Node.js", "Java"].filter((k) =>
      uploaded.extractedText.toLowerCase().includes(k.toLowerCase())
    )

    const parsedMetadata = {
      machineExtracted: true,
      note: "Auto-extracted from document text; verify before attaching.",
      detectedSkills: extractedKeywords,
      charCount: uploaded.extractedText.length,
    }

    const resume = await prisma.resumeVersion.create({
      data: {
        userId: ctx.userId,
        fileAssetId: asset.id,
        title,
        fileName: uploaded.originalName,
        mimeType: uploaded.detectedMime,
        fileSize: uploaded.sizeBytes,
        checksum: uploaded.checksumSha256,
        extractedText: uploaded.extractedText,
        parsedMetadataJson: toJsonString(parsedMetadata),
        isDefault: (await prisma.resumeVersion.count({ where: { userId: ctx.userId, isArchived: false } })) === 0,
      },
    })

    return apiSuccess({ resume, parsedMetadata }, 201)
  } catch (err) {
    return apiError(err)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const resumeId = searchParams.get("id")
    if (!resumeId) throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Resume id is required.", 400)

    const resume = await prisma.resumeVersion.findUnique({ where: { id: resumeId } })
    if (!resume || resume.userId !== ctx.userId) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Resume not found.", 404)
    }

    // Preserve historical application snapshots by archiving rather than overwriting/erasing linked records
    await prisma.resumeVersion.update({
      where: { id: resume.id },
      data: { isArchived: true, isDefault: false },
    })

    return apiSuccess({ archived: true })
  } catch (err) {
    return apiError(err)
  }
}
