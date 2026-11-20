import crypto from "crypto"
import { AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export interface OAuthStateRecord {
  state: string
  nonce: string
  returnTo: string
  provider: string
  createdAt: number
}

const oauthStates = new Map<string, OAuthStateRecord>()

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI
  )
}

export function createOAuthStartUrl(provider: string, returnTo: string): {
  authUrl: string
  state: string
  mode: "oauth_live" | "oauth_unconfigured"
} {
  if (provider !== "google") {
    throw new AppError(ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE, `Unsupported OAuth provider: ${provider}`, 400)
  }

  if (!isGoogleOAuthConfigured()) {
    throw new AppError(
      ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE,
      "Google OAuth credentials are not configured in this environment. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI.",
      503
    )
  }

  const state = crypto.randomBytes(24).toString("base64url")
  const nonce = crypto.randomBytes(24).toString("base64url")

  oauthStates.set(state, {
    state,
    nonce,
    returnTo,
    provider,
    createdAt: Date.now(),
  })

  // Prune states older than 15 minutes
  const cutoff = Date.now() - 15 * 60 * 1000
  Array.from(oauthStates.entries()).forEach(([k, v]) => {
    if (v.createdAt < cutoff) oauthStates.delete(k)
  })

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    prompt: "select_account",
  })

  return {
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state,
    mode: "oauth_live",
  }
}

export function consumeOAuthState(state: string, provider: string): OAuthStateRecord {
  const rec = oauthStates.get(state)
  if (!rec || rec.provider !== provider) {
    throw new AppError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Invalid or expired OAuth state parameter. Please restart sign-in.",
      400
    )
  }
  oauthStates.delete(state)
  if (Date.now() - rec.createdAt > 15 * 60 * 1000) {
    throw new AppError(ERROR_CODES.AUTH_CHALLENGE_EXPIRED, "OAuth sign-in session expired.", 400)
  }
  return rec
}

/**
 * Validates OIDC ID Token claims (issuer, audience, expiry, nonce, email_verified).
 */
export function validateOidcIdTokenClaims(
  claims: {
    iss?: string
    aud?: string
    sub?: string
    email?: string
    email_verified?: boolean
    name?: string
    nonce?: string
    exp?: number
  },
  expectedNonce: string
) {
  const validIssuers = ["https://accounts.google.com", "accounts.google.com"]
  if (!claims.iss || !validIssuers.includes(claims.iss)) {
    throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "OAuth issuer verification failed.", 401)
  }
  if (
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    claims.aud !== process.env.GOOGLE_OAUTH_CLIENT_ID
  ) {
    throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "OAuth audience verification failed.", 401)
  }
  if (!claims.nonce || claims.nonce !== expectedNonce) {
    throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "OAuth nonce verification failed.", 401)
  }
  if (claims.exp && claims.exp * 1000 < Date.now()) {
    throw new AppError(ERROR_CODES.AUTH_CHALLENGE_EXPIRED, "OAuth token has expired.", 401)
  }
  if (!claims.sub || !claims.email || !claims.email_verified) {
    throw new AppError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "OAuth provider did not return a verified email identity.",
      401
    )
  }
  return {
    providerSubject: claims.sub,
    email: claims.email.trim().toLowerCase(),
    emailVerified: Boolean(claims.email_verified),
    displayName: claims.name || claims.email.split("@")[0],
  }
}
