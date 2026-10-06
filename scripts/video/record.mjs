// Records the 90-second overview in the demo workspace: logging a report, the dashboard, a landlord's approval,
// the written summary, a delay notice and the evidence pack. See studio.mjs for the recording itself.
import { chromium } from "playwright";
import fs from "node:fs";
import { BASE, record, sleep } from "./studio.mjs";

const V = process.argv[2];
const pdfPages = [1, 2, 3].map((n) => "data:image/png;base64," + fs.readFileSync(`${V}/evidence/evidence-p${n}.png`).toString("base64"));
const END = `<div class="brand"><span class="m"></span>RepairClock</div>
  <h1>Damp &amp; mould deadlines,<br>handled.</h1>
  <p class="foot">Try the sample agency, no sign-up:</p><p class="url">repairclock.bygauthier.com/demo</p>
  <p class="foot" style="margin-top:18px;font-size:19px">14-day free trial · no card needed</p>`;

// The demo workspace is built off camera.
const setup = await chromium.launch();
const demo = await setup.newContext({ baseURL: BASE });
const dp = await demo.newPage();
await dp.goto("/demo");
await dp.locator("form button[type=submit]").first().click();
await dp.waitForURL("**/app");
const storageState = await demo.storageState();
await setup.close();

await record(V, { storageState }, async ({ page, ui, moveTo, highlight, click, type, say, quiet, waitCut, begin }) => {
  const cases = {};
  const openCase = async (ref) => {
    await page.goto(cases[ref]);
    await page.waitForLoadState("load");
  };

  // Opening frame: the homepage.
  await page.goto("/");
  await page.waitForLoadState("load");
  await sleep(800);
  begin();

  // The new duties, and what RepairClock does about them.
  await say("s1", 0);
  const h1 = page.locator("h1").first();
  await moveTo(h1, 30);
  await highlight(h1, 12);
  await say("s1", 1);
  await ui("clear");
  await highlight(page.locator(".card").filter({ hasText: "If a tenant reports mould today" }).first(), 6);
  await quiet(0.2);

  // Logging a report starts the clocks.
  await ui("clear");
  await page.goto("/app/cases/new");
  await page.waitForLoadState("load");
  await say("s2", 0);
  await type(page.getByLabel("What did they report?"), "Black mould on the bedroom wall, spreading behind the wardrobe.", 22);
  await say("s2", 1);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(700);
  await highlight(page.locator("aside").filter({ hasText: "Live preview" }).first(), 6);
  await say("s2", 2);
  await ui("clear");
  await click(page.getByRole("button", { name: /log report/i }));
  await waitCut(page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}/, { timeout: 20000 }));
  await page.waitForLoadState("load");
  await sleep(400);
  await highlight(page.locator("ol.gap-px").first(), 6);
  await quiet(0.3);

  // The dashboard.
  await ui("clear");
  await page.goto("/app");
  await page.waitForLoadState("load");
  for (const ref of ["LFL-0002", "LFL-0003", "LFL-0004"]) cases[ref] = await page.getByRole("link", { name: new RegExp(ref) }).first().getAttribute("href");
  await say("s3", 0);
  const tiles = await page.evaluate(() => {
    let el = [...document.querySelectorAll("p")].find((p) => p.textContent.trim() === "Past a statutory deadline");
    while (el && el.parentElement && el.parentElement.children.length < 4) el = el.parentElement;
    const r = el?.parentElement?.getBoundingClientRect();
    return r ? { x: r.x - 6, y: r.y - 6, w: r.width + 12, h: r.height + 12 } : null;
  });
  if (tiles) {
    await page.mouse.move(tiles.x + tiles.w / 2, tiles.y + tiles.h / 2, { steps: 25 });
    await ui("hl", tiles);
  }
  await say("s3", 1);
  await ui("clear");
  await highlight(page.getByRole("region", { name: "Needs attention" }), 6, "start");
  await quiet(0.3);

  // A landlord's approval, and what they see.
  await ui("clear");
  await say("s4", 0);
  await openCase("LFL-0002");
  const ask = page.locator("details").filter({ hasText: "Ask the landlord to approve work" }).first();
  await click(ask.locator("summary"));
  await ask.getByLabel("For").selectOption("repair");
  await ask.getByLabel("Cost (£, optional)").fill("420");
  await ask.getByLabel("Work to approve").fill("Replace the bathroom extractor fan and treat the bedroom wall.");
  await click(ask.getByRole("button", { name: "Send approval link" }));
  const code = ask.locator("code", { hasText: "/approve/" });
  await waitCut(code.waitFor({ timeout: 15000 }));
  const link = (await code.textContent()).trim().replace(/^https?:\/\/[^/]+/, BASE);
  await say("s4", 1);
  await page.goto(link);
  await page.waitForLoadState("load");
  await ui("chip", "What the landlord sees");
  await sleep(1500);
  await type(page.getByLabel("Type your full name to confirm"), "Northfield Property Holdings", 22);
  await click(page.getByRole("button", { name: "Confirm approval" }));
  await sleep(900);
  await say("s4", 2);
  await ui("chip", "");
  await openCase("LFL-0002");
  await highlight(page.locator(".card").filter({ has: page.getByRole("heading", { name: "Landlord approvals" }) }).first(), 6);
  await quiet(0.3);

  // The written summary, issued in one click, and a delay notice.
  await ui("clear");
  await say("s5", 0);
  await openCase("LFL-0003");
  await highlight(page.getByLabel("Written summary text"), 6, "start");
  await say("s5", 1);
  await ui("clear");
  await click(page.getByRole("button", { name: "Issue written summary" }));
  const issued = page.getByText("Written summary issued and emailed to the tenant.").first();
  await issued.waitFor({ timeout: 15000 }).catch(() => {});
  if (await issued.count()) await highlight(issued, 8);
  await say("s5", 2);
  await ui("clear");
  await openCase("LFL-0004");
  await highlight(page.getByText(/^Delay notice issued/).first(), 6);
  await quiet(0.3);

  // Every step on the timeline, and the evidence pack.
  await say("s6", 0);
  await ui("clear");
  await highlight(page.locator('section[aria-labelledby="timeline-heading"]'), 6, "start");
  await say("s6", 1);
  await ui("clear");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(600);
  const pack = page.getByRole("link", { name: "Evidence pack" }).first();
  await moveTo(pack, 25);
  await highlight(pack, 6);
  await sleep(900);
  await ui("press");
  await sleep(200);
  await ui("clear");
  await page.evaluate((imgs) => {
    const wrap = document.createElement("div");
    Object.assign(wrap.style, { position: "fixed", inset: "0", background: "rgba(20,33,61,.55)", zIndex: 2147483605, display: "flex",
      alignItems: "center", justifyContent: "center", gap: "26px", opacity: "0", transition: "opacity .45s ease" });
    imgs.forEach((src, i) => {
      const im = document.createElement("img");
      im.src = src;
      Object.assign(im.style, { height: "560px", borderRadius: "6px", boxShadow: "0 18px 50px rgba(0,0,0,.35)", transform: `translateY(${18 - i * 6}px) rotate(${(i - 1) * 2.2}deg)` });
      wrap.appendChild(im);
    });
    document.body.appendChild(wrap);
    requestAnimationFrame(() => (wrap.style.opacity = "1"));
  }, pdfPages);
  await quiet(0.4);

  // Where to start.
  await say("s7", 0);
  await ui("caption", "");
  await ui("full", END);
  await say("s7", 1);
  await say("s7", 2);
  await quiet(1.6);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
