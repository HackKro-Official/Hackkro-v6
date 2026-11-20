import crypto from "crypto"
import { NextResponse } from "next/server"
import en from "@/config/i18n/en.json"

export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_CHALLENGE_EXPIRED: "AUTH_CHALLENGE_EXPIRED",
  AUTH_CHALLENGE_INVALID: "AUTH_CHALLENGE_INVALID",
  AUTH_RATE_LIMITED: "AUTH_RATE_LIMITED",
  AUTH_PROVIDER_UNAVAILABLE: "AUTH_PROVIDER_UNAVAILABLE",
  AUTH_ACCOUNT_RESTRICTED: "AUTH_ACCOUNT_RESTRICTED",
  AUTH_WEAK_PASSWORD: "AUTH_WEAK_PASSWORD",
  AUTH_REAUTH_REQUIRED: "AUTH_REAUTH_REQUIRED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  ELIGIBILITY_NOT_MET: "ELIGIBILITY_NOT_MET",
  OPPORTUNITY_CLOSED: "OPPORTUNITY_CLOSED",
  CAPACITY_REACHED: "CAPACITY_REACHED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  SUBMISSION_TOO_LARGE: "SUBMISSION_TOO_LARGE",
  CSRF_INVALID: "CSRF_INVALID",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export class AppError extends Error {
  public readonly status: number
  public readonly errorCode: ErrorCode
  public readonly details?: Record<string, unknown>

  constructor(
    errorCode: ErrorCode,
    message?: string,
    status = 400,
    details?: Record<string, unknown>
  ) {
    super(message || (en.errors as Record<string, string>)[errorCode] || "Request failed.")
    this.status = status
    this.errorCode = errorCode
    this.details = details
  }
}

export function generateSupportReferenceId(): string {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase()
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "")
  return `HK-REF-${stamp}-${random}`
}

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString("hex")}`
}

export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  status = 200,
  requestId = generateRequestId()
) {
  return NextResponse.json(
    {
      success: true,
      requestId,
      ...data,
    },
    {
      status,
      headers: {
        "X-Request-Id": requestId,
        "Cache-Control": "no-store",
      },
    }
  )
}

export function apiError(
  error: unknown,
  fallbackStatus = 500,
  requestId = generateRequestId()
) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        errorCode: error.errorCode,
        message: error.message,
        details: error.details,
        requestId,
      },
      {
        status: error.status,
        headers: { "X-Request-Id": requestId },
      }
    )
  }

  const supportReferenceId = generateSupportReferenceId()
  console.error(`[HackKro API Error] requestId=${requestId} ref=${supportReferenceId}`, error)

  return NextResponse.json(
    {
      success: false,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      message: "An unexpected error occurred. Please try again or quote the support reference ID.",
      supportReferenceId,
      requestId,
    },
    {
      status: fallbackStatus,
      headers: { "X-Request-Id": requestId },
    }
  )
}
