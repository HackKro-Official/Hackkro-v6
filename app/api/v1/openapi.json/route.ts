import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "HackKro Platform API",
      version: "3.0.0",
      description:
        "Complete REST API for HackKro opportunities, identity, teams, assessments, judging, mentorship, hiring ATS, payments, and governance.",
    },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/auth/identify": { post: { summary: "Normalize identifier & return anti-enumeration next step" } },
      "/auth/login/password": { post: { summary: "Authenticate with email/phone and password" } },
      "/auth/otp/request": { post: { summary: "Request single-use cryptographic OTP challenge" } },
      "/auth/otp/verify": { post: { summary: "Verify OTP challenge and rotate session" } },
      "/auth/oauth/{provider}/start": { post: { summary: "Start OAuth 2.0 / OIDC login flow" } },
      "/auth/oauth/{provider}/callback": { get: { summary: "Handle OIDC callback with state & nonce validation" } },
      "/auth/password/forgot": { post: { summary: "Request single-use password reset link (neutral response)" } },
      "/auth/password/reset": { post: { summary: "Reset password and revoke all active sessions" } },
      "/auth/logout": { post: { summary: "Revoke current session and clear cookies" } },
      "/auth/logout-all": { post: { summary: "Revoke all active device sessions" } },
      "/auth/sessions": { get: { summary: "List active sessions and linked auth identities" } },
      "/auth/sessions/{sessionId}": { delete: { summary: "Revoke a specific device session" } },
      "/auth/link-identity": { post: { summary: "Link OAuth identity after re-authentication proof" } },
      "/auth/identities/{identityId}": { delete: { summary: "Unlink external auth identity" } },
      "/auth/switch-workspace": { post: { summary: "Switch active role/organization context server-side" } },
      "/opportunities": {
        get: { summary: "Search, filter, and paginate public & authorized opportunities" },
        post: { summary: "Create or update versioned opportunity listing" },
      },
      "/opportunities/{slug}": { get: { summary: "Opportunity details, eligibility check & state-aware CTA" } },
      "/applications": {
        get: { summary: "List participant applications or organizer-scoped applicants" },
        post: { summary: "Submit idempotent application with atomic capacity reservation" },
      },
      "/teams": {
        get: { summary: "List participant teams or open team collaboration workspace" },
        post: { summary: "Create team, invite, respond, lock roster, tasks & discussion" },
      },
      "/assessments": { get: { summary: "List or author multi-format assessments" } },
      "/assessments/{id}/attempt": { post: { summary: "Start, autosave, run code sandbox, record proctor signal, submit" } },
      "/judging": {
        get: { summary: "Fetch evaluator blind-mode assignments or organizer rubrics" },
        post: { summary: "Create weighted rubric, assign judge (COI-safe), submit evaluation" },
      },
      "/certificates/verify/{credentialId}": { get: { summary: "Public rate-limited credential & QR verification" } },
      "/courses": { get: { summary: "Course catalog & cohorts" }, post: { summary: "Enroll & complete lessons" } },
      "/practice": { get: { summary: "Practice catalog & analytics" }, post: { summary: "Attempt & AI-labeled mock interviews" } },
      "/mentorship": { get: { summary: "Mentor discovery & bookings" }, post: { summary: "Atomic slot booking & reviews" } },
      "/recruiter/requisitions": { get: { summary: "Recruiter ATS requisitions & candidates" }, post: { summary: "Create requisition" } },
      "/recruiter/pipeline": { post: { summary: "Stage moves, interview conflict check, scorecards, offers" } },
      "/recruiter/sourcing": { get: { summary: "Consent-aware talent search & pools" }, post: { summary: "Manage talent pools & outreach" } },
      "/institutions": { get: { summary: "College workspace, cohorts & placement drives" }, post: { summary: "Create cohort or drive" } },
      "/ambassadors": { get: { summary: "Ambassador referral performance" }, post: { summary: "Apply or track referral" } },
      "/payments": { get: { summary: "List orders & append-only ledger" }, post: { summary: "Create order, sandbox webhook, refund" } },
      "/payments/webhook": { post: { summary: "Verify HMAC signature & reconcile payment idempotently" } },
      "/admin": { get: { summary: "Admin & moderation workspace data" }, post: { summary: "Verify orgs, moderate, tickets, flags" } },
      "/health": { get: { summary: "Database & integration adapter health check" } },
    },
  }
  return NextResponse.json(spec, { headers: { "Cache-Control": "no-store" } })
}
