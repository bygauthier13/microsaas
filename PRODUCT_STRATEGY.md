# Product strategy — RepairClock

> **Decision:** build a statutory deadline system for damp & mould reports, sold first to **independent Scottish letting agents**, launched the day the Investigation and Commencement of Repair (Scotland) Regulations 2026 came into force (6 October 2026). Expand to small English social landlords (Awaab's Law Phase 2, 30 Nov 2026) and, when Awaab's Law reaches the private rented sector, to English letting agents.

## 1. The problem

From 6 October 2026 every damp or mould report in a Scottish rented home — private or social — carries enforceable deadlines: a competent person must **investigate within 10 working days** of the landlord becoming aware, the tenant must get a **written summary within 3 working days** of the investigation, and **repairs must begin within 5 working days** if there is substantial damp or mould. Social landlords must finish within 20 working days; private landlords as soon as reasonably practicable. If something outside your control gets in the way, you must give the tenant written notice (the duty, the reason, a revised timeframe) and take reasonable steps meanwhile — and keep records proving all of it.

In practice the **letting agent** receives the report (email, phone, WhatsApp, portal, an inspection, a contractor's comment), has to get the **landlord's approval** to spend money, find a **competent investigator and contractor** fast, write a written summary with specific required content, and later prove the timeline to a landlord, the First-tier Tribunal or an ombudsman. Today that runs on inboxes, diaries and spreadsheets. The failure modes are concrete and expensive:

- **Day-counting errors** — working days, "beginning with the day after", Scottish bank holidays (2 January, St Andrew's Day, one-offs like 15 June 2026), the Christmas cluster.
- **Approval latency** — landlords take days to answer emails; the legal clock doesn't stop.
- **Missing letter content** — a summary without an explicit "substantially free from damp and mould" conclusion or a repair start date; no delay notice, or one sent after the deadline.
- **No evidence** — when a tenant goes to the Tribunal (which can issue a Repairing Standard Enforcement Order), the agent has to reconstruct events from email threads.

The cost of failure: tribunal applications, enforcement orders and rent relief orders, compensation for social tenants (£15 + £3 per working day, up to £100 per duty), lost landlord clients (the agent "let the landlord down"), Propertymark/registration reputational risk, and — most importantly — tenants (often children) living with mould.

## 2. Customer

**Primary ICP — independent Scottish letting agencies managing ~80–1,500 homes**, 2–20 staff, typically in Edinburgh, Glasgow, Aberdeen, Dundee, Fife and the Lothians. The buyer is the director/owner or head of lettings; daily users are property managers. They already pay for a CRM (Reapit, Alto, Arthur, Goodlord, Fixflo for repairs), Propertymark/SAL membership, and compliance services — **budget exists and ROI is obvious**. There are roughly 900–1,000 registered letting agents in Scotland (889 approved on the Scottish Letting Agent Register by Feb 2020; the register is public — a ready-made lead list).

Secondary: self-managing Scottish landlords with several homes (£12/mo plan; ~240k registered Scottish landlords, low ARPU, self-serve via SEO), Scottish social landlords (~180), and English social landlords (~1,600, of which ~1,000 own fewer than 1,000 homes) on Awaab's Law.

## 3. Existing solutions and why they fall short

| Option | Why it falls short for an agent |
| --- | --- |
| Inbox + Outlook calendar + spreadsheet | No working-day/bank-holiday maths, no letter content, no landlord loop, no audit trail |
| General CRM / repairs tools (Reapit, Alto, Arthur, Fixflo) | Built for maintenance jobs, not statutory clocks; no Scottish 10-3-5 duties, delay notices or written-summary generator (none found marketing this as of Oct 2026) |
| ScotComply and similar | Broad Scottish letting compliance checklists (certificates, registrations); not case-level damp & mould clocks with letters |
| Aico HomeLINK | Sensor hardware + case dashboard aimed at (mostly social) landlords who buy the sensors |
| DampApp Pro / HousingSurvey Pro | Surveyor/inspection tools; DampApp offers a free Scotland timeline calculator |
| England Awaab's Law platforms (Plentific, Made Tech, SurveyMate, CHICS, Maintaro, HazardClock, Weightmans) | Built for English social landlords, procurement-led; not for a 300-home Edinburgh agent |

## 4. The wedge

**"Log the report in 30 seconds and never miss a statutory deadline — with the landlord's approval in one click and the tenant's letter written for you."**

The 20% of a housing-management platform that matters on 6 October 2026:

1. A correct statutory clock per report (the rules engine is the core IP: tested working-day maths with official GOV.UK holidays, Scotland private/social and England duties, delay handling, compensation).
2. The agent→landlord approval loop with the legal deadline shown to the landlord (the landlord holds the duty — the link makes that visible and puts their decision on the record).
3. Letters with the required content (written summary with a live content check; delay notice) as PDFs emailed and filed.
4. A morning digest and an append-only evidence pack.

Deliberately **not** built: tenant portal, contractor marketplace, job scheduling, accounting, CRM sync, native apps, sensors. Agents keep their CRM; RepairClock runs alongside it (CSV import).

## 5. Pricing (one primary model: per-workspace tiers by number of homes)

| Plan | Price (excl. VAT) | Homes | Seats | For |
| --- | --- | --- | --- | --- |
| Landlord | £12/mo | 10 | 1 | Self-managing landlords (SEO/self-serve) |
| **Agent** | **£99/mo** | 300 | 5 | **Core ICP** — independent agencies |
| Agency | £249/mo | 1,500 | 15 | Multi-branch agencies |
| Housing | £499/mo | 5,000 | 50 | Housing associations, co-ops, councils |

Annual = 10× monthly (2 months free). 14-day free trial, no card, 300 homes.

**Why this model:** agents think in "homes under management" (it's how they price their own services), so tiers by homes map to perceived value and grow automatically as they grow. Per-seat would discourage adding the property managers who actually use it; per-case would make cost unpredictable and discourage logging reports (the opposite of compliance). £99/mo is < 1 hour of a director's time per week and far below the cost of one tribunal application or one lost landlord client (an agent earns ~£80–£120/month in fees per managed home). A free trial without a card removes friction at the moment of regulatory panic; the trial is capped by time, not features, so agents experience the full workflow.

## 6. Evidence

- **Regulation:** SSI 2026/173 in force 6 October 2026 for private and social landlords; Scottish Government "Awaab's Law: guidance for landlords (Scotland)" sets out the 10/3/5 timescales, written summary content, exceptional circumstances notice and record keeping.
- **Industry signal:** Propertymark: "Agents managing homes on a landlord's behalf will be central to making sure these duties are met in practice" — it published a fact sheet and template for members (Sep 2026). Citylets, Bell Ingram and Aico published agent/landlord explainers in the run-up — demand for understanding, little tooling.
- **Willingness to pay is proven in the adjacent English market:** a cluster of paid Awaab's Law products for English social landlords (Plentific, Made Tech, SurveyMate, CHICS, HousingSurvey Pro, Maintaro, Weightmans' tool, HazardClock's waitlist) appeared within a year of Phase 1 (Oct 2025). The MHCLG-commissioned Phase 1 "test and learn" research reports landlords struggling with manual tracking and asking for clearer digital case stages and written-summary templates.
- **Gap:** no agent-focused Scottish product with clocks + landlord approvals + letters was found; the closest are a free calculator (DampApp Pro), broad compliance checklists (ScotComply) and sensor-led case management (Aico HomeLINK).

## 7. Why now, why 2026, why a solo founder can win

- **Why now:** the law started today. Agents need a process this week, before the first 10-working-day deadlines fall (≈20 October 2026) and before the Christmas holiday cluster compresses deadlines.
- **Why 2026:** modern tooling (Next.js, Postgres, Stripe, Resend, LLMs for drafting) makes a credible compliance product a one-person build; the regulation is new enough that incumbents haven't adapted for Scottish agents.
- **Why a solo founder:** the market is small and well-defined (≈1,000 agencies on a public register), reachable by direct outreach and associations; the product is narrow and self-serve; support load is low (deterministic rules, clear workflow); incumbents with enterprise sales motions can't profitably chase £99/mo customers.

## 8. Acquisition strategy

1. **Direct outreach to the Scottish Letting Agent Register** (email + LinkedIn + phone) with a personalised hook — "a report you receive today must be investigated by Tue 20 Oct" — and a 15-minute demo. See `FIRST_10_CUSTOMERS.md`.
2. **Free deadline calculator** (`/tools/deadline-calculator`) and the Scotland guide (`/scotland`) as SEO/link magnets for "Awaab's Law Scotland", "damp and mould 10 working days", "written summary template".
3. **Partnerships:** damp & mould surveyors and contractors (they see every agent's cases and benefit from faster approvals), Propertymark/SAL events, compliance consultants.
4. **Built-in referral loop:** every landlord who approves via a link and every tenant letter shows "Sent using RepairClock" — landlords with several agents ask the others to use it.

## 9. The £10k MRR maths

| Price point | Customers for £10k MRR | Realistic? |
| --- | --- | --- |
| £12 (Landlord) | 834 | No as a primary channel (low-ARPU SEO tail) |
| **£99 (Agent)** | **102** | **Yes — ~10% of Scottish agencies** |
| £249 (Agency) | 41 | Partly (fewer multi-branch agencies) |
| £499 (Housing) | 21 | Yes in England (Phase 2) — slower procurement |

**Most realistic mix (12–18 months):** 70 Agent (£6,930) + 8 Agency (£1,992) + 2 Housing (£998) + 40 Landlord (£480) = **£10,400 MRR**, i.e. ~80 agencies (8% of the Scottish register) plus a small self-serve tail. Gross margin ≈ 95% (hosting/DB ~£50–150/mo, email ~£20/mo, AI ~£0.05 per draft, Stripe ~1.5% + 20p).

Can one founder acquire ~80 agencies? Outreach maths: 1,000 agencies → 3 touches each over 6–8 weeks → 10–15% reply to a regulation-led, personalised message → ~100–150 conversations → 50% demo → 30–40% close ⇒ ~20–30 customers per full pass; repeated with referrals, partnerships and the English expansion, **yes**.

## 10. Retention — why they'll still pay in six months

Every new damp/mould report (several per month for a 300-home agency; seasonal peaks in winter) needs the clock, letters and approvals; the morning digest becomes the team's routine; the case archive and evidence packs accumulate (switching means losing the audit trail); and the legal duty doesn't go away. Cancelling = going back to spreadsheets under a statutory regime. Expansion: more homes → higher tier; more hazard types (England Phase 2/3).

## 11. Pain-killer test

| Question | Answer |
| --- | --- |
| Removes a painful task? | Working out deadlines, chasing landlords, writing the summary/delay letters, assembling evidence |
| Saves time? | ~30–60 min per case on letters, chasing and record-keeping |
| Prevents money being lost? | Tribunal orders, compensation, rent relief, lost landlord clients |
| Reduces risk? | Statutory compliance + auditable record |
| ROI understandable? | One avoided tribunal/lost client pays for years of the Agent plan |

## 12. Main risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Agents "make do" with spreadsheets | Regulation-led urgency; demo the delay-notice and evidence pack; founding-customer pricing |
| CRMs (Fixflo, Arthur, Reapit) add statutory clocks | Move fast, own the Scottish agent niche and the landlord-approval loop; integrate rather than compete |
| Legal interpretation errors | Rules engine with tests against hand-computed dates; sources cited; "not legal advice"; quick updates as guidance evolves |
| Small market | Expansion paths already built into the engine (England social Phase 2/3; England PRS when Awaab's Law extends: ~19k agencies) |
| Low report volume at small agencies | Price by homes (not cases); winter peaks; value of being audit-ready |
| AI drafting errors | AI is optional, output is a reviewed draft, personal data redacted, content checklist |

## 13. Why the other finalists were rejected

- **Certified payroll (US)** — strong pain and WTP, but entrenched incumbents (LCPtracker, eBacon, Miter, CertifiedPayrollPro), a free DOL WH-347 tool (Dec 2025), state-by-state complexity and US-only distribution. £10k test: 205 × £49 — plausible but slow and far from a UK founder's network.
- **Awaab's Law tooling for small English social landlords** — real and in force, but already crowded with funded/established vendors and procurement-led buying. Kept as **expansion** (the engine already supports it; Housing plan £499).
- **Companies House ID verification chaser** — urgent, but the transition ends 17 Nov 2026, so retention collapses after six weeks.
- **COI tracking** — proven market, but commoditised in 2026 (free broker-funded tools, $20/mo competitors).
- **Freight carrier vetting** — free tools cover most needs; many entrants; fraud arms race.
- **MTD ITSA bridging** — no late-submission penalties in year one, HMRC recognition required, crowded by accounting platforms.

## 14. Scoring

Each opportunity scored 1–10 on the brief's 15 criteria (10 = best for us, so "Competition" 10 = weak competition and "MVP" 10 = simplest). Weights favour **pain × money × distribution × speed**: Pain ×3, Willingness to pay ×3, Ease of reaching customers ×3; Frequency, Competition, Time to first revenue, Recurring revenue, Retention, Founder independence and 2026 tailwinds ×2; Market size, MVP complexity, Technical feasibility, Gross margin and Viral/referral ×1. Score = Σ(score × weight) / 28.

Legend: Pain = pain intensity · WTP = willingness to pay · Freq = frequency · Mkt = market size · Comp = competition (inverse) · Reach = ease of reaching customers · MVP = MVP simplicity · Tech = technical feasibility · TTFR = time to first revenue · Recur = recurring revenue · GM = gross margin · Ret = retention · Viral = viral/referral · Indep = founder independence · 2026 = 2026 tailwinds.

| # | Opportunity | Pain | WTP | Freq | Mkt | Comp | Reach | MVP | Tech | TTFR | Recur | GM | Ret | Viral | Indep | 2026 | **Score** | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Scottish damp & mould statutory deadline tracker for letting agents (RepairClock) | 9 | 8 | 8 | 5 | 8 | 8 | 7 | 9 | 8 | 9 | 9 | 9 | 6 | 8 | 10 | **8.25** | WINNER — new law in force 6 Oct 2026, thin agent-focused tooling, reachable register of agents |
| 2 | Awaab's Law case tracker for small English social landlords (<1,000 homes) | 8 | 8 | 7 | 5 | 4 | 6 | 7 | 9 | 5 | 9 | 9 | 9 | 4 | 7 | 8 | **7.07** | Absorbed as expansion — crowded (Plentific, Made Tech, SurveyMate, CHICS, HazardClock) and procurement-led |
| 3 | Certified payroll (WH-347) automation for US public-works subcontractors | 8 | 8 | 7 | 7 | 5 | 6 | 5 | 7 | 6 | 8 | 8 | 8 | 4 | 7 | 6 | **6.82** | Runner-up — real pain, but incumbents (LCPtracker, eBacon, Miter) + DOL free tool + US-only sales |
| 4 | Companies House ID-verification chaser for accountancy practices | 7 | 6 | 4 | 6 | 6 | 7 | 8 | 8 | 8 | 3 | 9 | 3 | 5 | 8 | 8 | **6.29** | Rejected — deadline 17 Nov 2026 then the pain largely ends; weak retention |
| 5 | Freight broker carrier vetting / fraud checks | 8 | 7 | 9 | 7 | 3 | 5 | 5 | 6 | 5 | 8 | 7 | 7 | 4 | 6 | 5 | **6.25** | Rejected — free tools cover most vetting; many funded entrants |
| 6 | Certificate-of-insurance (COI) tracking for contractors / property managers | 7 | 7 | 7 | 8 | 2 | 6 | 6 | 7 | 5 | 8 | 8 | 8 | 4 | 7 | 4 | **6.25** | Rejected — commoditised in 2026 (Checkmate free, BCS, SubDoc $20/mo, Billy) |
| 7 | WooCommerce checkout uptime monitoring | 6 | 5 | 6 | 6 | 2 | 6 | 7 | 8 | 6 | 8 | 9 | 7 | 4 | 8 | 3 | **5.89** | Rejected — 8+ near-identical 2026 entrants |
| 8 | Run-of-show / show timer software (stagetimer model) | 5 | 5 | 6 | 6 | 3 | 6 | 7 | 8 | 6 | 7 | 9 | 6 | 7 | 8 | 3 | **5.82** | Rejected — strong incumbents, low urgency |
| 9 | Trucking driver qualification file (DQF) manager | 6 | 6 | 6 | 6 | 3 | 5 | 6 | 7 | 5 | 8 | 8 | 8 | 3 | 7 | 3 | **5.75** | Rejected — FileFlo, RoadDocZ, Roadworthy HQ already cheap |
| 10 | Making Tax Digital (ITSA) bridging for UK landlords | 6 | 6 | 5 | 9 | 3 | 6 | 4 | 5 | 4 | 8 | 7 | 7 | 4 | 5 | 7 | **5.75** | Rejected — no year-one penalties, needs HMRC recognition, crowded with Xero/landlord apps |
| 11 | AI meeting minutes for municipalities | 6 | 6 | 7 | 6 | 2 | 4 | 6 | 7 | 4 | 8 | 7 | 8 | 5 | 6 | 5 | **5.68** | Rejected — ClerkMinutes 450+ councils, CivicPlus, Diligent; public procurement |
| 12 | Oil & gas safety audit app (BasinCheck model) | 7 | 7 | 6 | 4 | 6 | 3 | 5 | 7 | 4 | 8 | 8 | 8 | 3 | 5 | 3 | **5.64** | Rejected — narrow US niche, pilot-led sales |
| 13 | Restaurant supplier invoice price-creep alerts | 6 | 5 | 8 | 8 | 2 | 5 | 5 | 6 | 5 | 8 | 7 | 7 | 4 | 6 | 3 | **5.57** | Rejected — Kosto, KitchenIQ, Diced OS and others; low ARPU |
| 14 | Insurance agency COI issuance automation | 6 | 6 | 7 | 6 | 2 | 5 | 5 | 6 | 5 | 8 | 7 | 8 | 3 | 6 | 3 | **5.57** | Rejected — Certificate Hero, Cassidy, AMS vendors |
| 15 | Lookalike-domain / brand-impersonation monitoring for SMBs | 6 | 5 | 5 | 7 | 2 | 5 | 6 | 6 | 5 | 8 | 8 | 7 | 3 | 7 | 4 | **5.50** | Rejected — EasyDMARC, Infoblox and free scanners |
| 16 | Vendor bank-detail change fraud verification (AP teams) | 8 | 6 | 4 | 7 | 4 | 4 | 5 | 6 | 4 | 6 | 8 | 6 | 3 | 6 | 5 | **5.46** | Rejected — UK Confirmation of Payee / EU VoP built in; enterprise sales |
| 17 | Government bid discovery for small contractors | 5 | 6 | 7 | 7 | 2 | 5 | 5 | 6 | 5 | 8 | 8 | 7 | 3 | 6 | 3 | **5.46** | Rejected — saturated (HigherGov, BidPrime, SamSearch) |
| 18 | Trademark watch for small businesses | 5 | 5 | 4 | 7 | 2 | 5 | 6 | 6 | 5 | 8 | 8 | 7 | 3 | 7 | 3 | **5.25** | Rejected — crowded (IPRScan, MarkWatch, TMPilot, Trademarkia); low urgency |
| 19 | France e-invoicing (PA) connector for SMEs | 6 | 6 | 8 | 8 | 2 | 3 | 2 | 4 | 3 | 8 | 6 | 8 | 3 | 3 | 7 | **5.21** | Rejected — certification + 87 registered platforms; non-native market |
| 20 | Merchant-statement fee analysis for SMBs | 5 | 5 | 5 | 8 | 3 | 5 | 6 | 6 | 5 | 5 | 8 | 4 | 5 | 7 | 3 | **5.07** | Rejected — one-off value, crowded (Swipesum, MightyBot) |
| 21 | ADA Title II accessibility compliance for small US governments | 6 | 6 | 3 | 6 | 4 | 4 | 5 | 6 | 4 | 6 | 8 | 6 | 3 | 6 | 4 | **5.07** | Rejected — DOJ deadlines pushed to 2027/28 and under review |
| 22 | CAM reconciliation for small commercial landlords | 7 | 7 | 2 | 5 | 3 | 5 | 4 | 5 | 4 | 6 | 8 | 6 | 3 | 5 | 3 | **5.00** | Rejected — annual job; Kardin, PigJet, REAL |
| 23 | AI-generated safety programmes for contractors | 5 | 5 | 3 | 7 | 2 | 5 | 6 | 6 | 5 | 5 | 8 | 4 | 3 | 5 | 3 | **4.61** | Rejected — liability risk; ShieldSphere, SafetyGPT, template packs |

## 15. Roadmap (only after paying customers ask)

1. Branded sending domains per agency; tenant acknowledgement tracking.
2. CRM import/sync (Reapit/Alto/Arthur), inbound email forwarding to create cases.
3. Contractor links (accept job, upload photos, mark started/completed — feeding the clocks).
4. England Phase 2 hazard templates (30 Nov 2026) and Phase 3 (2027); English PRS when Awaab's Law extends.
5. Portfolio reporting for landlords with several agents; SSO for larger agencies.
