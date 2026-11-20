import crypto from "crypto"
import { describe, expect, it } from "vitest"
import prisma from "@/lib/db"
import { submitApplication } from "@/backend/modules/applications.service"
import {
  createTeam,
  inviteTeamMember,
  lockTeamRoster,
  removeOrTransferTeamMember,
  respondToTeamInvite,
} from "@/backend/modules/teams.service"
import { createOrUpdateSubmission } from "@/backend/modules/events-submissions.service"
import {
  autosaveOrSubmitAttempt,
  issueCertificateRecord,
  recordProctorSignal,
  startAssessmentAttempt,
} from "@/backend/modules/assessments-judging.service"
import { createOrUpdateOpportunity } from "@/backend/modules/opportunities.service"
import { completeLessonWithCriteria, enrollAndTrackCourse, bookMentorSlotAtomic } from "@/backend/modules/learning-mentorship.service"
import {
  advanceOfferWorkflow,
  createJobRequisition,
  moveCandidateStage,
  scheduleInterviewWithConflictCheck,
} from "@/backend/modules/hiring.service"
import {
  createSupportTicketRecord,
  processPaymentWebhookEvent,
  requestOrApproveRefund,
  sanitizeMicrositeContent,
} from "@/backend/modules/ecosystem-platform.service"
import { createPaymentIntentAdapter, signPaymentWebhook } from "@/backend/adapters/payment.adapter"
import { buildAuthContextForEmail } from "../setup"

describe("Core End-to-End Platform Journeys", () => {
  it("runs student registration idempotency, team formation + removal access revocation, and submission versioning", async () => {
    const studentCtx = await buildAuthContextForEmail("student@hackkro.local")
    const mentorCtx = await buildAuthContextForEmail("mentor@hackkro.local")
    const organizerCtx = await buildAuthContextForEmail("organizer@hackkro.local")

    const op = await createOrUpdateOpportunity(organizerCtx, {
      organizationId: organizerCtx.activeOrganizationId!,
      title: `E2E Verification Sprint ${Date.now()}`,
      shortSummary: "End-to-end verification sprint.",
      fullDescription: "Full E2E test opportunity",
      type: "hackathon",
      category: "Cloud",
      status: "live",
      visibility: "public",
      teamMin: 1,
      teamMax: 3,
    })

    const idemKey = `idem-${Date.now()}`
    const firstApp = await submitApplication(studentCtx, {
      opportunityId: op.id,
      responses: { stack: "Next.js + Prisma" },
      idempotencyKey: idemKey,
      consentAccepted: true,
    })
    expect(firstApp.deduplicated).toBe(false)

    // Repeat with same idempotencyKey returns deduplicated without double row
    const retryApp = await submitApplication(studentCtx, {
      opportunityId: op.id,
      responses: { stack: "Next.js + Prisma" },
      idempotencyKey: idemKey,
      consentAccepted: true,
    })
    expect(retryApp.deduplicated).toBe(true)
    expect(retryApp.application.id).toBe(firstApp.application.id)

    // Team create, invite mentor user, accept, then remove -> access revoked immediately
    const team = await createTeam(studentCtx, {
      opportunityId: op.id,
      name: `Team Vitest ${Date.now().toString().slice(-4)}`,
    })
    const invite = await inviteTeamMember(studentCtx, {
      teamId: team.id,
      identifier: mentorCtx.primaryEmail!,
    })
    await respondToTeamInvite(mentorCtx, { teamId: team.id, accept: true })
    await removeOrTransferTeamMember(studentCtx, {
      teamId: team.id,
      memberId: invite.id,
      action: "remove",
    })

    // Removed member must immediately lose submission permission on that team!
    await expect(
      createOrUpdateSubmission(mentorCtx, {
        opportunityId: op.id,
        teamId: team.id,
        title: "Unauthorized Post-Removal",
        summary: "Should fail because removed from team.",
        contributionStatement: "Attempt after removal",
      })
    ).rejects.toThrow()

    await lockTeamRoster(studentCtx, team.id)

    const v1 = await createOrUpdateSubmission(studentCtx, {
      opportunityId: op.id,
      teamId: team.id,
      title: "Resilient Auth Engine",
      summary: "Zero trust RBAC + idempotent workflows.",
      contributionStatement: "Designed schema & core engine",
      repoUrl: "https://github.com/example/resilient-auth",
    })
    expect(v1.currentVersionNumber).toBe(1)

    const v2 = await createOrUpdateSubmission(studentCtx, {
      opportunityId: op.id,
      teamId: team.id,
      title: "Resilient Auth Engine v2",
      summary: "Added cryptographic signatures & proctor logs.",
      contributionStatement: "Added signatures & tests",
      repoUrl: "https://github.com/example/resilient-auth",
    })
    expect(v2.currentVersionNumber).toBe(2)

    await prisma.opportunity.delete({ where: { id: op.id } })
  })

  it("executes assessment answer-key stripping, coding sandbox execution, and proctoring escalation", async () => {
    const studentCtx = await buildAuthContextForEmail("student@hackkro.local")
    const assessment = await prisma.assessment.findFirst({ where: { isActive: true } })
    expect(assessment).toBeTruthy()

    // Ensure clean start on seeded assessment
    await prisma.assessmentAttempt.deleteMany({
      where: { assessmentId: assessment!.id, userId: studentCtx.userId },
    })

    const started = await startAssessmentAttempt(studentCtx, {
      assessmentId: assessment!.id,
      proctoringConsented: true,
      accommodationExtraMinutes: 10,
    })

    // Answer keys & hidden test cases MUST NEVER be sent to candidate client!
    expect(started.questions.length).toBeGreaterThan(0)
    expect((started.questions[0] as any).correctAnswerJson).toBeUndefined()
    for (const q of started.questions) {
      for (const tc of q.publicTestCases) {
        expect(tc.isHidden).toBeFalsy()
      }
    }

    await recordProctorSignal(studentCtx, {
      attemptId: started.attemptId,
      signalType: "tab_switch",
      details: { source: "e2e_test" },
    })

    const codingQ = started.questions.find((q) => q.format === "coding")
    const mcqQ = started.questions.find((q) => q.format === "mcq_single")
    const answers: Record<string, unknown> = {}
    if (mcqQ && mcqQ.options[0]) answers[mcqQ.id] = mcqQ.options[0].id
    if (codingQ) {
      answers[codingQ.id] = "function solution(nums) { return nums.reduce((a, b) => a + b, 0); }"
    }

    const result = await autosaveOrSubmitAttempt(studentCtx, {
      attemptId: started.attemptId,
      answers,
      submitFinal: true,
    })
    expect(result.submitted).toBe(true)
    expect(typeof result.score).toBe("number")
  })

  it("enforces explicit lesson quiz verification and atomic mentor double-booking lock", async () => {
    const studentCtx = await buildAuthContextForEmail("student@hackkro.local")
    const mentorCtx = await buildAuthContextForEmail("mentor@hackkro.local")

    const course = await prisma.course.findFirst({
      where: { published: true },
      include: { lessons: { orderBy: { orderIndex: "asc" } } },
    })
    expect(course).toBeTruthy()

    await enrollAndTrackCourse(studentCtx, { courseId: course!.id })
    const quizLesson = course!.lessons.find((l) => l.completionRule === "quiz_pass")
    if (quizLesson) {
      // Submitting wrong quiz answer must reject lesson completion
      await expect(
        completeLessonWithCriteria(studentCtx, {
          courseId: course!.id,
          lessonId: quizLesson.id,
          quizAnswers: { wrong: "bad" },
        })
      ).rejects.toThrow()
    }

    const mentorProfile = await prisma.mentorProfile.findUnique({ where: { userId: mentorCtx.userId } })
    const slot = await prisma.mentorSlot.create({
      data: {
        mentorId: mentorProfile!.id,
        startAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 73 * 60 * 60 * 1000),
        timezone: "Asia/Kolkata",
        status: "available",
      },
    })

    const booking = await bookMentorSlotAtomic(studentCtx, {
      slotId: slot.id,
      sessionType: "Architecture Review",
      topic: "Atomic slot locking verification",
    })
    expect(booking.id).toBeTruthy()

    // Second booking attempt for exact same slot MUST throw CONFLICT (409)
    await expect(
      bookMentorSlotAtomic(studentCtx, {
        slotId: slot.id,
        sessionType: "Architecture Review",
        topic: "Double booking attempt",
      })
    ).rejects.toThrow()

    await prisma.booking.delete({ where: { id: booking.id } })
    await prisma.mentorSlot.delete({ where: { id: slot.id } })
  })

  it("executes recruiter requisition -> stage move -> interview conflict check -> multi-step offer", async () => {
    const recruiterCtx = await buildAuthContextForEmail("recruiter@hackkro.local")
    const studentCtx = await buildAuthContextForEmail("student@hackkro.local")

    const { op, req } = await createJobRequisition(recruiterCtx, {
      organizationId: recruiterCtx.activeOrganizationId!,
      title: `E2E Platform Engineer ${Date.now()}`,
      shortSummary: "Build resilient distributed workflows.",
      fullDescription: "Full-stack TypeScript & PostgreSQL role.",
      employmentType: "full_time",
      department: "Platform",
      locationMode: "hybrid",
      locationText: "Bengaluru",
      salaryShared: true,
      salaryMin: 1800000,
      salaryMax: 2600000,
      skills: ["TypeScript", "PostgreSQL"],
    })

    const { application } = await submitApplication(studentCtx, {
      opportunityId: op.id,
      responses: { availability: "Immediate" },
      consentAccepted: true,
    })

    const moved = await moveCandidateStage(recruiterCtx, {
      applicationId: application.id,
      canonicalStage: "interview_1",
      reason: "strong_profile",
      privateNote: "CONFIDENTIAL_RECRUITER_INTERNAL_NOTE",
      participantNote: "Selected for Round 1 technical interview.",
    })
    expect(moved.canonicalStage).toBe("interview_1")

    const start = new Date(Date.now() + 96 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 45 * 60 * 1000)
    await scheduleInterviewWithConflictCheck(recruiterCtx, {
      applicationId: application.id,
      panelUserIds: [recruiterCtx.userId],
      scheduledStartAt: start.toISOString(),
      scheduledEndAt: end.toISOString(),
      timezone: "Asia/Kolkata",
    })

    // Overlapping interview for same candidate MUST be rejected with conflict
    await expect(
      scheduleInterviewWithConflictCheck(recruiterCtx, {
        applicationId: application.id,
        panelUserIds: [recruiterCtx.userId],
        scheduledStartAt: new Date(start.getTime() + 10 * 60 * 1000).toISOString(),
        scheduledEndAt: new Date(end.getTime() + 10 * 60 * 1000).toISOString(),
        timezone: "Asia/Kolkata",
      })
    ).rejects.toThrow()

    const offer = await advanceOfferWorkflow(recruiterCtx, {
      applicationId: application.id,
      action: "create_draft",
      compensationSummary: { base: "22 LPA" },
    })
    expect(offer.status).toBe("comp_approval")

    await prisma.opportunity.delete({ where: { id: op.id } })
  })

  it("verifies signed payment webhook idempotency, dual-approval high-value refund, XSS microsite sanitization, certificate & support ref", async () => {
    const studentCtx = await buildAuthContextForEmail("student@hackkro.local")
    const adminCtx = await buildAuthContextForEmail("admin@hackkro.local")
    const organizerCtx = await buildAuthContextForEmail("organizer@hackkro.local")

    const order = await prisma.paymentOrder.create({
      data: {
        orderNumber: `ORD-TEST-${Date.now()}`,
        userId: studentCtx.userId,
        organizationId: organizerCtx.activeOrganizationId,
        idempotencyKey: `idem-pay-${Date.now()}`,
        subtotalAmount: 600000, // 6000 INR (>= 5000 INR requires dual approval)
        discountAmount: 0,
        taxAmount: 108000,
        totalAmount: 708000,
        currency: "INR",
        status: "pending",
      },
    })

    const intent = createPaymentIntentAdapter(order)
    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: intent.provider,
        providerIntentId: intent.providerIntentId,
        status: "initiated",
      },
    })

    const payload = JSON.stringify({
      eventId: `evt_${crypto.randomBytes(6).toString("hex")}`,
      providerIntentId: intent.providerIntentId,
      providerPaymentId: `pay_${crypto.randomBytes(6).toString("hex")}`,
      status: "succeeded",
    })
    const sig = signPaymentWebhook(payload)

    const wh1 = await processPaymentWebhookEvent({
      rawBody: payload,
      signature: sig,
      ...JSON.parse(payload),
    })
    expect(wh1.idempotentReplay).toBe(false)
    expect(wh1.order.status).toBe("paid")

    // Idempotent replay does NOT double charge/double ledger
    const wh2 = await processPaymentWebhookEvent({
      rawBody: payload,
      signature: sig,
      ...JSON.parse(payload),
    })
    expect(wh2.idempotentReplay).toBe(true)

    const ledgerCount = await prisma.ledgerEntry.count({ where: { orderId: order.id } })
    expect(ledgerCount).toBe(2) // credit + tax only once!

    // High-value refund request + dual approval enforcement
    const rf = await requestOrApproveRefund(studentCtx, {
      orderId: order.id,
      amount: 600000,
      reason: "Schedule conflict",
      action: "request",
    })
    expect(rf.requiresDualApproval).toBe(true)

    const step1 = await requestOrApproveRefund(adminCtx, {
      orderId: order.id,
      amount: 600000,
      reason: "First admin approval",
      action: "approve",
      refundId: rf.id,
    })
    expect(step1.status).toBe("pending_second_approval")

    // Same admin cannot give second approval!
    await expect(
      requestOrApproveRefund(adminCtx, {
        orderId: order.id,
        amount: 600000,
        reason: "Self-second-approve attempt",
        action: "approve",
        refundId: rf.id,
      })
    ).rejects.toThrow()

    // Sanitized microsite strips unsafe script/event tags
    const sanitized = await sanitizeMicrositeContent([
      { id: "hero", type: "rich_text", title: "Safe Title", htmlContent: '<p>Welcome</p><script>alert("xss")</script>' },
    ])
    expect(sanitized[0].htmlContent).not.toContain("<script>")
    expect(sanitized[0].htmlContent).toContain("<p>Welcome</p>")

    // Support ticket generates HK-REF-* SLA reference ID
    const ticket = await createSupportTicketRecord(studentCtx, {
      email: studentCtx.primaryEmail!,
      category: "billing",
      priority: "high",
      subject: "Test SLA Reference",
      message: "Checking SLA tracking",
    })
    expect(ticket.referenceId).toMatch(/^HK-REF-/)

    // Certificate issuance
    const cert = await issueCertificateRecord(organizerCtx, {
      userId: studentCtx.userId,
      organizationId: organizerCtx.activeOrganizationId!,
      title: "E2E Excellence Award",
      achievementType: "winner",
      criteriaText: "Automated E2E verification award",
    })
    expect(cert.credentialId).toMatch(/^HK-/)

    await prisma.certificate.delete({ where: { id: cert.id } })
    await prisma.supportTicket.delete({ where: { id: ticket.id } })
    await prisma.paymentOrder.delete({ where: { id: order.id } })
  })
})
