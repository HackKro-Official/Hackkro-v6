import { describe, expect, it } from "vitest"
import prisma from "@/lib/db"
import { assertPermission } from "@/backend/utils/rbac-abac"
import { switchWorkspaceContext } from "@/backend/modules/auth.service"
import { assignEvaluatorToSubmission, submitJudgeEvaluation } from "@/backend/modules/assessments-judging.service"
import { createOrUpdateOpportunity } from "@/backend/modules/opportunities.service"
import { searchConsentedTalent } from "@/backend/modules/hiring.service"
import { buildAuthContextForEmail } from "../setup"

describe("RBAC + ABAC Tenant Isolation & Trust Boundaries", () => {
  it("prevents Organization A organizer from mutating Organization B's opportunities", async () => {
    const organizerCtx = await buildAuthContextForEmail("organizer@hackkro.local")
    const recruiterOrg = await prisma.organization.findFirst({ where: { slug: "novatech-cloud" } })
    expect(recruiterOrg).toBeTruthy()

    expect(() => assertPermission(organizerCtx, "event:write", recruiterOrg!.id)).toThrow()

    await expect(
      createOrUpdateOpportunity(organizerCtx, {
        organizationId: recruiterOrg!.id,
        title: "Cross-Tenant Spoofed Listing",
        shortSummary: "Attempting cross-org mutation must fail.",
        fullDescription: "Must throw 403 Forbidden",
        type: "hackathon",
        category: "AI",
      })
    ).rejects.toThrow()
  })

  it("blocks unauthorized role escalation during switchWorkspaceContext", async () => {
    const studentCtx = await buildAuthContextForEmail("student@hackkro.local")
    const novatechOrg = await prisma.organization.findFirst({ where: { slug: "novatech-cloud" } })

    await expect(switchWorkspaceContext(studentCtx, "platform_admin", null)).rejects.toThrow()
    await expect(
      switchWorkspaceContext(studentCtx, "recruiter_admin", novatechOrg!.id)
    ).rejects.toThrow()
  })

  it("enforces privacy consent filtering & hidden email unless contactSharing is true", async () => {
    const recruiterCtx = await buildAuthContextForEmail("recruiter@hackkro.local")
    const novatechOrg = await prisma.organization.findFirst({ where: { slug: "novatech-cloud" } })

    const results = await searchConsentedTalent(recruiterCtx, novatechOrg!.id, {})
    const studentRow = results.find((r) => r.displayName.includes("Aarav"))
    expect(studentRow).toBeTruthy()
    // Seeded student has recruiterDiscovery=true, contactSharing=false -> email MUST be null!
    expect(studentRow!.contactEmail).toBeNull()
  })

  it("enforces judge self-review prevention and assignment-scoped access", async () => {
    const organizerCtx = await buildAuthContextForEmail("organizer@hackkro.local")
    const studentCtx = await buildAuthContextForEmail("student@hackkro.local")
    const judgeCtx = await buildAuthContextForEmail("judge@hackkro.local")

    const hackathon = await prisma.opportunity.findUnique({
      where: { slug: "hackkro-national-buildathon-2026" },
      include: { rubrics: true },
    })
    expect(hackathon).toBeTruthy()

    const ownSubmission = await prisma.submission.create({
      data: {
        opportunityId: hackathon!.id,
        userId: studentCtx.userId,
        title: "Aarav COI Test Project",
        status: "submitted",
      },
    })

    // Organizer cannot assign student to evaluate their own submission
    await expect(
      assignEvaluatorToSubmission(organizerCtx, {
        submissionId: ownSubmission.id,
        evaluatorId: studentCtx.userId,
      })
    ).rejects.toThrow()

    // Unassigned judge cannot evaluate a submission they are not assigned to
    await expect(
      submitJudgeEvaluation(judgeCtx, {
        submissionId: ownSubmission.id,
        rubricId: hackathon!.rubrics[0].id,
        criterionScores: { c1: 8 },
        evidenceNotes: "Unauthorized attempt",
        submitFinal: true,
        coiDeclared: true,
        coiHasConflict: false,
      })
    ).rejects.toThrow()

    await prisma.submission.delete({ where: { id: ownSubmission.id } })
  })
})
