# HackKro Integrations, Security & Environment Setup

## 1. Local Quickstart (Zero External Credentials Required)

```bash
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. All core workflows work out of the box using:
- Local ACID SQLite database (`prisma/dev.db`)
- Local private filesystem upload adapter (`./storage/uploads` served via RBAC-authorized `/api/v1/files/[id]/download`)
- Explicit Sandbox mode for Email OTP, SMS OTP, Payment Intents/Webhooks, and JavaScript Coding Sandbox (`vm` isolated context) — clearly labeled as sandboxed when provider keys are unset.

## 2. Environment Variables Reference (`.env.example`)

| Variable | Purpose | Production Requirement |
| --- | --- | --- |
| `DATABASE_URL` | Prisma connection string | PostgreSQL TLS URI in production |
| `SESSION_SECRET` / `CSRF_SECRET` / `WEBHOOK_SIGNING_SECRET` / `PAYMENT_WEBHOOK_SECRET` | Cryptographic HMAC signing & session binding | Minimum 32 random hex/base64 chars in production |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REDIRECT_URI` | Real Google OpenID Connect (PKCE + state + nonce) | Optional; hides/disables Google sign-in button automatically if unconfigured |
| `EMAIL_PROVIDER` (`sandbox` \| `smtp`), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Transactional OTP, password reset, and alerts | Configure SMTP or transactional email API in production |
| `SMS_PROVIDER` (`sandbox` \| `twilio`), `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | E.164 SMS OTP verification | Configure Twilio or equivalent SMS gateway |
| `PAYMENT_PROVIDER` (`sandbox` \| `stripe` \| `razorpay`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Ticket & fee checkout | Configure provider secret + webhook endpoint |
| `STORAGE_PROVIDER` (`local` \| `s3`), `UPLOAD_MAX_BYTES` | Resumes, project ZIPs, submission decks | Switch to S3-compatible bucket with signed URLs |

**Security Rule**: HackKro never invents dummy credentials or claims an external email/SMS/charge was delivered live when running in `sandbox` mode; any sandbox codes are strictly gated behind `APP_ENV=development` and missing provider configuration.

## 3. Verification Seeded Persona Accounts

All seeded accounts share the development passphrase **`HackKroPass!2026`**:

| Persona Role | Email | Workspace Dashboard |
| --- | --- | --- |
| Student + Campus Ambassador (`HK-AARAV-2026`) | `student@hackkro.local` | `/dashboard` & `/campus-ambassador/dashboard` |
| Event Organizer (`HackKro Innovation Labs`) | `organizer@hackkro.local` | `/organizer/dashboard` |
| Recruiter Admin (`NovaTech Cloud`) | `recruiter@hackkro.local` | `/recruiter` |
| Judge / Evaluator | `judge@hackkro.local` | `/judge` |
| Industry Mentor | `mentor@hackkro.local` | `/mentorship` |
| College Placement Admin (`NIT Surathkal`) | `college@hackkro.local` | `/institution` |
| Platform Administrator | `admin@hackkro.local` | `/admin/dashboard` |

## 4. Running Tests & Production Build

```bash
npx tsc --noEmit     # Strict TypeScript check
npm test             # Vitest auth, RBAC+ABAC, E2E journeys, and UI accessibility suite
npm run build        # Next.js production bundle build
```
