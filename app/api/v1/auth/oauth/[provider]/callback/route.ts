import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { consumeOAuthState, isGoogleOAuthConfigured, validateOidcIdTokenClaims } from "@/backend/adapters/oauth.adapter"
import { AppError, ERROR_CODES, apiError } from "@/backend/utils/error-codes"
import { attachSessionCookies } from "@/backend/modules/auth.service"
import { generateOpaqueToken, sha256Hex } from "@/backend/utils/crypto"
import { getClientMeta } from "@/backend/utils/rbac-abac"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const url = new URL(req.url)
    const errorParam = url.searchParams.get("error")
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")

    if (errorParam === "access_denied") {
      return NextResponse.redirect(new URL("/login?error=oauth_cancelled", req.url))
    }

    if (!state || !code) {
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Missing OAuth code or state.", 400)
    }

    const stateRecord = consumeOAuthState(state, params.provider)

    if (!isGoogleOAuthConfigured()) {
      throw new AppError(
        ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE,
        "Google OAuth credentials are not configured.",
        503
      )
    }

    // Exchange authorization code with Google token endpoint
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      throw new AppError(ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE, "Failed to verify OAuth authorization code.", 502)
    }

    const tokenData = await tokenRes.json()
    const idToken = tokenData.id_token as string
    if (!idToken || idToken.split(".").length !== 3) {
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Invalid OIDC ID token.", 401)
    }

    const claimsPayload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"))
    const verified = validateOidcIdTokenClaims(claimsPayload, stateRecord.nonce)

    // Safe account linking policy:
    // 1. If AuthIdentity already exists -> log into that user
    // 2. If User with same email + PasswordCredential exists -> DO NOT silently merge without proof; require login first!
    // 3. Otherwise create new passwordless User + AuthIdentity
    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: params.provider,
          providerSubject: verified.providerSubject,
        },
      },
    })

    let userId: string
    if (existingIdentity) {
      userId = existingIdentity.userId
    } else {
      const existingEmailUser = await prisma.user.findUnique({
        where: { primaryEmail: verified.email },
        include: { passwordCredential: true },
      })

      if (existingEmailUser?.passwordCredential) {
        return NextResponse.redirect(
          new URL("/login?error=link_requires_password_auth", req.url)
        )
      }

      if (existingEmailUser) {
        userId = existingEmailUser.id
      } else {
        const created = await prisma.user.create({
          data: {
            displayName: verified.displayName,
            primaryEmail: verified.email,
            emailVerifiedAt: new Date(),
            status: "active",
            primaryIntent: "student",
          },
        })
        await prisma.profile.create({ data: { userId: created.id } })
        await prisma.privacySettings.create({ data: { userId: created.id } })
        userId = created.id
      }

      await prisma.authIdentity.create({
        data: {
          userId,
          provider: params.provider,
          providerSubject: verified.providerSubject,
          providerEmail: verified.email,
          providerEmailVerified: true,
        },
      })
    }

    const { ipAddress, userAgent } = getClientMeta(req)
    const rawToken = generateOpaqueToken(36)
    const csrfToken = generateOpaqueToken(24)

    await prisma.session.create({
      data: {
        userId,
        tokenHash: sha256Hex(rawToken),
        csrfToken,
        activeRole: "participant",
        ipAddress,
        userAgent: userAgent.slice(0, 300),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const redirectRes = NextResponse.redirect(new URL(stateRecord.returnTo || "/dashboard", req.url))
    return attachSessionCookies(redirectRes, rawToken, csrfToken, true)
  } catch (err) {
    return apiError(err)
  }
}
