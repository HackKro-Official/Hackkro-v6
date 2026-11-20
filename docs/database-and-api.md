# HackKro Database Schema, Migrations & REST API Contracts

## 1. Dual-Schema ACID Database Architecture

HackKro uses **Prisma ORM 5.22.0** with two synchronized schemas:

- `prisma/schema.prisma`: **SQLite (`prisma/dev.db`)** configured for zero-external-service local development, transactional testing, and instant evaluation.
- `prisma/schema.postgres.prisma`: Production **PostgreSQL** schema mirror with full relational foreign keys, unique constraints, and composite indexes.
- `prisma/migrations/0001_init/migration.sql`: Initial deterministic SQL DDL migration generated cleanly from the schema.

### Core Domain Tables (50+ Models)

1. **Identity & Security**: `User`, `PasswordCredential`, `ExternalIdentity`, `Session`, `OtpChallenge`, `PasswordResetToken`, `ConsentRecord`, `AuditEvent`, `EmailDeliveryLog`
2. **RBAC + ABAC & Organizations**: `Organization`, `OrganizationMembership`, `OrganizationInvite`, `RolePermissionOverride`
3. **Profiles, Privacy & Tasks**: `Profile`, `PrivacySettings`, `UserSkill`, `EducationEntry`, `ExperienceEntry`, `ProjectEntry`, `ResumeVersion`, `PersonalTask`, `SavedItem`, `SearchHistory`
4. **Opportunities, Forms & Eligibility**: `Opportunity`, `OpportunityVersion`, `Round`, `RegistrationForm`, `FormField`, `EligibilityRule`, `TicketTier`, `Coupon`
5. **Applications, Teams & Submissions**: `Application`, `ApplicationStatusHistory`, `EligibilityExceptionRequest`, `Team`, `TeamMember`, `TeamActivityLog`, `CheckIn`, `IncidentEvent`, `Submission`, `SubmissionVersion`, `FileAsset`
6. **Assessments, Coding Sandbox & Judging**: `Assessment`, `Question`, `AssessmentAttempt`, `ProctorEvent`, `Rubric`, `JudgeAssignment`, `Evaluation`, `Certificate`
7. **Learning, Practice & Mentorship**: `Course`, `Cohort`, `Lesson`, `Enrollment`, `PracticeItem`, `PracticeAttempt`, `MockInterview`, `MentorProfile`, `MentorSlot`, `Booking`
8. **Recruiter ATS & Hiring**: `JobRequisition`, `CandidateStage`, `Interview`, `Scorecard`, `Offer`, `TalentPool`, `TalentPoolCandidate`, `SavedSearch`, `OutreachCampaign`
9. **Institutions, Ambassadors, Community & Governance**: `Institution`, `CampusCohort`, `PlacementDrive`, `AmbassadorProfile`, `ReferralEvent`, `CommunityGroup`, `CommunityPost`, `Microsite`, `Notification`, `MessageCampaign`, `PaymentOrder`, `PaymentTransaction`, `LedgerEntry`, `Refund`, `ModerationReport`, `SupportTicket`, `FeatureFlag`, `WebhookEndpoint`, `WebhookDelivery`, `AnalyticsEvent`

## 2. Switching to Production PostgreSQL

1. Provision PostgreSQL 15+ and set `DATABASE_URL` in `.env` (`postgresql://user:pass@host:5432/hackkro`).
2. Copy/generate Prisma client against the PostgreSQL mirror:
   ```bash
   npx prisma migrate deploy --schema=prisma/schema.postgres.prisma
   npx prisma generate --schema=prisma/schema.postgres.prisma
   ```
3. Run the deterministic seed script if bootstrapping a fresh staging database:
   ```bash
   npm run db:seed
   ```

## 3. REST API v1 Endpoints & Contracts

An interactive machine-readable OpenAPI 3.1 contract is served at **`GET /api/v1/openapi.json`**.

| Endpoint Group | Routes | Auth & CSRF Controls |
| --- | --- | --- |
| **Authentication** | `/api/v1/auth/identify`, `/login/password`, `/otp/request`, `/otp/verify`, `/register`, `/password/forgot`, `/password/reset`, `/logout`, `/logout-all`, `/sessions`, `/sessions/[sessionId]`, `/oauth/[provider]/start`, `/oauth/[provider]/callback`, `/link-identity`, `/identities/[identityId]`, `/me`, `/switch-workspace`, `/onboarding`, `/reauth` | HttpOnly rotating session cookie (`hackkro_session`) + double-submit `X-CSRF-Token` + `Sec-Fetch-Site` check + scrypt password hashing |
| **Marketplace & Applications** | `/api/v1/opportunities`, `/opportunities/[slug]`, `/opportunities/[slug]/form`, `/organizations`, `/recommendations`, `/applications`, `/applications/[id]`, `/participant/dashboard`, `/profile`, `/resumes`, `/privacy` | Server-side eligibility enforcement + idempotent application submission |
| **Teams & Live Events** | `/api/v1/teams`, `/events/[id]/operations`, `/submissions`, `/files/upload`, `/files/[id]/download` | Active membership guards, immediate removal revocation, magic-byte file verification |
| **Assessments, Judging & Credentials** | `/api/v1/assessments`, `/assessments/[id]/attempt`, `/judging`, `/certificates`, `/certificates/verify/[credentialId]` | Stripped client answer keys & hidden tests, blind review & COI enforcement, signed QR certificates |
| **Learning & Mentorship** | `/api/v1/courses`, `/practice`, `/mentorship` | Explicit quiz-gated completion, advisory AI disclaimers, transactional slot locks |
| **Recruiter ATS** | `/api/v1/recruiter/requisitions`, `/recruiter/pipeline`, `/recruiter/sourcing` | Cross-tenant ABAC isolation, interview conflict detection, dual-approval offer flow |
| **Ecosystem, Billing & Governance** | `/api/v1/institutions`, `/ambassadors`, `/community`, `/microsites`, `/notifications`, `/payments`, `/payments/webhook`, `/admin`, `/webhooks`, `/health` | HMAC signed webhooks, idempotent payment replay guard, append-only ledger, dual-approval refunds >= INR 5,000, audit trail |
