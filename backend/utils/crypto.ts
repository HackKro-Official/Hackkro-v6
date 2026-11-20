import crypto from "crypto"
import { COMMON_BREACHED_PASSWORDS } from "@/config/taxonomies"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64

export function validatePasswordStrength(password: string): void {
  if (!password || password.length < 8) {
    throw new AppError(
      ERROR_CODES.AUTH_WEAK_PASSWORD,
      "Passphrase must be at least 8 characters long.",
      400
    )
  }
  if (password.length > 256) {
    throw new AppError(
      ERROR_CODES.AUTH_WEAK_PASSWORD,
      "Passphrase must not exceed 256 characters.",
      400
    )
  }
  const normalized = password.trim().toLowerCase()
  if (COMMON_BREACHED_PASSWORDS.has(normalized)) {
    throw new AppError(
      ERROR_CODES.AUTH_WEAK_PASSWORD,
      "This password appears in common breach lists. Please choose a unique passphrase.",
      400
    )
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const derived = crypto.scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString("hex")}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false

  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$")
    if (parts.length !== 6) return false
    const N = Number(parts[1])
    const r = Number(parts[2])
    const p = Number(parts[3])
    const salt = parts[4]
    const expectedHex = parts[5]
    if (!salt || !expectedHex || !Number.isFinite(N)) return false

    const derived = crypto.scryptSync(password, salt, KEY_LEN, { N, r, p })
    const expected = Buffer.from(expectedHex, "hex")
    if (derived.length !== expected.length) return false
    return crypto.timingSafeEqual(derived, expected)
  }

  // Legacy PBKDF2 migration support (salt:hash)
  if (storedHash.includes(":")) {
    const [salt, expectedHex] = storedHash.split(":")
    if (!salt || !expectedHex) return false
    const derived = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512")
    const expected = Buffer.from(expectedHex, "hex")
    if (derived.length !== expected.length) return false
    return crypto.timingSafeEqual(derived, expected)
  }

  return false
}

export function generateOtpCode(): string {
  const num = crypto.randomInt(100000, 1000000)
  return String(num)
}

export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url")
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function getSigningSecret(envKey: string, devFallback: string): string {
  const val = process.env[envKey]
  if (val && val.length >= 16) return val
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Security misconfiguration: ${envKey} must be set in production.`)
  }
  return devFallback
}

export function signWebhookPayload(payload: string, secret?: string): string {
  const key = secret || getSigningSecret("WEBHOOK_SIGNING_SECRET", "hackkro-dev-webhook-signing-secret")
  return crypto.createHmac("sha256", key).update(payload).digest("hex")
}

export function verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
  const expected = signWebhookPayload(payload, secret)
  return constantTimeEqual(expected, signature)
}

export function createSignedFileToken(fileId: string, userId: string, expiresInSeconds = 300): string {
  const secret = getSigningSecret("FILE_SIGNING_SECRET", "hackkro-dev-file-signing-secret")
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const data = `${fileId}.${userId}.${exp}`
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url")
  return `${data}.${sig}`
}

export function verifySignedFileToken(token: string): { fileId: string; userId: string } | null {
  const parts = token.split(".")
  if (parts.length !== 4) return null
  const [fileId, userId, expStr, sig] = parts
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null
  const secret = getSigningSecret("FILE_SIGNING_SECRET", "hackkro-dev-file-signing-secret")
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${fileId}.${userId}.${expStr}`)
    .digest("base64url")
  if (!constantTimeEqual(expectedSig, sig)) return null
  return { fileId, userId }
}

export function generateCredentialId(): string {
  return `HK-${crypto.randomBytes(6).toString("hex").toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
}
