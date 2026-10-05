# Market research (October 2026)

Research ran on 5–6 October 2026 using live web search and page fetches (founder interviews, revenue reports, pricing pages, regulations and government guidance). Figures are as published by the sources; treat secondary-source numbers as indicative.

## 1. What small, profitable software businesses have in common

| Business | What they sell / who pays | Revenue signal | How they got customers | Lesson for us |
| --- | --- | --- | --- | --- |
| **Swifteq** (Sorin Alupoaie, solo, Dublin) | Portfolio of Zendesk marketplace apps for support teams | €20k+ MRR, 300+ customers (Jun 2024); ~4.5 years to $10k | Marketplace intent + documentation + content | Narrow audience inside an ecosystem; compounding small products; pricing taken seriously late |
| **stagetimer.io** (Lukas Hermann) | Remote show timers for live events | ~$20k MRR (Sep 2025) | SEO + word of mouth among event producers | Tiny product, very specific job; competitor (Rundown/ShoFlo) priced at $6k/yr left room below |
| **BasinCheck** | Safety audits for small oil & gas contractors (replacing Excel + binders) | $1.2k MRR from 2 customers ($860/mo pilot) | A Reddit post → pilot → 3× renewal | "Competitor = Excel" niches pay well per customer; flat-rate unlimited users; audit-ready records |
| **Post Bridge** (Jack Friks, solo) | Social scheduler undercutting Buffer ($9/$18/$27) | ~$11k MRR in 6 months; ~$41k mid-2026 (TrustMRR) | Building in public, price undercut | Cheaper/simpler alternative to an incumbent works in horizontal markets — but B2C/creator churn |
| **Parqet** | Portfolio tracker for DACH investors | ~€100k MRR | Geographic niche, local tax/broker specifics | Owning a region's specifics beats generic global tools |
| **Polotno SDK** (team of 3) | White-label design editor SDK | ~$60k MRR | Grew from an open-source community | Developer distribution |
| **DASHP** (Isaac Tai) | Commission tool for door-to-door pest-control sales | ~$100k ARR | Sales-led into an ICP numbered in the hundreds | A tiny, well-defined ICP can support a real business |
| **Conductor** (Danny Nemer) | API for QuickBooks Desktop | ~$25k MRR | GitHub + SEO inbound, near-zero CAC | Solve a hated integration pain once |
| **Checkpoint** (secondhand, podcast) | API monitoring | ~$48 ARPU × 210 customers, <3% churn | Developer content | Monitoring = recurring by nature, low churn |
| **BlogToPin** | Pinterest automation | ~$15k MRR, but 10–15% monthly churn | Creator marketing | Warning: creator/B2C tools churn |

**Patterns:** (1) a specific professional buyer with budget; (2) a recurring operational job (monitoring, compliance, reporting) rather than a one-off; (3) a distribution channel that already concentrates the buyer (marketplace, register, association, community); (4) a wedge below an expensive/complex incumbent, or against "Excel"; (5) B2B retention ≫ B2C retention.

**What a 2026 version can do faster:** auth, billing, email, PDF generation and LLM-drafted documents are commodity building blocks — a credible compliance product is days, not months. The flip side is the next finding.

## 2. Key finding: the obvious niches are flooded

Searching the "classic" micro-SaaS niches in 2026 surfaced crowds of near-identical, often AI-built products with content-farm marketing:

- **COI tracking:** Checkmate (broker-funded) is **free**; BCS free up to 25 vendors then ~$0.95/vendor/month; SubDoc $20/mo for 100 vendors; ExpiryEdge $24–165/mo; Billy (1,000+ GCs). Price collapse.
- **Trademark watch:** IPRScan (€49/yr for 3 marks), IP Defender, Thorgate, Sealvo, GleanMark, TMPilot (€9–79/mo), MarkWatch ($19/mo), Trademarkia…
- **WooCommerce checkout monitoring:** ShopMonitor, CheckOO, Velprove, NorthDuty, Pingvera, FlareWarden, PingView, Logystera.
- **Restaurant invoice price creep:** InvoiceWatch, Kosto, KitchenIQ ($89), Diced OS ($19.99), ChefCode, OpsBrain ($99)…
- **CAM reconciliation, certified payroll, municipal minutes, gov-bid discovery, DQF files, lookalike domains, merchant statements, insurance COI issuance, AI safety programmes:** all with multiple 2026 entrants (see `PRODUCT_STRATEGY.md` table).

**Implication:** "AI extraction + reminders" is no longer a moat. Winning requires a distribution edge, deep workflow embedding, a non-obvious niche, or a data/rules moat — ideally **a new obligation with a hard start date that incumbents haven't adapted to**.

## 3. Regulatory tailwinds checked (2026)

| Change | Date | Assessment |
| --- | --- | --- |
| **Scotland: Investigation and Commencement of Repair (Scotland) Regulations 2026 (SSI 2026/173)** — damp & mould timescales for private *and* social landlords | **In force 6 Oct 2026** | ✅ Chosen. Hard start date, recurring obligation, record-keeping, enforcement (Tribunal/RSEO; Right to Repair compensation) |
| England: Awaab's Law (Hazards in Social Housing Regs 2025) | Phase 1 27 Oct 2025; Phase 2 30 Nov 2026; Phase 3 2027 | ✅ Expansion. Social landlords only; crowded vendor field |
| England: extension of Awaab's Law to private renting (Renters' Rights Act 2025) | Date to be confirmed (expected ~2027) | ✅ Future TAM (~19k agencies, ~2.3M landlords) |
| UK: Making Tax Digital for Income Tax | Live 6 Apr 2026 (>£50k); threshold £30k Apr 2027, £20k Apr 2028 | ❌ No late-submission penalties in year one; HMRC recognition; crowded |
| UK: Companies House identity verification | Transition ends 17 Nov 2026 (~55% directors verified by June 2026) | ❌ Urgent but short-lived |
| France: e-invoicing reception mandate | 1 Sep 2026 (issuance for SMEs 1 Sep 2027) | ❌ Certification + 87 approved platforms |
| US: ADA Title II web accessibility | Deadlines extended to Apr 2027 / Apr 2028, under review | ❌ Uncertain |

## 4. The chosen market in detail

### The rules (Scotland)
- A **competent person** must investigate within **10 working days** of the landlord becoming aware (awareness isn't only a tenant report — inspections, contractors, sensors count; guidance para 3.16).
- **Written summary** to the tenant (or their representative) within **3 working days** of the investigation concluding — content set out in guidance: investigator, process and findings with an explicit "substantially free" conclusion, work done on the visit, work required + target start, or reasons if none, plus signposting.
- **Repairs begin within 5 working days** of the investigation where there is substantial damp or mould; social landlords **complete within 20 working days**; private landlords **as soon as reasonably practicable**.
- **Exceptional circumstances** (beyond the landlord's control): notify the tenant of the duty, reasons and a revised timeframe; take reasonable steps (mould removal, temporary extractors, sealing leaks, monitoring) meanwhile. **Keep records** — landlords must evidence compliance or why it wasn't possible.
- Working day = not Saturday, Sunday or a Scottish bank holiday (the official GOV.UK feed includes the one-off **15 June 2026** holiday).

Sources: [SSI 2026/173](https://www.legislation.gov.uk/ssi/2026/173/made) · [Scottish Government: Awaab's Law guidance for landlords (Scotland)](https://www.gov.scot/publications/awaabs-law-guidance-landlords-scotland/) · [guidance for tenants](https://www.gov.scot/publications/awaabs-law-guidance-tenants-scotland/) · [GOV.UK bank holidays](https://www.gov.uk/bank-holidays.json)

### Who carries the work
Propertymark (Scotland): *"Agents managing homes on a landlord's behalf will be central to making sure these duties are met in practice."* It engaged on written summaries, specialist capacity and rural supply chains, and published a member fact sheet with a practical template (Sep 2026). Citylets, Bell Ingram and Aico published explainers for agents and landlords.

### Pain signals
- English Phase 1 "test and learn" research (MHCLG/Verian, fieldwork Dec 2025–Mar 2026, 35 social landlords): landlords found late guidance limited preparation; asked for "early definitions of digital and data requirements (for example, case stages, statutory 'clock' triggers, required fields/outputs and standard reporting formats including written summary templates)"; risk of "prioritising evidencing compliance over addressing root causes".
- Vendors' own positioning (2026) repeats the same pains: "the legal clock runs from the landlord becoming aware … which may be before a work order is created"; "reports come from all directions … updates get lost in inboxes … cases are tracked in spreadsheets … audit trails are unreliable".
- Repairs lag inspections: "Investigating inside 10 working days is easier than finishing the works inside the 5-working-day window after the investigation ends" (industry commentary, 2026).

### Market size (approximate)
| Segment | Count | Notes |
| --- | --- | --- |
| Scottish letting agents (register) | ~900–1,000 | 889 approved by Feb 2020; register public (FOI release Apr 2026) |
| Scottish registered landlords | ~240k | Most own 1–2 homes; low ARPU, SEO channel |
| Scottish social landlords | ~180 | Councils + RSLs; procurement-led |
| English social landlords | ~1,600 | ~1,000 own < 1,000 homes; Awaab's Law Phase 2 from 30 Nov 2026 |
| English letting agencies | ~19k | Future: when Awaab's Law extends to PRS |

**Serviceable now:** ~1,000 Scottish agencies × ~£100–£250/mo ≈ £1.2–3M ARR, enough for a solo founder's £10k MRR (~8–10% share), with English expansion on top.

## 5. Conclusion

The best 2026 opportunity wasn't the biggest market but the one with a **hard legal start date (6 Oct 2026), a recurring obligation, a reachable list of buyers who already pay for software, and no agent-focused incumbent**. RepairClock is built for exactly that window.
