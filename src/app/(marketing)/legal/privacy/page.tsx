import { env } from "@/lib/env";

export const metadata = { title: "Privacy notice", alternates: { canonical: "/legal/privacy" } };

export default function PrivacyPage() {
  const c = env.company;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="display mt-3 text-4xl">Privacy notice</h1>
      <div className="prose-legal mt-6 text-ink-2">
        <p>
          RepairClock is operated by {c.name} (company number {c.number}), {c.address} (&ldquo;we&rdquo;). This notice explains how we handle personal data when you visit our
          website and when your organisation uses RepairClock. Contact: <a href={`mailto:${c.email}`}>{c.email}</a>.
        </p>

        <h2>Two roles</h2>
        <p>
          <strong>Your account data</strong> (your name, email, password hash, billing details, how you use the product): we are the <strong>controller</strong>.
        </p>
        <p>
          <strong>Case data your organisation records</strong> (tenant and landlord names and contact details, property addresses, case notes, photos, letters): your organisation is
          the controller and we act as its <strong>processor</strong>, processing it only to provide the service on your instructions. Our Data Processing Addendum forms part of the
          terms.
        </p>

        <h2>What we collect and why</h2>
        <ul>
          <li>Account and organisation details — to provide the service (contract).</li>
          <li>Billing information — handled by Stripe; we never see full card numbers (contract, legal obligation).</li>
          <li>Product usage events (e.g. &ldquo;case created&rdquo;) — to improve the product and support you (legitimate interests). Demo-workspace activity is flagged and excluded.</li>
          <li>Security logs and rate-limiting data — to protect the service (legitimate interests).</li>
          <li>Marketing-site analytics — anonymous counts of page and tool use (legitimate interests).</li>
        </ul>

        <h2>Sub-processors</h2>
        <p>We use a small number of providers to run RepairClock. Depending on configuration these are:</p>
        <ul>
          <li>Hosting and database (e.g. Vercel, a managed Postgres provider) — application hosting and storage.</li>
          <li>Resend — sending transactional email (letters to tenants, approval links, reminders).</li>
          <li>Stripe — subscription billing.</li>
          <li>
            Anthropic — only when your workspace uses &ldquo;Improve with AI&rdquo; on a letter. Tenant names, addresses, landlord and investigator names are removed before the text is
            sent; the AI suggestion is a draft you review.
          </li>
          <li>PostHog (EU) — product analytics, if enabled.</li>
        </ul>
        <p>Where a provider processes data outside the UK, we rely on UK adequacy regulations or the International Data Transfer Addendum.</p>

        <h2>Retention</h2>
        <p>
          We keep account and case data while your subscription is active. When you close your workspace we delete it within 30 days, except where we must keep records (such as
          invoices) by law. Demo workspaces are deleted automatically after 24 hours.
        </p>

        <h2>Security</h2>
        <p>
          Passwords are hashed (bcrypt). Sessions use random tokens stored only as hashes. Uploaded files are fingerprinted (SHA-256) and served only to signed-in members of the
          workspace. Landlord approval links are single-purpose, expire, and are stored only as hashes.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask for access to, correction or deletion of your personal data, object to or restrict processing, and ask for portability. If your data is in a workspace run by
          a letting agent or landlord, contact them first — they control that data. You can complain to the Information Commissioner&apos;s Office (ico.org.uk).
        </p>
        <p className="text-sm text-muted">Last updated: October 2026.</p>
      </div>
    </article>
  );
}
