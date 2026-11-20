import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { getAuthContext } from "@/backend/utils/rbac-abac"
import { sanitizePublicUser } from "@/backend/modules/auth.service"
import { apiError, apiSuccess } from "@/backend/utils/error-codes"
import { isGoogleOAuthConfigured } from "@/backend/adapters/oauth.adapter"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req)
    if (!ctx) {
      return apiSuccess({
        authenticated: false,
        user: null,
        availableWorkspaces: [],
        providers: { google: isGoogleOAuthConfigured() },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        mentorProfile: { select: { id: true } },
        ambassadorProfile: { select: { id: true, status: true, referralCode: true } },
      },
    })
    if (!user) {
      return apiSuccess({
        authenticated: false,
        user: null,
        availableWorkspaces: [],
        providers: { google: isGoogleOAuthConfigured() },
      })
    }

    const workspaces: Array<{
      roleKey: string
      label: string
      organizationId: string | null
      organizationName?: string
    }> = [
      { roleKey: "participant", label: "Participant / Student", organizationId: null },
    ]

    if (user.mentorProfile) {
      workspaces.push({ roleKey: "mentor", label: "Mentor Workspace", organizationId: null })
    }
    if (user.ambassadorProfile) {
      workspaces.push({
        roleKey: "campus_ambassador",
        label: `Campus Ambassador (${user.ambassadorProfile.referralCode})`,
        organizationId: null,
      })
    }
    for (const m of ctx.memberships) {
      workspaces.push({
        roleKey: m.roleKey,
        label: `${m.organizationName} (${m.roleKey.replace(/_/g, " ")})`,
        organizationId: m.organizationId,
        organizationName: m.organizationName,
      })
    }

    return apiSuccess({
      authenticated: true,
      csrfToken: ctx.csrfToken,
      user: sanitizePublicUser(user, ctx.activeRole, ctx.activeOrganizationId),
      availableWorkspaces: workspaces,
      providers: { google: isGoogleOAuthConfigured() },
    })
  } catch (err) {
    return apiError(err)
  }
}
