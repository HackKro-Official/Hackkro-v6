export default function TermsPage() {
  return (
    <div className="container py-12 max-w-3xl space-y-5">
      <h1 className="text-3xl font-extrabold">HackKro Terms of Service (v3.0-2026)</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: November 2026. HackKro operates as an independent multi-sided opportunity, competition, learning, mentorship, and hiring ecosystem.
      </p>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-foreground">1. Accounts &amp; Honest Representation</h2>
          <p>Participants maintain one person-level identity across roles. Do not misrepresent verified skills, institutional affiliation, or submission authorship.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-foreground">2. Fairness &amp; Assessments</h2>
          <p>Automated proctoring signals and similarity checks serve as human review indicators, never automatic irreversible guilt determinations. Participants retain appeal rights.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="text-base font-bold text-foreground">3. Fees, Refunds &amp; Disputes</h2>
          <p>Paid event tickets and mentorship bookings display itemized fees, taxes, and refund policies prior to checkout.</p>
        </section>
      </div>
    </div>
  )
}
