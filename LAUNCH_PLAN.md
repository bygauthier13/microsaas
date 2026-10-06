# Launch plan

North star: **paying agencies with an active case in the last 30 days.** Secondary: activation rate (trial → first report + first summary/approval within 7 days).

## Week 0–1 (6–12 October 2026): go live and start conversations

| # | Action | Done when |
| --- | --- | --- |
| 1 | Point `repairclock.bygauthier.com` at Vercel (one CNAME); check SPF/DKIM/DMARC on bygauthier.com with Google's Check MX | Site loads on the subdomain; Check MX shows no warnings |
| 2 | Deploy to Vercel (14-day Pro trial, no card) + Neon (London); set `APP_URL`, `CRON_SECRET`, `COMPANY_*` | `/api/health` shows postgres + resend + stripe |
| 3 | Resend: verify `repairclock.bygauthier.com`, set `RESEND_API_KEY`, send yourself a written summary and an approval link | Both arrive, links work, replies reach your Gmail |
| 4 | Stripe: sandbox first, then live account, customer portal, webhook endpoint, `FOUNDING20` coupon | Test-mode then live checkout completes; portal cancels |
| 5 | Have a solicitor or Propertymark-savvy adviser read the written summary and delay notice templates and the terms/privacy notice | Changes merged |
| 6 | Build the prospect sheet: 200 agencies from the Scottish Letting Agent Register + Citylets, ranked by fit | 200 rows with decision-maker names |
| 7 | Start outreach from your bygauthier.com Gmail: 10 emails/day in week 1, rising to 30–40/day | 50 first emails by Friday |
| 8 | Post on LinkedIn: "A damp report received today must be investigated by Tue 20 Oct — here's how the working days fall" + calculator link | 1 post/day this week |
| 9 | Submit the calculator and Scotland guide to Google Search Console; request indexing | Indexed |

## Weeks 2–4 (13 October – 2 November): first 10 paying agencies

- No calls: emails link to the self-guided demo and the free trial (see `FIRST_10_CUSTOMERS.md`). Answer replies by email; import any CSV an agency emails you the same day.
- Daily: read the analytics funnel (SQL on `analytics_events`) — signups, onboarding, first case, summary issued, checkout.
- Automatic trial nudges handle follow-up ("log your first report" after a day, "import your homes" after three, trial-ending reminder). Personally email any trial that looks stuck.
- Content: "Christmas and New Year: how the bank holidays move your damp & mould deadlines" (calendar graphic + calculator) — publish by 1 Nov, send to every prospect.
- Partnerships: contact 20 Scottish damp & mould surveyors/maintenance firms; offer them a free agent account and a referral fee (one month free per referred agency).
- Associations: ask Propertymark Scotland and SAL about newsletter sponsorship or a member webinar ("running the 10-3-5 rule in practice").
- **Target by 2 November:** 10 paying agencies (~£800–£1,000 MRR), activation ≥ 60%.

## Month 2 (November): repeatable channel + England Phase 2

- Second pass of outreach to the full register (~1,000 agencies) with case studies from the first customers ("how [agency] issues written summaries in 2 minutes").
- Ship what the first customers ask for most (likely: branded sending domain, inbound email → case, contractor link).
- England: Awaab's Law Phase 2 starts **30 November 2026** — outreach to small English social landlords (< 1,000 homes; housing co-ops, almshouses, small HAs) for the Housing plan; the engine already supports Phase 1/2 hazard rules.
- SEO: one practical article per week on real searches ("written summary template damp mould Scotland", "damp mould delay notice letter", "Awaab's Law Scotland private landlords").
- **Target by 30 November:** 25 paying (~£2.5k MRR).

## Month 3 (December): retention and referrals

- Winter is peak damp/mould season — expect case volume to rise; watch digest engagement and evidence pack downloads.
- Ask every happy customer for one referral; landlord-facing "sent using RepairClock" footers should start producing inbound.
- Annual-plan push before the January price review (2 months free).
- **Target by 31 December:** 40 paying (~£4k MRR); monthly logo churn < 3%.

## Path to £10k MRR (months 4–12)

~80 agencies on Agent/Agency plans + a handful of Housing customers + the self-serve landlord tail (see `PRODUCT_STRATEGY.md` §9). Levers in order: outreach coverage of the whole register → partner referrals (surveyors, maintenance firms) → associations → SEO/calculator → England social landlords → England private sector when Awaab's Law extends.

## Metrics to watch weekly

| Metric | Target |
| --- | --- |
| First emails / week | 150–200 (after ramp-up) |
| Reply rate | ≥ 3% |
| Email → demo or calculator visit | ≥ 6% |
| Demo visit → trial | ≥ 25% |
| Trial activation (first report + summary/approval in 7 days) | ≥ 60% |
| Trial → paid | ≥ 40% of activated |
| Logo churn (monthly) | < 3% |
| Cases logged / paying agency / month | ≥ 3 (winter) |

## Kill / pivot criteria

- After **600 agencies emailed**, fewer than **3 paying** → the urgency isn't there; interview the "no"s and re-position (e.g. towards social landlords or surveyors) before building anything new.
- Activation < 30% → onboarding or value problem; sit with three trials and watch them use it.
- If a major CRM ships equivalent statutory clocks: double down on the landlord approval loop, letters and evidence; offer an integration.
