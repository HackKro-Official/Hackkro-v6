export default function PrivacyPolicyPage() {
  return (
    <div className="container py-12 max-w-3xl space-y-5">
      <h1 className="text-3xl font-extrabold">HackKro Privacy Policy &amp; Data Protection (v3.0-2026)</h1>
      <p className="text-sm text-muted-foreground">
        Designed with purpose limitation, consent separation, data portability, and Digital Personal Data Protection alignment.
      </p>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-foreground">1. Purpose-Limited Collection</h2>
          <p>Personal details (education, resumes, eligibility criteria) are collected strictly to administer applications, assessments, and consented recruiter discovery.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-foreground">2. Separate Consent &amp; Controls</h2>
          <p>Marketing communications, recruiter talent discovery, and proctoring telemetry require separate explicit consent and can be managed anytime in Privacy Settings.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-foreground">3. Export &amp; Deletion</h2>
          <p>Users can download a machine-readable JSON export of their records or initiate account deletion from Privacy Settings.</p>
        </section>
      </div>
    </div>
  )
}
