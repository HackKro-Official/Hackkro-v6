import { NextResponse, type NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Companion & Isolation Security Headers (modern-web-guidance + Ch 40)
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), focus-without-user-activation=()"
  )
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
  )

  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin")
    response.headers.set("Cache-Control", "no-store")
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
