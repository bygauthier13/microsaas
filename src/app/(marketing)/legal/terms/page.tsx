import { env } from "@/lib/env";

export const metadata = { title: "Terms of service", alternates: { canonical: "/legal/terms" } };

export default function TermsPage() {
  const c = env.company;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="display mt-3 text-4xl">Terms of service</h1>
      <div className="prose-legal mt-6 text-ink-2">
        <p>
          These terms are between {c.name} ({c.number ? `company number ${c.number}, ` : ""}{c.address}) and the organisation that creates a RepairClock workspace (&ldquo;you&rdquo;). By creating an
          account you confirm you can accept them on your organisation&apos;s behalf.
        </p>
        <h2>1. The service</h2>
        <p>
          RepairClock is software that helps landlords, letting agents and housing providers record damp, mould and hazard reports, calculate statutory timescales, produce letters
          and keep evidence. <strong>It is not legal advice</strong>, and it does not perform the statutory duties for you: you remain responsible for meeting your legal
          obligations and for the content of anything you issue. Calculations are based on the legislation, official guidance and GOV.UK bank holiday data as we understand them;
          check them for your circumstances.
        </p>
        <h2>2. Trial, plans and payment</h2>
        <ul>
          <li>New workspaces get a free trial. No card is required to start.</li>
          <li>Paid plans are billed monthly or annually in advance through Stripe. Prices exclude VAT.</li>
          <li>Plan limits (homes, team members) are shown on the pricing page. Archived homes that had a report in the last 12 months count towards the home limit. Each login is for one named person: don&apos;t share logins. We may suspend shared logins after telling you.</li>
          <li>You can cancel at any time; cancellation takes effect at the end of the paid period. We don&apos;t refund partial periods except where the law requires.</li>
        </ul>
        <h2>3. Your data</h2>
        <p>
          You own the data you put into RepairClock. You can export it at any time. We process case data as your processor under the Data Processing Addendum below and our{" "}
          <a href="/legal/privacy">privacy notice</a>. You confirm you have a lawful basis for the personal data you record, including tenant and landlord contact details.
        </p>
        <h2>4. Acceptable use</h2>
        <p>Don&apos;t misuse the service: no unlawful content, no attempts to access other workspaces, no automated scraping or load testing without our agreement.</p>
        <h2>5. Availability and changes</h2>
        <p>
          We aim for high availability but don&apos;t guarantee uninterrupted service. We may improve or change features; if a change materially reduces what you pay for, you may
          cancel and we&apos;ll refund any prepaid amount for the remaining period.
        </p>
        <h2>6. Liability</h2>
        <p>
          Nothing limits liability for death or personal injury caused by negligence, fraud, or anything that can&apos;t be limited by law. Otherwise, our total liability in any
          12 months is limited to the fees you paid in that period, and we aren&apos;t liable for indirect or consequential loss, or for losses arising from statutory duties you
          did not meet.
        </p>
        <h2>7. Data Processing Addendum (summary)</h2>
        <ul>
          <li>We process case data only on your documented instructions, to provide the service.</li>
          <li>Our staff are bound by confidentiality; we apply appropriate technical and organisational security measures.</li>
          <li>We use the sub-processors listed in the privacy notice and will tell you before adding new ones.</li>
          <li>We help you respond to data subject requests and notify you without undue delay of a personal data breach.</li>
          <li>On termination we delete or return case data, at your choice, within 30 days.</li>
        </ul>
        <h2>8. Law</h2>
        <p>These terms are governed by the law of Scotland, and the Scottish courts have jurisdiction.</p>
        <p className="text-sm text-muted">Last updated: October 2026.</p>
      </div>
    </article>
  );
}
