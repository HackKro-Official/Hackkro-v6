import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function toJsonString(value: unknown, fallback = "{}"): string {
  try {
    return JSON.stringify(value)
  } catch {
    return fallback
  }
}

export default prisma
