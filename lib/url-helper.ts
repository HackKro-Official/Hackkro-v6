/**
 * Helper to get the canonical base URL for emails and redirects.
 * Prioritizes production domains and dynamic request host over localhost.
 */
export function getAppBaseUrl(request?: Request): string {
  // 1. Explicit production environment variables
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl.replace(/\/$/, "")
  }

  // 2. Derive dynamically from incoming request headers
  if (request) {
    const origin = request.headers.get("origin")
    if (origin && !origin.includes("localhost")) {
      return origin.replace(/\/$/, "")
    }
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
    const proto = request.headers.get("x-forwarded-proto") || "https"
    if (host && !host.includes("localhost")) {
      return `${proto}://${host}`.replace(/\/$/, "")
    }
  }

  // 3. Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "")
  }

  // 4. Default production domains (Never fallback to localhost for emails!)
  return "https://events.hackkro.com"
}
