// Records the step-by-step tutorial on a fresh workspace: sign up, set up the agency, import homes, log a report,
// get the landlord's approval, record the visit and issue the written summary, invite a colleague, open the plans.
// Shows a step banner, "click here" tips and captions; see studio.mjs for the recording itself.
import fs from "node:fs";
import { BASE, record, sleep } from "./studio.mjs";

const V = process.argv[2];
const steps = JSON.parse(fs.readFileSync(new URL("./tutorial.json", import.meta.url), "utf8"));
const CSV = new URL("./tutorial-homes.csv", import.meta.url).pathname;
const titles = steps.filter((s) => s.step >= 1 && s.step <= 8).map((s) => s.title);

// Opening and closing cards: the steps as a list, ticked off at the end.
const CHECK = '<svg viewBox="0 0 16 16" width="18" height="18"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const list = (done) =>
  `<ol>${titles.map((t, i) => `<li style="animation-delay:${(done ? 0.15 : 0.5) + i * (done ? 0.08 : 0.32)}s"><b>${done ? CHECK : i + 1}</b><span>${t}</span></li>`).join("")}</ol>`;
const INTRO = `<div class="brand"><span class="m"></span>RepairClock</div><h1>Get started in ${titles.length} simple steps</h1>${list(false)}
  <p class="foot">Free for 14 days · no card needed</p>`;
const OUTRO = `<div class="brand"><span class="m"></span>RepairClock</div><h1>You’re all set!</h1>${list(true)}
  <p class="foot">Start your free trial at</p><p class="url">repairclock.bygauthier.com</p>
  <p class="foot" style="margin-top:18px;font-size:19px">14 days free · no card needed · questions? hello@bygauthier.com</p>`;

await record(V, { titles, bar: 56 }, async ({ page, ui, rectOf, show, moveTo, highlight, tip, tipClick, type, say, quiet, waitCut, stepStart, begin }) => {
  const nav = page.getByRole("navigation", { name: "Main" });

  // Intro: what the video covers.
  await page.goto("/");
  await page.waitForLoadState("load");
  await ui("step", 0);
  await ui("full", INTRO);
  await sleep(900);
  begin();
  await say("intro", 0);
  await say("intro", 1);
  await quiet(0.4);
  await ui("unfull");
  await sleep(700);

  // 1. Create your free account.
  await stepStart(1, "s1");
  await say("s1", 1);
  await tipClick(page.locator("header").getByRole("link", { name: "Start free trial" }).first(), "Click “Start free trial”");
  await page.waitForURL("**/signup");
  await page.waitForLoadState("load");
  await sleep(300);
  await type(page.getByLabel("Your name"), "Fiona Mackay");
  await type(page.getByLabel("Work email"), "fiona@lothianforth.example.com", 28);
  await type(page.getByLabel("Password"), "damp-free-2026", 34);
  await say("s1", 2);
  const submit = page.getByRole("button", { name: "Start 14-day free trial" });
  await show(page.getByText("No card needed.", { exact: false }).first());
  const sb = await rectOf(submit, 8);
  const nb = await rectOf(page.getByText("No card needed.", { exact: false }).first(), 8);
  if (sb && nb) await ui("hl", { x: Math.min(sb.x, nb.x), y: sb.y, w: Math.max(sb.x + sb.w, nb.x + nb.w) - Math.min(sb.x, nb.x), h: nb.y + nb.h - sb.y });
  await sleep(1700);
  await tipClick(submit, "Click “Start 14-day free trial”", 600);
  await waitCut(page.waitForURL("**/app/onboarding", { timeout: 20000 }));
  await page.waitForLoadState("load");

  // 2. Set up your agency.
  await stepStart(2, "s2");
  await say("s2", 1);
  await tipClick(page.locator("label").filter({ hasText: "Letting agent" }).first(), "Choose “Letting agent”", 500);
  await tipClick(page.locator("label").filter({ hasText: /^Scotland/ }).first(), "Choose “Scotland”", 500);
  await type(page.getByLabel("Organisation name"), "Lothian & Forth Lettings", 30);
  await page.getByLabel("Roughly how many homes?").fill("120");
  await type(page.getByLabel("Phone for tenants"), "0131 496 0123", 40);
  await say("s2", 2);
  await highlight(page.locator("form .grid").filter({ has: page.getByLabel("Phone for tenants") }).first(), 10);
  await sleep(1800);
  await tipClick(page.getByRole("button", { name: /^Continue/ }), "Click “Continue”");
  await waitCut(page.waitForURL("**/app/cases/new**", { timeout: 20000 }));
  await page.waitForLoadState("load");

  // 3. Add your homes.
  await stepStart(3, "s3");
  await say("s3", 1);
  await tipClick(nav.getByRole("link", { name: "Homes" }), "Open “Homes”");
  await page.waitForURL("**/app/properties");
  await page.waitForLoadState("load");
  await sleep(300);
  const imp = page.locator("#import");
  await show(imp);
  const file = page.locator("#file");
  await tip(file, "Choose your spreadsheet (CSV)");
  await moveTo(file);
  await sleep(800);
  await file.setInputFiles(CSV);
  await sleep(400);
  await tipClick(imp.getByRole("button", { name: "Import homes" }), "Click “Import homes”", 550);
  await waitCut(page.getByText(/Imported \d+ homes/).first().waitFor({ timeout: 15000 }).catch(() => {}));
  await highlight(page.locator("#add"), 6);
  await say("s3", 2);
  await ui("clear");
  await tip(page.getByRole("link", { name: "Download a template" }), "Template");
  await sleep(1900);
  await ui("clear");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(800);
  await highlight(page.locator(".card").filter({ hasText: "Dalmeny Street" }).first(), 6);
  await quiet(0.6);

  // 4. Log a report.
  await ui("clear");
  await page.goto("/app");
  await page.waitForLoadState("load");
  await stepStart(4, "s4");
  await tipClick(page.getByRole("link", { name: "Log a report" }).first(), "Click “Log a report”");
  await page.waitForURL("**/app/cases/new**");
  await page.waitForLoadState("load");
  await sleep(300);
  await say("s4", 1);
  const prop = page.getByLabel("Property");
  const value = await prop.evaluate((s) => [...s.options].find((o) => o.textContent.includes("Dalmeny"))?.value);
  await tip(prop, "Pick the home");
  await moveTo(prop);
  await sleep(500);
  if (value) await prop.selectOption(value);
  await sleep(500);
  await ui("clear");
  await type(page.getByLabel("What did they report?"), "Black mould on the bedroom wall, spreading behind the wardrobe.", 20);
  await tip(page.getByLabel("Date you became aware"), "The day you found out");
  await sleep(900);
  await say("s4", 2);
  await ui("clear");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(700);
  await highlight(page.locator("aside").filter({ hasText: "Live preview" }).first(), 6);
  await sleep(2800);
  await ui("clear");
  await tipClick(page.getByRole("button", { name: /Log report/ }), "Click “Log report & start the clock”");
  await waitCut(page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}/, { timeout: 20000 }));
  await page.waitForLoadState("load");
  const caseUrl = page.url();
  await sleep(600);
  await highlight(page.getByText("Report logged — the statutory clock is running").locator(".."), 6);
  await quiet(0.8);

  // 5. Get the landlord's approval.
  await stepStart(5, "s5");
  await say("s5", 1);
  const ask = page.locator("details").filter({ hasText: "Ask the landlord to approve work" }).first();
  await show(ask.locator("summary"), "start");
  await tipClick(ask.locator("summary"), "Click “Ask the landlord to approve work”", 500);
  await ask.getByLabel("For").selectOption("repair");
  await type(ask.getByLabel("Cost (£, optional)"), "420", 80);
  await type(ask.getByLabel("Work to approve"), "Treat the mould and fit a new bathroom extractor fan.", 16);
  await tipClick(ask.getByRole("button", { name: "Send approval link" }), "Click “Send approval link”", 550);
  const code = ask.locator("code", { hasText: "/approve/" });
  await waitCut(code.waitFor({ timeout: 15000 }));
  const link = (await code.textContent()).trim().replace(/^https?:\/\/[^/]+/, BASE);
  await say("s5", 2);
  await page.goto(link);
  await page.waitForLoadState("load");
  await ui("chip", "What the landlord sees");
  await sleep(800);
  await type(page.getByLabel("Type your full name to confirm"), "Morag Campbell", 30);
  await tipClick(page.getByRole("button", { name: "Confirm approval" }), "Click “Confirm approval”", 450);
  await sleep(1300);
  await ui("chip", "");
  await page.goto(caseUrl);
  await page.waitForLoadState("load");
  await highlight(page.locator(".card").filter({ has: page.getByRole("heading", { name: "Landlord approvals" }) }).first(), 6);
  await quiet(1.0);

  // 6. Record the visit, then issue the written summary.
  await stepStart(6, "s6");
  const inv = page.locator("details").filter({ has: page.getByRole("button", { name: "Record investigation" }) }).first();
  await type(inv.getByLabel("Who investigated"), "Sam Reid, Reid Damp Surveys Ltd", 16);
  await tipClick(inv.locator("label").filter({ hasText: "No — repair work is needed" }), "Repair work is needed", 350);
  await type(inv.getByLabel("What was found"), "Black mould on the bedroom wall, about 1 m². Bathroom extractor fan not working.", 9);
  await inv.getByLabel("Likely cause").selectOption("ventilation");
  await inv.getByLabel("Repair work required").fill("Treat the mould and fit a new humidistat extractor fan.");
  await tipClick(inv.getByRole("button", { name: "Record investigation" }), "Click “Record investigation”", 550);
  const letter = page.getByLabel("Written summary text");
  await waitCut(letter.waitFor({ timeout: 20000 }));
  await say("s6", 1);
  await show(letter, "start");
  await highlight(letter, 6);
  await sleep(2300);
  await say("s6", 2);
  await ui("clear");
  await tipClick(page.getByRole("button", { name: "Issue written summary" }), "Click “Issue written summary”", 650);
  const issued = page.getByText("Written summary issued and emailed to the tenant.").first();
  await waitCut(issued.waitFor({ timeout: 20000 }).catch(() => {}));
  if (await issued.count()) await highlight(issued, 8);
  await quiet(1.0);

  // 7. Invite your team.
  await stepStart(7, "s7");
  await say("s7", 1);
  await tipClick(nav.getByRole("link", { name: "Settings" }), "Open “Settings”");
  await page.waitForURL("**/app/settings");
  await page.waitForLoadState("load");
  const invite = page.getByLabel("Invite a colleague");
  await type(invite, "callum@lothianforth.example.com", 26);
  await tipClick(page.getByRole("button", { name: "Send invitation" }), "Click “Send invitation”", 500);
  await waitCut(page.getByText("Invited · expires").first().waitFor({ timeout: 15000 }).catch(() => {}));
  await say("s7", 2);
  await highlight(page.locator(".card").filter({ has: page.getByRole("heading", { name: "Team" }) }).first(), 6);
  await quiet(1.0);

  // 8. Choose your plan.
  await ui("clear");
  await stepStart(8, "s8");
  const trial = page.locator("aside").getByRole("link", { name: /Free trial/ });
  await tip(trial, "Your free trial: 14 days");
  await quiet();
  await say("s8", 1);
  await tipClick(nav.getByRole("link", { name: "Plan & billing" }), "Open “Plan & billing”");
  await page.waitForURL("**/app/billing");
  await page.waitForLoadState("load");
  await sleep(300);
  const agent = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Agent", exact: true }) }).first();
  await highlight(agent, 6, "center");
  await tip(agent.getByRole("button"), "300 homes · 5 people · £99/month");
  await quiet();
  await say("s8", 2);
  await ui("clear");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(700);
  await highlight(page.getByText("Cancel any time — your records stay exportable.").first(), 8);
  await quiet(0.8);

  // Wrap-up: the Today page, then where to start.
  await ui("clear");
  await page.goto("/app");
  await page.waitForLoadState("load");
  await say("outro", 0);
  await ui("step", 9);
  await say("outro", 1);
  await highlight(page.locator('section[aria-labelledby="attention"], section[aria-labelledby="open"]').first(), 6);
  await quiet();
  await ui("clear");
  await say("outro", 2);
  await ui("caption", "");
  await ui("full", OUTRO, "done");
  await quiet(2.0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
