import { NextRequest } from "next/server"
import { z } from "zod"
import prisma, { toJsonString } from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { resolveDashboardForRole } from "@/backend/modules/auth.service"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

const onboardingSchema = z.object({
  primaryIntent: z.enum(["student", "recruiter", "organizer", "mentor", "college", "ambassador"]),
  collegeName: z.string().trim().optional(),
  degree: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  graduationYear: z.string().trim().optional(),
  skills: z.array(z.string().trim()).optional(),
  interests: z.array(z.string().trim()).optional(),
  organizationName: z.string().trim().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()
    const parsed = onboardingSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }

    const data = parsed.data

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: ctx.userId },
        data: {
          primaryIntent: data.primaryIntent,
          onboardingCompleted: true,
        },
      })

      await tx.profile.upsert({
        where: { userId: ctx.userId },
        update: {
          ...(data.collegeName ? { collegeName: data.collegeName } : {}),
          ...(data.degree ? { degree: data.degree } : {}),
          ...(data.branch ? { branch: data.branch } : {}),
          ...(data.graduationYear ? { graduationYear: data.graduationYear } : {}),
          ...(data.interests ? { interestsJson: toJsonString(data.interests) } : {}),
        },
        create: {
          userId: ctx.userId,
          collegeName: data.collegeName || "",
          degree: data.degree || "B.Tech",
          branch: data.branch || "",
          graduationYear: data.graduationYear || "2026",
          interestsJson: toJsonString(data.interests || []),
        },
      })

      if (data.skills) {
        for (const sk of data.skills.filter(Boolean)) {
          await tx.userSkill.upsert({
            where: { userId_name: { userId: ctx.userId, name: sk } },
            update: {},
            create: { userId: ctx.userId, name: sk, provenance: "self_declared" },
          })
        }
      }
    })

    return apiSuccess({
      onboardingCompleted: true,
      destination: resolveDashboardForRole(ctx.activeRole, data.primaryIntent),
    })
  } catch (err) {
    return apiError(err)
  }
}
