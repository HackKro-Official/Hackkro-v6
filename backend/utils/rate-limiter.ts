import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"

interface Bucket {
  timestamps: number[]
  blockedUntil?: number
}

const store = new Map<string, Bucket>()

export interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
  blockMs?: number
}

export function enforceRateLimit({
  key,
  limit,
  windowMs,
  blockMs = 60_000,
}: RateLimitOptions): { remaining: number } {
  const now = Date.now()
  const existing = store.get(key) ?? { timestamps: [] }

  if (existing.blockedUntil && existing.blockedUntil > now) {
    const retryAfterSec = Math.ceil((existing.blockedUntil - now) / 1000)
    throw new AppError(
      ERROR_CODES.AUTH_RATE_LIMITED,
      `Too many requests. Please try again in ${retryAfterSec} seconds.`,
      429,
      { retryAfterSeconds: retryAfterSec }
    )
  }

  const cutoff = now - windowMs
  existing.timestamps = existing.timestamps.filter((ts) => ts > cutoff)

  if (existing.timestamps.length >= limit) {
    existing.blockedUntil = now + blockMs
    store.set(key, existing)
    const retryAfterSec = Math.ceil(blockMs / 1000)
    throw new AppError(
      ERROR_CODES.AUTH_RATE_LIMITED,
      `Too many requests. Please try again in ${retryAfterSec} seconds.`,
      429,
      { retryAfterSeconds: retryAfterSec }
    )
  }

  existing.timestamps.push(now)
  existing.blockedUntil = undefined
  store.set(key, existing)

  return { remaining: Math.max(0, limit - existing.timestamps.length) }
}

export function clearRateLimit(key: string): void {
  store.delete(key)
}
