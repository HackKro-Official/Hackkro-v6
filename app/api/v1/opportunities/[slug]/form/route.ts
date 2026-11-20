import { NextRequest } from "next/server"
import { z } from "zod"
import prisma, { toJsonString } from "@/lib/db"
import { assertPermission, requireAuth } from "@/backend/utils/rbac-abac"
import { apiError, apiSuccess, AppError, ERROR_CODES } from "@/backend/utils/error-codes"

export const dynamic = "force-dynamic"

const updateFormSchema = z.object({
  title: z.string().optional(),
  instructions: z.string().optional(),
  fields: z.array(
    z.object({
      sectionKey: z.string().default("general"),
      label: z.string().min(1),
      helpText: z.string().optional().default(""),
      fieldType: z.string().min(1),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional().default([]),
      validation: z.record(z.unknown()).optional().default({}),
      conditionalRule: z.record(z.unknown()).optional().default({}),
      profileMapping: z.string().optional().default(""),
      retentionClass: z.string().optional().default("standard"),
      exportName: z.string().optional().default(""),
      visibility: z.enum(["public", "internal"]).optional().default("public"),
      orderIndex: z.number().int().default(0),
    })
  ),
  eligibilityRule: z
    .object({
      countries: z.array(z.string()).optional(),
      minAge: z.number().int().nullable().optional(),
      educationLevels: z.array(z.string()).optional(),
      graduationYears: z.array(z.string()).optional(),
      institutions: z.array(z.string()).optional(),
      branches: z.array(z.string()).optional(),
      minExperienceYears: z.number().nullable().optional(),
      requiredSkills: z.array(z.string()).optional(),
      workAuthRequired: z.boolean().optional(),
      allowManualException: z.boolean().optional(),
    })
    .optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const op = await prisma.opportunity.findFirst({
      where: { OR: [{ slug: params.slug }, { id: params.slug }] },
      include: {
        registrationForm: { include: { fields: { orderBy: { orderIndex: "asc" } } } },
        eligibilityRules: true,
      },
    })
    if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)
    return apiSuccess({
      form: op.registrationForm,
      eligibilityRules: op.eligibilityRules,
    })
  } catch (err) {
    return apiError(err)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const ctx = await requireAuth(req)
    const op = await prisma.opportunity.findFirst({
      where: { OR: [{ slug: params.slug }, { id: params.slug }] },
    })
    if (!op) throw new AppError(ERROR_CODES.NOT_FOUND, "Opportunity not found.", 404)
    assertPermission(ctx, "form:manage", op.organizationId)

    const body = await req.json()
    const parsed = updateFormSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, parsed.error.errors[0]?.message, 400)
    }

    const updated = await prisma.$transaction(async (tx) => {
      const form = await tx.registrationForm.upsert({
        where: { opportunityId: op.id },
        update: {
          title: parsed.data.title || `${op.title} — Application Form`,
          instructions: parsed.data.instructions || "",
        },
        create: {
          opportunityId: op.id,
          title: parsed.data.title || `${op.title} — Application Form`,
          instructions: parsed.data.instructions || "",
        },
      })

      await tx.formField.deleteMany({ where: { formId: form.id } })
      if (parsed.data.fields.length > 0) {
        await tx.formField.createMany({
          data: parsed.data.fields.map((f, idx) => ({
            formId: form.id,
            sectionKey: f.sectionKey,
            label: f.label,
            helpText: f.helpText,
            fieldType: f.fieldType,
            required: f.required,
            optionsJson: toJsonString(f.options),
            validationJson: toJsonString(f.validation),
            conditionalRuleJson: toJsonString(f.conditionalRule),
            profileMapping: f.profileMapping,
            retentionClass: f.retentionClass,
            exportName: f.exportName || f.label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            visibility: f.visibility,
            orderIndex: f.orderIndex ?? idx,
          })),
        })
      }

      if (parsed.data.eligibilityRule) {
        await tx.eligibilityRule.deleteMany({ where: { opportunityId: op.id } })
        const r = parsed.data.eligibilityRule
        await tx.eligibilityRule.create({
          data: {
            opportunityId: op.id,
            countriesJson: toJsonString(r.countries || []),
            minAge: r.minAge ?? null,
            educationLevelsJson: toJsonString(r.educationLevels || []),
            graduationYearsJson: toJsonString(r.graduationYears || []),
            institutionsJson: toJsonString(r.institutions || []),
            branchesJson: toJsonString(r.branches || []),
            minExperienceYears: r.minExperienceYears ?? null,
            requiredSkillsJson: toJsonString(r.requiredSkills || []),
            workAuthRequired: Boolean(r.workAuthRequired),
            allowManualException: r.allowManualException ?? true,
          },
        })
      }

      return tx.registrationForm.findUnique({
        where: { id: form.id },
        include: { fields: { orderBy: { orderIndex: "asc" } } },
      })
    })

    return apiSuccess({ form: updated })
  } catch (err) {
    return apiError(err)
  }
}
