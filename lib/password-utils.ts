import crypto from "crypto"

/**
 * Hashes a password using PBKDF2 with a random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return `${salt}:${hash}`
}

/**
 * Verifies a password against the stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false
  if (!storedHash.includes(":")) {
    // Plaintext fallback for legacy records
    return password === storedHash
  }
  const [salt, originalHash] = storedHash.split(":")
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return hash === originalHash
}
