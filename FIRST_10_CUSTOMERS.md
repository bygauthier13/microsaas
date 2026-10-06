# First 10 customers (email only, no calls)

Goal: **10 paying Scottish letting agencies** without booking a single call. People read an email, click through, understand the product on their own, start a trial and pay by card. You only write emails and answer replies.

## How the funnel works

1. **Cold email** (you) — short, plain text, one link. It explains the new law and their real deadline date.
2. **Demo workspace** (automatic) — `/demo` opens a sample agency with no sign-up. A "Try it in 2 minutes" panel walks them through four things: a missed deadline, a tenant letter issued in one click, a landlord approval, a delay notice and its evidence pack.
   **Videos** (automatic) — the homepage plays a 90-second overview (repairclock.bygauthier.com/#video), and repairclock.bygauthier.com/guide shows the 2-minute setup guide step by step. The demo, the Today page of a new workspace and the welcome email all link to the guide.
3. **Free trial** (automatic) — 14 days, no card. Two quick questions, then they log a real report and see their deadlines.
4. **Nudges** (automatic) — if no report is logged after a day, they get "log your first report"; after 3 days with few homes, "import your homes from a CSV". Every weekday they get the deadline digest. Three days before the trial ends, they get a reminder.
5. **Payment** (automatic) — they choose a plan and pay by card through Stripe. The founding discount code goes in your emails.

What you do by hand: send emails, answer replies by email, and import a CSV for anyone who emails you one.

**The trade-off.** Without calls fewer people convert, so you need more emails. Expect roughly **0.5–1% of agencies emailed to become paying customers** (estimate, not data). Ten customers means emailing most of the Scottish register, about 1,000 agencies, over 4–6 weeks. That's 25–40 emails a day.

---

## 1. Who to email

Independent Scottish letting agencies that **manage** homes (they handle repairs, not just tenant-find), with roughly **80–1,500 managed homes**. Email the owner/director or the head of lettings or property management.

Best signals: older tenement or ex-council stock; Google reviews that mention mould or slow repairs; they already use Fixflo, Arthur, Alto or Reapit; they've posted about the 6 October changes.

Skip for now: tenant-find-only agents, big corporates, and agencies with fewer than ~40 managed homes. The £12 Landlord plan only covers 10 homes, so a small agency would need the £99 Agent plan, which is a hard sell at that size. Note them in the sheet in case a smaller plan is added later.

## 2. Where to find them

- **Scottish Letting Agent Register** (search "Scottish Letting Agent Register"): every registered agent with trading name and branch addresses.
- **Citylets** and **S1homes** agent directories: listing counts show size.
- **Rightmove / Zoopla / OnTheMarket** → "Find an agent" → letting agents by city.
- **Google Maps**: "letting agents Edinburgh", "property management Glasgow", Aberdeen, Dundee, Fife, Stirling, Perth, Inverness.
- **Agency websites**: the "Meet the team" page usually gives names and emails (or the firstname@agency.co.uk pattern).
- **LinkedIn**: to find names only (titles "Lettings Director", "Head of Lettings", "Property Manager").

Search queries:
```
"letting agents" Edinburgh "property management"
"letting agent" Glasgow "fully managed"
site:linkedin.com/in ("lettings director" OR "head of lettings") Scotland
"letting agent" Aberdeen reviews mould
```

Keep a sheet: `Agency · Company type (Ltd/LLP/partnership/sole trader) · City · Est. homes · Contact name · Email · Email 1 date · Email 2 · Email 3 · Email 4 · Reply · Opted out? · Trial? · Paid?`

## 3. Before you send: rules and deliverability

**The law on cold email (UK PECR + UK GDPR):**
- You may email **limited companies, LLPs and Scottish partnerships** (corporate subscribers) without prior consent, as long as you say who you are and give an easy way to opt out.
- **Sole traders** (and English unincorporated partnerships) need consent first, so skip them. Check the agency's website footer or Companies House for "Ltd", "LLP" or a registered partnership.
- Every email: your name, the company, a one-line opt-out ("Reply 'no thanks' and I won't email again"). Keep a do-not-contact list and honour it straight away.
- This is a summary, not legal advice; the ICO's guidance on business-to-business marketing has the detail.

**So your emails land in the inbox, not spam:**
- **Start free from your existing Gmail (Google Workspace) address at bygauthier.com.** Check SPF, DKIM and DMARC first with Google's Check MX tool, and switch DKIM on in the Google Admin console if it's off (the launch checklist has the steps).
- The trade-off: if recipients mark your emails as spam, it can hurt delivery of all your bygauthier.com email. Keep every email relevant and honour opt-outs at once. Once you have a paying customer, consider moving outreach to a separate domain (about £5/year) with its own mailbox.
- Product emails (letters, reminders) already go from `repairclock.bygauthier.com` through Resend, so they're kept apart from your Gmail.
- Ramp up slowly: **10 a day in week 1, 20 a day in week 2, then 30–40 a day**. Send by hand from the mailbox or with a simple mail-merge. You don't need a paid cold-email tool at this volume.
- Plain text, one link, no images, no attachments. Personalise the first line.

## 4. The emails

Each email has to work on its own: someone who reads only that one should understand the problem, see their own deadline and know where to click. None of them asks for a call. Put `?from=email1` (email2, …) on the links so the analytics show which email works (`demo_started` and `signup_completed` record it).

### Email 1 — Day 0
**Subject:** Damp reports from today: investigate by Tue 20 Oct

> Hi **Fiona**,
>
> Since 6 October, every damp or mould report in a Scottish rented home has a legal clock: 10 working days to get it investigated, 3 more to send the tenant a written summary, and repairs must start within 5. A report **Lothian & Forth** receives today has to be investigated by **Tuesday 20 October**.
>
> I built RepairClock for letting agents. You log the report and it counts every deadline (Scottish bank holidays included), gets the landlord's approval with one link, writes the tenant's letters and keeps a record you could show a tribunal.
>
> There's a sample agency you can click around, no sign-up: **repairclock.bygauthier.com/demo?from=email1**
>
> **[Your name]**, RepairClock
> Reply "no thanks" and I won't email again.

### Email 2 — Day 4
**Subject:** The slow part is the landlord

> Hi **Fiona**,
>
> The deadline most agents worry about isn't the investigation itself. It's waiting for the landlord to approve the spend while the 10 working days run.
>
> In RepairClock the landlord gets a link showing the work, the cost and the legal deadline. They approve or decline with one tap, no login, and their answer is saved on the case with the date and time. Reminders go out automatically until they answer.
>
> You can try it on the "Dalmeny Street" case in the demo: **repairclock.bygauthier.com/demo?from=email2**
>
> **[Your name]**
> Reply "no thanks" and I won't email again.

### Email 3 — Day 9
**Subject:** A report on 18 December → investigated by 7 January

> Hi **Fiona**,
>
> One for the diary: with the Christmas and New Year bank holidays, a damp report received on **Friday 18 December** must be investigated by **Thursday 7 January**, while most contractors are off.
>
> RepairClock emails your team every weekday morning with anything overdue, due today or due in the next 2 working days, across every home you manage.
>
> Free 14-day trial, no card: **repairclock.bygauthier.com/signup?from=email3**. Use code **FOUNDING20** at checkout for 20% off for your first year (offer ends 31 October).
>
> **[Your name]**
> Reply "no thanks" and I won't email again.

### Email 4 — Day 16 (last)
**Subject:** Last one from me

> Hi **Fiona**, this is my last email. If damp and mould deadlines are already covered at **Lothian & Forth**, great. If not, the free calculator shows any report's deadlines in seconds, and it's yours to use either way: **repairclock.bygauthier.com/tools/deadline-calculator?from=email4**
>
> **[Your name]**

After email 4, stop. You can contact non-responders once more in a month with genuinely new news (e.g. England's Phase 2 on 30 November, or a new feature).

## 5. Answering replies (by email)

| They say | You reply |
| --- | --- |
| "How much is it?" | "£99 a month + VAT for up to 300 homes and 5 people (£79 with code FOUNDING20 for the first year). 14-day free trial, no card: [signup link]" |
| "We already use Fixflo / Arthur / Reapit." | "Keep it. RepairClock runs alongside: those track repair jobs, but they don't count the Scottish working days, draft the written summary and delay notice, or give landlords a deadline-aware approval link. You can import your homes from a CSV export in a minute." |
| "It's the landlord's duty, not ours." | "It is, and the approval link shows the landlord exactly that. But the tenant told you, so the record of what you did and when protects you too." |
| "Can you set it up for us?" | "Yes. Email me your property list as a CSV (address, postcode, tenant, landlord name and email) and I'll import it today." |
| "Is it legal advice?" | "No. It runs the process set out in the Regulations and the Scottish Government's guidance, with the sources linked. You decide what goes in every letter." |
| "Can we have a call?" | "Of course, though most agents find the 90-second video and the demo explain it: repairclock.bygauthier.com/#video and [demo link]. If you still have questions after that, reply here and I'll answer them." (Offer a call only if they insist.) |
| "Send more info." | Link the 90-second video (repairclock.bygauthier.com/#video), the demo and the Scotland guide (repairclock.bygauthier.com/scotland). |
| "How do we get started?" | "This 2-minute video shows every step, from importing your homes to choosing a plan: repairclock.bygauthier.com/guide" |
| "No thanks" / "Remove me" | "Done, sorry to bother you." Add them to the do-not-contact list the same day. |

## 6. Each day

- Morning: check the analytics for new demos, sign-ups and payments (SQL on `analytics_events`, or PostHog).
- Send the day's emails (new agencies get email 1; earlier ones get their next email).
- Answer every reply the same day.
- Look at new sign-ups: if one gets stuck (for example, signed up but no homes), send a two-line personal email offering to import their CSV.

## 7. Pricing for the first 10

- **Code FOUNDING20:** 20% off for 12 months, so the Agent plan is about £79/month. Create it in Stripe as a coupon with a promotion code; checkout already accepts codes. Make it end on 31 October 2026 so there's a reason to act.
- **Free CSV import**: they email the file, you import it the same day.
- Don't give extra free months beyond the 14-day trial. Offer the import help instead.

## 8. Targets

| Step | From ~1,000 agencies emailed |
| --- | --- |
| Open the demo or calculator | ~60–100 (6–10%) |
| Start a trial | ~20–30 |
| Log a real report (activated) | ~12–18 |
| Pay | **~5–10** |

All estimates. If after the first 300 emails fewer than 10 people have opened the demo, change the subject line and first sentence before sending more.
