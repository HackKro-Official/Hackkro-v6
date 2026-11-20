import { NextRequest } from "next/server"
import prisma, { safeParseJson, toJsonString } from "@/lib/db"
import { requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"
import { sanitizePlainText, sanitizeUrl } from "@/backend/utils/sanitizer"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req, { allowRestricted: true })
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        profile: true,
        skills: { orderBy: { createdAt: "desc" } },
        portfolioProjects: { orderBy: { createdAt: "desc" } },
        resumes: { where: { isArchived: false }, orderBy: { createdAt: "desc" } },
        certificates: { orderBy: { issuedAt: "desc" } },
      },
    })
    if (!user) throw new AppError(ERROR_CODES.NOT_FOUND, "User not found.", 404)

    return apiSuccess({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
        primaryPhoneE164: user.primaryPhoneE164,
        bio: user.bio,
        country: user.country,
        timezone: user.timezone,
        locale: user.locale,
        points: user.points,
      },
      profile: user.profile
        ? {
            ...user.profile,
            languages: safeParseJson(user.profile.languagesJson, ["English"]),
            education: safeParseJson(user.profile.educationJson, []),
            experience: safeParseJson(user.profile.experienceJson, []),
            achievements: safeParseJson(user.profile.achievementsJson, []),
            interests: safeParseJson(user.profile.interestsJson, []),
          }
        : null,
      skills: user.skills,
      projects: user.portfolioProjects.map((p) => ({
        ...p,
        technologies: safeParseJson(p.technologiesJson, []),
      })),
      resumes: user.resumes,
      certificates: user.certificates,
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAuth(req)
    const body = await req.json()

    await prisma.$transaction(async (tx) => {
      if (body.displayName || body.bio !== undefined || body.timezone || body.locale) {
        await tx.user.update({
          where: { id: ctx.userId },
          data: {
            ...(body.displayName ? { displayName: sanitizePlainText(body.displayName, 120) } : {}),
            ...(body.bio !== undefined ? { bio: sanitizePlainText(body.bio, 1000) } : {}),
            ...(body.timezone ? { timezone: body.timezone } : {}),
            ...(body.locale ? { locale: body.locale } : {}),
          },
        })
      }

      await tx.profile.upsert({
        where: { userId: ctx.userId },
        update: {
          ...(body.headline !== undefined ? { headline: sanitizePlainText(body.headline, 180) } : {}),
          ...(body.summary !== undefined ? { summary: sanitizePlainText(body.summary, 2000) } : {}),
          ...(body.collegeName !== undefined ? { collegeName: sanitizePlainText(body.collegeName, 180) } : {}),
          ...(body.degree !== undefined ? { degree: sanitizePlainText(body.degree, 80) } : {}),
          ...(body.branch !== undefined ? { branch: sanitizePlainText(body.branch, 120) } : {}),
          ...(body.graduationYear !== undefined ? { graduationYear: String(body.graduationYear) } : {}),
          ...(body.experienceYears !== undefined ? { experienceYears: Number(body.experienceYears) || 0 } : {}),
          ...(body.location !== undefined ? { location: sanitizePlainText(body.location, 120) } : {}),
          ...(body.workAuthorization !== undefined ? { workAuthorization: sanitizePlainText(body.workAuthorization, 80) } : {}),
          ...(body.githubUrl !== undefined ? { githubUrl: sanitizeUrl(body.githubUrl) } : {}),
          ...(body.linkedinUrl !== undefined ? { linkedinUrl: sanitizeUrl(body.linkedinUrl) } : {}),
          ...(body.portfolioUrl !== undefined ? { portfolioUrl: sanitizeUrl(body.portfolioUrl) } : {}),
          ...(body.interests ? { interestsJson: toJsonString(body.interests) } : {}),
          ...(body.languages ? { languagesJson: toJsonString(body.languages) } : {}),
          ...(body.education ? { educationJson: toJsonString(body.education) } : {}),
          ...(body.experience ? { experienceJson: toJsonString(body.experience) } : {}),
        },
        create: {
          userId: ctx.userId,
          headline: body.headline || "",
          collegeName: body.collegeName || "",
          degree: body.degree || "B.Tech",
          branch: body.branch || "",
          graduationYear: String(body.graduationYear || "2026"),
        },
      })

      // Update self-declared skills (never overwrite higher assessed/verified provenance!)
      if (Array.isArray(body.skills)) {
        for (const sName of body.skills.map((s: string) => s.trim()).filter(Boolean)) {
          await tx.userSkill.upsert({
            where: { userId_name: { userId: ctx.userId, name: sName } },
            update: {},
            create: { userId: ctx.userId, name: sName, provenance: "self_declared" },
          })
        }
      }

      // Add portfolio project if provided
      if (body.addProject && body.addProject.title) {
        await tx.portfolioProject.create({
          data: {
            userId: ctx.userId,
            title: sanitizePlainText(body.addProject.title, 160),
            role: sanitizePlainText(body.addProject.role || "Developer", 80),
            description: sanitizePlainText(body.addProject.description || "", 2000),
            technologiesJson: toJsonString(body.addProject.technologies || []),
            projectUrl: sanitizeUrl(body.addProject.projectUrl),
            repoUrl: sanitizeUrl(body.addProject.repoUrl),
            contributionStatement: sanitizePlainText(body.addProject.contributionStatement || "", 800),
          },
        })
      }

      // Mark profile onboarding task complete if headline & skills set
      await tx.personalTask.updateMany({
        where: { userId: ctx.userId, sourceType: "profile", status: "pending" },
        data: { status: "completed", completedAt: new Date() },
      })
    })

    return apiSuccess({ message: "Profile saved successfully." })
  } catch (err) {
    return apiError(err)
  }
}
