# RepairClock

**Statutory damp & mould deadline tracking for UK letting agents and landlords.**

From **6 October 2026**, the Investigation and Commencement of Repair (Scotland) Regulations 2026 (SSI 2026/173) put a legal clock on every damp or mould report in a Scottish rented home — private *and* social:

| Duty | Deadline |
| --- | --- |
| Investigation by a competent person | 10 working days after the landlord becomes aware |
| Written summary of findings to the tenant | 3 working days after the investigation |
| Repair work begins (if substantial damp/mould) | 5 working days after the investigation |
| Repair completed | Social: 20 working days · Private: as soon as reasonably practicable |

Letting agents receive the reports, wait on landlords for approval, book contractors and write the letters — usually from an inbox and a spreadsheet. RepairClock turns each report into a case with live statutory clocks (Scottish/English working days and bank holidays), a one-click landlord approval link, drafted tenant letters (written summary, delay notice), a morning digest and a tribunal-ready evidence pack. England's Awaab's Law timescales (social housing; benchmark for private lets) are supported too.

See [`PRODUCT_STRATEGY.md`](PRODUCT_STRATEGY.md) for why this was chosen, [`FIRST_10_CUSTOMERS.md`](FIRST_10_CUSTOMERS.md) for how to sell it.

---

## Quick start (zero configuration)

Requirements: Node.js ≥ 20.9.

```bash
npm install
npm run dev            # http://localhost:3000
```

That's it — no database, email, Stripe or AI keys needed:

- **Database**: an embedded Postgres (PGlite) is created in `.data/pglite` and migrated automatically.
- **Email**: every email is recorded in the in-app **Sent emails** page (and the server console) instead of being delivered.
- **Billing**: *simulated* mode — choosing a plan activates it instantly, cancel/resume work, no card.
- **AI drafting**: off; letters are drafted from deterministic templates.

### Try it in 60 seconds

1. Open http://localhost:3000 → **Explore the live demo** (`/demo`) → *Open the demo workspace*. No sign-up: a private, fictional Edinburgh agency with 8 homes and 7 cases at every stage (one overdue, one with a written summary due today, one waiting on landlord approval, one protected by a delay notice…). Demo workspaces are flagged `is_demo`, never send email, can't be billed, and are deleted after 24 hours.
2. Or create a real account at `/signup` → onboarding (2 questions) → log your first report → record the investigation → issue the written summary → send a landlord approval link (it appears in the success message and the outbox; open it in a private window) → start repairs → download the evidence pack.
3. `/app/billing` → choose a plan (simulated) → cancel → resume.

There are no fixed demo credentials: the demo is one click, and real accounts are created by sign-up.

---

## Tech stack

- **Next.js 16** (App Router, Server Actions, Turbopack, `proxy.ts`), **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Postgres** via **Drizzle ORM** — node-postgres when `DATABASE_URL` is set, embedded **PGlite** otherwise; SQL migrations in `./drizzle`
- **Stripe** (Checkout, Customer Portal, webhooks), **Resend** (email), **Anthropic** (optional AI drafting), optional **PostHog**
- **pdf-lib** + embedded IBM Plex Sans for letters and evidence packs
- **Vitest** (rules engine, billing webhooks, daily job, redaction) and **Playwright** (end-to-end journeys, desktop + mobile)

## Environment variables

Copy `.env.example` to `.env.local`. Every service is optional locally; values of `replace_me` are treated as unset.

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Public base URL used in emailed links and Stripe redirects |
| `DATABASE_URL` | Postgres connection string. Empty → embedded PGlite (single process, dev/demo only) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Real email delivery. Without a key, emails go to the outbox |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Real (test-mode) billing. Without a key → simulated billing |
| `STRIPE_PRICE_<PLAN>_<MONTHLY\|ANNUAL>` | Price ids per plan (`npm run stripe:setup` prints them) |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Customer Portal configuration (also printed by the setup script) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Enables "Improve with AI" on written summaries (default model `claude-opus-5-5`) |
| `POSTHOG_KEY`, `POSTHOG_HOST` | Optional mirroring of product events |
| `CRON_SECRET` | Required in production to call `/api/cron/daily` |
| `COMPANY_NAME`, `COMPANY_NUMBER`, `COMPANY_ADDRESS`, `SUPPORT_EMAIL` | Legal entity shown on the privacy notice and terms |
| `DEMO_ENABLED`, `SIGNUP_RATE_LIMIT`, `BILLING_MODE`, `ALLOW_SIMULATED_BILLING` | Operational switches (see `.env.example`) |

## Scripts

```bash
npm run dev            # dev server
npm run build && npm start
npm test               # unit + integration tests (Vitest) — 35 tests
npm run test:e2e       # Playwright journeys (starts a dev server on :3100 if none is running)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run db:migrate     # apply migrations (DATABASE_URL or embedded DB)
npm run db:reset-local # delete the embedded database
npm run cron:daily     # run the daily job once (digests, reminders, cleanup)
npm run stripe:setup   # create Stripe products/prices/portal config (test key)
```

To run the E2E suite against an already running server: `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.
The embedded database is single-process: stop `next dev` before running a CLI script against it (a lock file makes a second process fail fast with a clear message), or call the HTTP endpoint (e.g. `GET /api/cron/daily`) instead.

## Deployment (Vercel + Neon, ~20 minutes)

1. **Database**: create a Postgres database (Neon/Supabase, EU or UK region) and set `DATABASE_URL`. Migrations run automatically on first request (`DB_AUTO_MIGRATE=true`), or run `npm run db:migrate` with the env var set.
2. **Vercel**: import the repo, set the env vars above (`APP_URL=https://your-domain`), deploy. `vercel.json` schedules `/api/cron/daily` at 06:00 UTC daily; set `CRON_SECRET` (Vercel sends it as a Bearer token).
3. **Email**: verify your sending domain in Resend; set `RESEND_API_KEY` and `EMAIL_FROM`.
4. **Stripe** (below), then set `COMPANY_*` legal details.
5. Check `GET /api/health` — it reports database, email, billing and AI modes (no secrets).

Any Node host works too (`npm run build && npm start`); schedule `npm run cron:daily` (or `curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/daily`) once a day.

## Stripe setup (test mode)

1. `STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup` — creates one product per plan with monthly and annual GBP prices (tax-exclusive) and a Customer Portal configuration, and prints the `STRIPE_PRICE_*` / `STRIPE_PORTAL_CONFIGURATION_ID` lines. Safe to re-run.
2. Webhook: in the Stripe dashboard add an endpoint `https://your-domain/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and set `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Test card `4242 4242 4242 4242`. The success page also syncs the subscription directly from the Checkout Session, so plans show as active even before the webhook arrives.
4. Going live: swap to live keys and re-run the setup script with `CONFIRM_LIVE=yes`.

Plans (GBP, excl. VAT; annual = 10× monthly): Landlord £12 (10 homes, 1 seat) · Agent £99 (300 homes, 5 seats) · Agency £249 (1,500 homes, 15 seats) · Housing £499 (5,000 homes, 50 seats). 14-day free trial (300 homes, no card).

## AI drafting

With `ANTHROPIC_API_KEY` set, the written summary editor shows **Improve with AI** (plain English / shorter / more formal). Implementation: `src/lib/ai/draft.ts`.

- Tenant names, addresses, postcodes, contact details, landlord and investigator names are replaced with tokens before the request and restored afterwards (`src/lib/ai/redact.ts`, unit tested).
- Model `claude-opus-5-5` with adaptive thinking and explicit `effort: "medium"`, streamed; **server-side refusal fallbacks are enabled** (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`), so a policy decline is retried on Anthropic's recommended fallback model within the same call.
- `stop_reason` is checked (`refusal`, `max_tokens`) before reading content; typed SDK errors map to friendly messages; the user's draft is never overwritten on failure; output is always a draft the user reviews. Rate-limited per workspace.

## Architecture

```
src/
  app/
    (marketing)/        landing, pricing, /scotland & /england guides, /tools/deadline-calculator, /demo, legal
    (auth)/             login, signup, forgot/reset password
    app/                authenticated product: dashboard, cases, homes, landlords, outbox, settings, billing
    approve/[token]     public one-time landlord approval page (no login)
    invite/[token]      team invitation acceptance
    api/                evidence pack + document download, CSV export, Stripe webhook, cron, health, track beacon
  lib/
    rules/              ⭐ statutory engine: working days, GOV.UK bank holidays 2025–28 (+ algorithmic fallback),
                        Scotland & England duties, statuses, delay handling, compensation — pure + unit tested
    cases/              read models (service.ts) and write workflows (workflow.ts)
    actions/            server actions (validated inputs, org-scoped queries, rate limits)
    docs/               letter drafting (letters.ts), content checklist, PDF rendering (pdf.ts)
    ai/                 optional AI drafting + redaction
    billing/            plans & access rules, Stripe integration
    email/              Resend sender with outbox fallback, HTML/text templates
    jobs/daily.ts       digests, landlord reminders, trial emails, demo cleanup, housekeeping
    demo/seed.ts        isolated demo workspace generator
    db/                 Drizzle schema + client (Postgres or PGlite)
  proxy.ts              optimistic auth redirect (real checks happen server-side on every request)
```

**Data model**: organizations (plan, Stripe ids, settings, `is_demo`) → memberships → users; landlords; properties (nation + sector decide the law); cases (dates of each statutory step); case_delays; **case_events (append-only audit log)**; documents (bytes in Postgres, SHA-256 fingerprint); approval_requests & invitations (hashed one-time tokens); outbox_emails; analytics_events; rate_limits; stripe_events (webhook idempotency).

**Security**: bcrypt passwords; random session tokens stored only as SHA-256 hashes in httpOnly SameSite cookies; every query scoped by the session's organisation; server actions validate all input (and Next.js checks the Origin); DB-backed rate limits on sign-up, login, password reset, approvals, demo creation, uploads, AI and evidence packs; uploads type-checked by magic bytes and served with `nosniff` (+ sandbox CSP for images); approval/invite/reset tokens hashed, expiring, single-use; CSV export neutralises formula injection; Stripe webhooks signature-verified and idempotent; production CSP, HSTS, frame denial; secrets only read server-side.

**Analytics** (`analytics_events` table, optional PostHog): `signup_completed`, `onboarding_completed`, `first_case_created` (activation), `case_created`, `investigation_recorded`, `summary_drafted`, `summary_issued`, `delay_notice_issued`, `approval_requested/responded`, `repair_commenced/completed`, `evidence_pack_downloaded`, `checkout_started`, `subscription_activated/canceled`, `payment_failed`, `member_invited/joined`, `demo_started`, `calculator_used`, `pricing_viewed`. Demo events are flagged and excluded from PostHog.

## Testing

- `npm test` — 35 Vitest tests: working-day arithmetic against official holidays (incl. St Andrew's Day, the 2026 World Cup holiday and the Christmas cluster), Scotland/England duty evaluation, compensation, deterministic date formatting, AI redaction, Stripe webhook signature/idempotency/subscription sync, and the daily job (digest, reminder link rotation, demo deletion, weekend skip).
- `npm run test:e2e` — 7 Playwright journeys: full agent journey (sign-up → onboarding → report → investigation → summary → landlord approval in a second browser → repairs → upload → evidence pack → CSV → sign-out → protected routes), demo workspace, simulated billing upgrade/cancel/resume, error states & access control (incl. input preserved after validation errors), team invitation, and a mobile pass that asserts no horizontal scrolling. The suite passes against both `next dev` and a production build (`next start`).

## Known limitations

- **Not legal advice.** Timescales follow the Regulations, Scottish Government guidance and GOV.UK bank holidays as implemented in `src/lib/rules`; local holidays (e.g. Edinburgh autumn holiday) aren't counted as they aren't statutory bank holidays. England private-rented timescales are a labelled benchmark until Awaab's Law is extended.
- Bank holidays are official to the end of 2028; later years use the statutory pattern and should be refreshed from GOV.UK.
- One workspace per user; no SSO; members have full case access (owner-only settings, billing and team).
- Files are stored in Postgres (8 MB per file) — fine for an MVP; move to object storage (S3/R2) at scale. HEIC photos are stored but not embedded in evidence packs (JPEG/PNG are).
- No CRM integrations yet (Reapit/Alto/Arthur) — CSV import only. No tenant-facing portal; tenants receive letters by email/post.
- Emails to tenants are sent from the RepairClock domain with the agency as reply-to; custom sending domains per agency aren't supported yet.
- The embedded PGlite database is for local development and demos only; use Postgres in production.
- AI drafting requires an Anthropic key and is untested against the live API in this build (the code path, redaction and failure handling are tested).
- Privacy notice and terms are practical drafts — have them reviewed and fill in `COMPANY_*` before launch.
