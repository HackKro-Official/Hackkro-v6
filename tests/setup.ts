import path from "path"
import prisma from "@/lib/db"
import { AuthContext } from "@/backend/utils/rbac-abac"
import { RoleKey } from "@/config/permissions"

// Ensure local SQLite DB path is always resolved cleanly during tests
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), "prisma/dev.db")}`
}
if (!process.env.APP_ENV) {
  process.env.APP_ENV = "development"
}

export async function buildAuthContextForEmail(email: string): Promise<AuthContext> {
  const user = await prisma.user.findUnique({
    where: { primaryEmail: email.toLowerCase() },
    include: {
      memberships: {
        where: { status: "active" },
        include: { organization: true },
      },
    },
  })
  if (!user) throw new Error(`Seeded test user ${email} not found. Run npm run db:seed first.`)

  const firstMembership = user.memberships[0]
  return {
    userId: user.id,
    sessionId: `test-sess-${user.id}`,
    csrfToken: "test-csrf-token",
    displayName: user.displayName,
    primaryEmail: user.primaryEmail,
    primaryPhoneE164: user.primaryPhoneE164,
    status: user.status,
    primaryIntent: user.primaryIntent,
    activeRole: (firstMembership?.roleKey || (user.primaryIntent === "mentor" ? "mentor" : "participant")) as RoleKey,
    activeOrganizationId: firstMembership?.organizationId ?? null,
    lastReauthAt: new Date(),
    locale: user.locale,
    timezone: user.timezone,
    memberships: user.memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.displayName,
      organizationSlug: m.organization.slug,
      organizationType: m.organization.type,
      verificationStatus: m.organization.verificationStatus,
      roleKey: m.roleKey as RoleKey,
      status: m.status,
      customPermissions: [],
    })),
  }
}
