import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { createSignedFileToken, verifySignedFileToken } from "@/backend/utils/crypto"

const STORAGE_ROOT = path.resolve(process.cwd(), "storage")
const QUARANTINE_DIR = path.join(STORAGE_ROOT, "quarantine")
const VAULT_DIR = path.join(STORAGE_ROOT, "vault")

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
])

/**
 * Inspect file magic bytes rather than trusting extension or client MIME header.
 */
export function detectMimeFromMagicBytes(buf: Buffer, fallbackName: string): string {
  if (buf.length >= 4) {
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
      return "application/pdf"
    }
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return "image/png"
    }
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return "image/jpeg"
    }
    if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05)) {
      const ext = path.extname(fallbackName).toLowerCase()
      if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      if (ext === ".pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      return "application/zip"
    }
  }
  const headText = buf.subarray(0, Math.min(512, buf.length)).toString("utf8")
  if (/<script\b|<html\b|<!doctype html/i.test(headText)) {
    return "text/html" // Explicitly blocked from upload/serving
  }
  if (/^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(headText)) {
    return fallbackName.endsWith(".md") ? "text/markdown" : "text/plain"
  }
  return "application/octet-stream"
}

export function scanBufferForMalware(buf: Buffer): { clean: boolean; reason?: string } {
  const sample = buf.subarray(0, Math.min(buf.length, 65536)).toString("utf8")
  // EICAR standard antivirus test signature + active script injection guard
  if (sample.includes("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")) {
    return { clean: false, reason: "Malware test signature detected (EICAR)." }
  }
  // Block executable MZ / ELF binaries disguised as documents
  if (buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) {
    return { clean: false, reason: "Windows PE executable files are prohibited." }
  }
  if (buf.length >= 4 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) {
    return { clean: false, reason: "ELF binary executables are prohibited." }
  }
  return { clean: true }
}

export async function processPrivateFileUpload(params: {
  buffer: Buffer
  originalName: string
  declaredMime: string
}) {
  const { buffer, originalName, declaredMime } = params
  if (buffer.length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Uploaded file is empty.", 400)
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new AppError(
      ERROR_CODES.SUBMISSION_TOO_LARGE,
      `File exceeds the ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB limit.`,
      413
    )
  }

  const detectedMime = detectMimeFromMagicBytes(buffer, originalName)
  if (detectedMime === "text/html" || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      `Unsupported or unsafe file type detected (${detectedMime}). HTML/scripts and executables are blocked.`,
      400
    )
  }

  await fs.mkdir(QUARANTINE_DIR, { recursive: true })
  await fs.mkdir(VAULT_DIR, { recursive: true })

  const storageKey = `${Date.now()}_${crypto.randomBytes(12).toString("hex")}`
  const quarantinePath = path.join(QUARANTINE_DIR, storageKey)
  const vaultPath = path.join(VAULT_DIR, storageKey)

  await fs.writeFile(quarantinePath, buffer)

  const scan = scanBufferForMalware(buffer)
  if (!scan.clean) {
    await fs.unlink(quarantinePath).catch(() => {})
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      `Security scan rejected file: ${scan.reason}`,
      400
    )
  }

  const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex")
  await fs.rename(quarantinePath, vaultPath)

  // Safe text extraction preview for PDF/TXT/MD
  let extractedText = ""
  if (detectedMime === "text/plain" || detectedMime === "text/markdown") {
    extractedText = buffer.toString("utf8").slice(0, 8000)
  } else if (detectedMime === "application/pdf") {
    const ascii = buffer.toString("latin1").replace(/[^\x20-\x7e\n]/g, " ")
    extractedText = ascii.replace(/\s+/g, " ").trim().slice(0, 4000)
  }

  return {
    storageKey,
    originalName: path.basename(originalName),
    declaredMime,
    detectedMime,
    sizeBytes: buffer.length,
    checksumSha256,
    scanStatus: "clean" as const,
    extractedText,
  }
}

export async function readPrivateFileByKey(storageKey: string): Promise<Buffer> {
  const safeKey = path.basename(storageKey)
  const fullPath = path.join(VAULT_DIR, safeKey)
  return fs.readFile(fullPath)
}

export function buildSignedDownloadUrl(fileId: string, userId: string): string {
  const token = createSignedFileToken(fileId, userId, 300)
  return `/api/v1/files/${fileId}/download?token=${encodeURIComponent(token)}`
}

export function verifyFileDownloadToken(token: string) {
  return verifySignedFileToken(token)
}
