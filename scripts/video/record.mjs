// Records the RepairClock walkthrough: scripted clicks in the demo workspace, a visible cursor,
// highlights and captions. Writes the video plus a timeline of when each voice line starts.
import { chromium } from "playwright";
import fs from "node:fs";

const V = process.argv[2];
const BASE = "http://localhost:3600";
const W = 1280;
const H = 720;
const GAP = 0.3; // seconds of silence between voice lines
const lines = JSON.parse(fs.readFileSync(`${V}/audio/durations.json`, "utf8"));
const byId = Object.fromEntries(lines.map((l) => [l.id, l]));
const pdfPages = [1, 2, 3].map((n) => "data:image/png;base64," + fs.readFileSync(`${V}/evidence/evidence-p${n}.png`).toString("base64"));

const OVERLAY = () => {
  const install = () => {
    if (document.getElementById("rc-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #rc-cursor{position:fixed;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;
        background:rgba(194,65,12,.22);border:2.5px solid #c2410c;z-index:2147483647;pointer-events:none;transition:transform .12s ease}
      #rc-cursor.down{transform:scale(.65);background:rgba(194,65,12,.55)}
      #rc-cap{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);width:min(940px,calc(100% - 96px));padding:12px 22px;
        border-radius:12px;background:rgba(20,33,61,.93);color:#fff;font:500 21px/1.42 "IBM Plex Sans",system-ui,sans-serif;
        text-align:center;z-index:2147483646;pointer-events:none;box-shadow:0 10px 30px rgba(20,33,61,.28)}
      #rc-cap:empty{display:none}
      .rc-hl{position:fixed;border:3px solid #c2410c;border-radius:14px;box-shadow:0 0 0 9999px rgba(20,33,61,.16);
        z-index:2147483645;pointer-events:none;transition:opacity .3s ease}
      section[aria-labelledby="tour-heading"]{display:none!important}
      [data-rc-hide]{display:none!important}
      html{scroll-behavior:smooth}
    `;
    document.head.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "rc-cursor";
    const pos = JSON.parse(sessionStorage.getItem("rc-pos") || "[640,360]");
    cursor.style.left = pos[0] + "px";
    cursor.style.top = pos[1] + "px";
    const cap = document.createElement("div");
    cap.id = "rc-cap";
    cap.textContent = sessionStorage.getItem("rc-cap") || "";
    document.body.append(cursor, cap);
    window.__rcCaption = (t) => { sessionStorage.setItem("rc-cap", t); cap.textContent = t; };
    document.addEventListener("mousemove", (e) => {
      cursor.style.left = e.clientX + "px"; cursor.style.top = e.clientY + "px";
      sessionStorage.setItem("rc-pos", JSON.stringify([e.clientX, e.clientY]));
    }, true);
    document.addEventListener("mousedown", () => cursor.classList.add("down"), true);
    document.addEventListener("mouseup", () => cursor.classList.remove("down"), true);
    // Demo-only notices and the local address don't belong in a sales video.
    const tidy = () => {
      document.querySelectorAll("span.font-semibold").forEach((s) => {
        if (s.textContent.trim() === "Demo workspace.") s.parentElement?.setAttribute("data-rc-hide", "");
      });
      document.querySelectorAll('[role="status"]').forEach((s) => {
        if (/^Demo data:/.test(s.textContent.trim())) s.setAttribute("data-rc-hide", "");
      });
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeValue.includes("localhost:3600")) n.nodeValue = n.nodeValue.replace(/http:\/\/localhost:3600/g, "https://repairclock.bygauthier.com");
        if (n.nodeValue.includes(" — demo: email recorded in the outbox")) n.nodeValue = n.nodeValue.replace(" — demo: email recorded in the outbox", "");
      }
    };
    tidy();
    new MutationObserver(tidy).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();

  // Build the demo workspace off camera.
  const setup = await browser.newContext({ baseURL: BASE });
  const sp = await setup.newPage();
  await sp.goto("/demo");
  await sp.locator("form button[type=submit]").first().click();
  await sp.waitForURL("**/app");
  const state = await setup.storageState();
  await setup.close();

  const ctx = await browser.newContext({
    baseURL: BASE,
    viewport: { width: W, height: H },
    storageState: state,
    recordVideo: { dir: `${V}/raw`, size: { width: W, height: H } },
    acceptDownloads: true,
  });
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();
  const t0 = Date.now();

  const caption = async (t) => {
    try { await page.evaluate((x) => window.__rcCaption && window.__rcCaption(x), t); } catch {}
  };
  const clearHighlights = async () => {
    try { await page.evaluate(() => document.querySelectorAll(".rc-hl").forEach((e) => e.remove())); } catch {}
  };
  const highlight = async (locator, pad = 8) => {
    const b = await locator.boundingBox();
    if (!b) return;
    await page.evaluate(({ x, y, w, h }) => {
      document.querySelectorAll(".rc-hl").forEach((e) => e.remove());
      const d = document.createElement("div");
      d.className = "rc-hl";
      Object.assign(d.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
      document.body.appendChild(d);
    }, { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 });
  };
  const moveTo = async (locator, steps = 22) => {
    const b = await locator.boundingBox();
    if (!b) return;
    await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 22), { steps });
  };
  const click = async (locator) => {
    await moveTo(locator);
    await sleep(150);
    await locator.click();
  };
  const scrollIntoView = async (locator, block = "center") => {
    await locator.evaluate((el, blk) => el.scrollIntoView({ behavior: "smooth", block: blk }), block);
    await sleep(750);
  };

  // A scene: actions run while its voice lines play; captions follow the lines.
  const timeline = [];
  let start = 0;
  const scene = async (id, actions) => {
    const line = byId[id];
    const sceneStart = (Date.now() - t0) / 1000;
    let offset = sceneStart + 0.2;
    const capTimes = [];
    for (const part of line.parts) {
      timeline.push({ id, file: null, at: offset, seconds: part.seconds });
      capTimes.push({ at: offset, text: part.text, until: offset + part.seconds });
      offset += part.seconds + GAP;
    }
    const minEnd = offset + 0.2;
    let done = false;
    const capLoop = (async () => {
      for (const c of capTimes) {
        const wait = c.at * 1000 - (Date.now() - t0);
        if (wait > 0) await sleep(wait);
        if (done && c.at * 1000 > Date.now() - t0 + 50) break;
        await caption(c.text);
      }
    })();
    await actions();
    const left = minEnd * 1000 - (Date.now() - t0);
    if (left > 0) await sleep(left);
    done = true;
    await capLoop;
    await caption("");
    await clearHighlights();
  };

  // Opening frame: the homepage, loaded before the clock starts.
  await page.goto("/");
  await page.waitForLoadState("load");
  await sleep(800);
  start = (Date.now() - t0) / 1000;

  await scene("s1", async () => {
    const h1 = page.locator("h1").first();
    await moveTo(h1, 30);
    await highlight(h1, 12);
    await sleep(5200);
    await clearHighlights();
    await page.mouse.wheel(0, 360);
    await sleep(2500);
  });

  await scene("s2", async () => {
    await page.goto("/app/cases/new");
    await page.waitForLoadState("load");
    await sleep(500);
    const what = page.getByLabel("What did they report?");
    await scrollIntoView(what);
    await click(what);
    await what.pressSequentially("Black mould on the bedroom wall, spreading behind the wardrobe.", { delay: 22 });
    const preview = page.locator("aside").filter({ hasText: "Live preview" }).first();
    const target = (await preview.count()) ? preview : page.getByText("Live preview").locator("..");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(700);
    await moveTo(target, 25);
    await highlight(target, 6);
    await sleep(5200);
    await clearHighlights();
    const submit = page.getByRole("button", { name: /log report/i });
    await scrollIntoView(submit);
    await click(submit);
    await page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}/);
    await sleep(900);
  });

  await scene("s3", async () => {
    await page.goto("/app");
    await page.waitForLoadState("load");
    await sleep(600);
    const rect = await page.evaluate(() => {
      const label = [...document.querySelectorAll("p")].find((p) => p.textContent.trim() === "Past a statutory deadline");
      let el = label;
      while (el && el.parentElement && el.parentElement.children.length < 4) el = el.parentElement;
      const grid = el?.parentElement;
      if (!grid) return null;
      const r = grid.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    if (rect) {
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, { steps: 25 });
      await page.evaluate(({ x, y, w, h }) => {
        const d = document.createElement("div");
        d.className = "rc-hl";
        Object.assign(d.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
        document.body.appendChild(d);
      }, { x: rect.x - 6, y: rect.y - 6, w: rect.width + 12, h: rect.height + 12 });
    }
    await sleep(3200);
    await clearHighlights();
    const list = page.getByRole("region", { name: "Needs attention" });
    await scrollIntoView(list, "start");
    await moveTo(list, 25);
    await highlight(list, 6);
    await sleep(2600);
  });

  await scene("s4", async () => {
    await clearHighlights();
    const row = page.getByRole("link", { name: /LFL-0002/ }).first();
    await click(row);
    await page.waitForURL(/\/app\/cases\//);
    await sleep(500);
    const group = page.getByRole("group").filter({ hasText: "Ask the landlord to approve work" });
    await scrollIntoView(group, "start");
    await click(group.locator("summary"));
    await sleep(400);
    await group.getByLabel("For").selectOption({ label: "Repair work" });
    await click(group.getByLabel("Cost (£, optional)"));
    await group.getByLabel("Cost (£, optional)").pressSequentially("420", { delay: 60 });
    await group.getByLabel("Work to approve").fill("Replace the bathroom extractor fan and treat the bedroom wall.");
    await click(group.getByRole("button", { name: "Send approval link" }));
    const code = group.locator("code", { hasText: "/approve/" });
    await code.waitFor();
    await sleep(900);
    const url = (await code.textContent()).trim().replace("https://repairclock.bygauthier.com", BASE);
    await page.goto(url);
    await page.waitForLoadState("load");
    await sleep(2600);
    const name = page.getByLabel("Type your full name to confirm");
    await scrollIntoView(name);
    await click(name);
    await name.pressSequentially("Northfield Property Holdings", { delay: 25 });
    await click(page.getByRole("button", { name: "Confirm approval" }));
    await sleep(2200);
  });

  await scene("s5", async () => {
    await page.goto("/app");
    await page.waitForLoadState("load");
    const row = page.getByRole("link", { name: /LFL-0003/ }).first();
    await click(row);
    await page.waitForURL(/\/app\/cases\//);
    await sleep(500);
    const letter = page.getByLabel("Written summary text");
    await scrollIntoView(letter, "start");
    await moveTo(letter, 25);
    await highlight(letter, 6);
    await sleep(3000);
    await clearHighlights();
    const issue = page.getByRole("button", { name: "Issue written summary" });
    await scrollIntoView(issue);
    await click(issue);
    const done = page.getByText("Written summary issued and emailed to the tenant.").first();
    await done.waitFor({ timeout: 15000 }).catch(() => {});
    if (await done.count()) await highlight(done, 8);
    await sleep(2200);
  });

  await scene("s6", async () => {
    await clearHighlights();
    await page.goto("/app/cases");
    await page.waitForLoadState("load");
    await click(page.getByRole("link", { name: /LFL-0004/ }).first());
    await page.waitForURL(/\/app\/cases\//);
    await sleep(600);
    const pack = page.getByRole("link", { name: "Evidence pack" }).first();
    await moveTo(pack, 25);
    await highlight(pack, 6);
    await sleep(900);
    await page.mouse.down(); await sleep(120); await page.mouse.up();
    await clearHighlights();
    await page.evaluate((imgs) => {
      const wrap = document.createElement("div");
      Object.assign(wrap.style, { position: "fixed", inset: "0", background: "rgba(20,33,61,.55)", zIndex: 2147483640,
        display: "flex", alignItems: "center", justifyContent: "center", gap: "26px", opacity: "0", transition: "opacity .45s ease" });
      imgs.forEach((src, i) => {
        const im = document.createElement("img");
        im.src = src;
        Object.assign(im.style, { height: "560px", borderRadius: "6px", boxShadow: "0 18px 50px rgba(0,0,0,.35)",
          transform: `translateY(${18 - i * 6}px) rotate(${(i - 1) * 2.2}deg)`, transition: "transform .6s ease" });
        wrap.appendChild(im);
      });
      document.body.appendChild(wrap);
      requestAnimationFrame(() => { wrap.style.opacity = "1"; });
    }, pdfPages);
    await sleep(5200);
  });

  await scene("s7", async () => {
    await page.evaluate(() => {
      document.getElementById("rc-cursor")?.remove();
      const logo = document.querySelector('a[aria-label="RepairClock home"] svg, header svg')?.cloneNode(true);
      const card = document.createElement("div");
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;font:600 30px/1 var(--font-sans, 'IBM Plex Sans', sans-serif);color:#14213d">
          <span id="rc-logo" style="width:48px;height:48px;display:inline-flex"></span>RepairClock</div>
        <h1 style="margin:34px 0 0;font:600 64px/1.06 var(--font-serif, Georgia, serif);color:#14213d;letter-spacing:-.01em;text-align:center">
          Damp &amp; mould deadlines,<br>handled.</h1>
        <p style="margin:30px 0 0;font:500 26px/1.4 var(--font-sans, 'IBM Plex Sans', sans-serif);color:#263352">
          Try the sample agency, no sign-up:</p>
        <p style="margin:8px 0 0;font:600 30px/1.3 var(--font-mono, monospace);color:#c2410c">repairclock.bygauthier.com/demo</p>
        <p style="margin:26px 0 0;font:400 22px/1.4 var(--font-sans, 'IBM Plex Sans', sans-serif);color:#625b4e">
          14-day free trial · no card needed</p>`;
      Object.assign(card.style, { position: "fixed", inset: "0", background: "#f6f3ec", zIndex: 2147483641, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: "0", transition: "opacity .5s ease" });
      document.body.appendChild(card);
      if (logo) {
        logo.removeAttribute("class");
        Object.assign(logo.style, { width: "48px", height: "48px", display: "block" });
        card.querySelector("#rc-logo").appendChild(logo);
      }
      requestAnimationFrame(() => { card.style.opacity = "1"; });
      setTimeout(() => document.querySelectorAll("img[src^='data:image/png']").forEach((i) => i.parentElement?.remove()), 700);
    });
    await sleep(3000);
  });
  await sleep(1200);

  const video = page.video();
  await ctx.close();
  const raw = await video.path();
  fs.renameSync(raw, `${V}/raw/walkthrough.webm`);
  // Voice line files are numbered per scene in order.
  const counters = {};
  for (const t of timeline) { counters[t.id] = (counters[t.id] || 0) + 1; t.file = `${V}/audio/${t.id}-${counters[t.id]}.wav`; }
  fs.writeFileSync(`${V}/raw/timeline.json`, JSON.stringify({ start, end: (Date.now() - t0) / 1000, lines: timeline }, null, 1));
  console.log("recorded; start", start.toFixed(2), "lines", timeline.length);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
