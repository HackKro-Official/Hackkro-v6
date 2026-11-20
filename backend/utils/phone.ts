import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export interface ParsedIdentifier {
  kind: "email" | "phone"
  normalized: string
  masked: string
}

export function normalizeEmail(raw: string): string {
  const trimmed = raw.trim()
  const atIdx = trimmed.lastIndexOf("@")
  if (atIdx <= 0 || atIdx === trimmed.length - 1) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Please enter a valid email address.", 400)
  }
  const local = trimmed.slice(0, atIdx).toLowerCase()
  const domain = trimmed.slice(atIdx + 1).toLowerCase()
  if (!domain.includes(".") || /\s/.test(trimmed)) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Please enter a valid email address.", 400)
  }
  // Preserve valid + subaddressing intact
  const normalized = `${local}@${domain}`
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(normalized)) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Please enter a valid email address.", 400)
  }
  return normalized
}

export function normalizePhoneE164(raw: string, defaultDialCode = "+91"): string {
  let cleaned = raw.trim().replace(/[\s\-().]/g, "")
  if (!cleaned) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Please enter a valid phone number.", 400)
  }

  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`
  }

  if (!cleaned.startsWith("+")) {
    const dialDigits = defaultDialCode.replace(/\D/g, "")
    const localDigits = cleaned.replace(/^0+/, "").replace(/\D/g, "")
    if (localDigits.length < 6 || localDigits.length > 14) {
      throw new AppError(
        ERROR_CODES.VALIDATION_FAILED,
        "Please provide an international phone number with country code (e.g., +91... or +1...).",
        400
      )
    }
    cleaned = `+${dialDigits}${localDigits}`
  } else {
    cleaned = `+${cleaned.slice(1).replace(/\D/g, "")}`
  }

  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "Invalid international phone format. Use E.164 format such as +919876543210 or +14155552671.",
      400
    )
  }
  return cleaned
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return "***"
  const head = local.slice(0, Math.min(2, local.length))
  return `${head}***@${domain}`
}

export function maskPhone(e164: string): string {
  if (e164.length < 6) return "***"
  return `${e164.slice(0, 3)}******${e164.slice(-4)}`
}

export function parseLoginIdentifier(raw: string, defaultDialCode = "+91"): ParsedIdentifier {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "Email or mobile number is required.", 400)
  }

  if (trimmed.includes("@")) {
    const normalized = normalizeEmail(trimmed)
    return {
      kind: "email",
      normalized,
      masked: maskEmail(normalized),
    }
  }

  // Only treat as phone if it looks numeric / starts with +
  if (/^[+\d\s\-().]+$/.test(trimmed)) {
    const normalized = normalizePhoneE164(trimmed, defaultDialCode)
    return {
      kind: "phone",
      normalized,
      masked: maskPhone(normalized),
    }
  }

  throw new AppError(
    ERROR_CODES.VALIDATION_FAILED,
    "Enter a valid email address or international mobile number.",
    400
  )
}
