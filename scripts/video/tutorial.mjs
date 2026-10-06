// Records the step-by-step tutorial on a fresh workspace: sign up, set up the agency, import homes, log a report,
// get the landlord's approval, record the visit and issue the written summary, invite a colleague, open the plans.
// Shows a step banner, "click here" tips and captions, and writes the video plus when each voice line starts.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";

const V = process.argv[2];
const BASE = "http://localhost:3600";
const W = 1280;
const H = 720;
const FPS = 25;
const BAR = 56; // height of the step banner
const GAP = 0.15; // seconds between two voice lines of a step
const STEP_GAP = 0.5; // ...and before a new step
const steps = JSON.parse(fs.readFileSync(new URL("./tutorial.json", import.meta.url), "utf8"));
const lines = Object.fromEntries(JSON.parse(fs.readFileSync(`${V}/audio/lines.json`, "utf8")).map((l) => [`${l.id}:${l.k}`, l]));
const CSV = new URL("./tutorial-homes.csv", import.meta.url).pathname;
const titles = steps.filter((s) => s.step >= 1 && s.step <= 8).map((s) => s.title);

const OVERLAY = ({ titles, bar }) => {
  const install = () => {
    if (document.getElementById("rc-bar")) return;
    const sans = '"IBM Plex Sans", var(--font-sans), system-ui, sans-serif';
    const style = document.createElement("style");
    style.textContent = `
      body{padding-top:${bar}px!important}
      main{padding-bottom:180px!important}
      .sticky.top-0{top:${bar}px!important}
      aside.sticky.h-screen{height:calc(100vh - ${bar}px)!important}
      .lg\\:top-6{top:${bar + 24}px!important}
      html{scroll-padding-top:${bar + 24}px}
      [aria-live="polite"].fixed.bottom-4{bottom:92px!important}
      [data-rc-hide]{display:none!important}
      #rc-bar{position:fixed;left:0;right:0;top:0;height:${bar}px;z-index:2147483600;background:#14213d;color:#fff;display:flex;
        align-items:center;justify-content:space-between;padding:0 26px;font-family:${sans};box-shadow:0 2px 12px rgba(20,33,61,.25)}
      #rc-bar .l{display:flex;align-items:center;gap:14px;min-width:0}
      #rc-bar .pill{background:#c2410c;color:#fff;font-weight:700;font-size:13px;letter-spacing:.09em;padding:6px 11px;border-radius:999px;white-space:nowrap}
      #rc-bar .t{font-weight:600;font-size:21px;white-space:nowrap}
      #rc-bar .p{display:flex;gap:6px}
      #rc-bar .p i{display:block;width:34px;height:7px;border-radius:4px;background:rgba(255,255,255,.22);transition:background .5s ease}
      #rc-bar .p i.done{background:#f08a4b}
      #rc-bar .p i.now{background:#fff}
      #rc-cursor{position:fixed;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;background:rgba(194,65,12,.22);
        border:2.5px solid #c2410c;z-index:2147483647;pointer-events:none;transition:transform .12s ease}
      #rc-cursor.down{transform:scale(.65);background:rgba(194,65,12,.55)}
      #rc-cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);width:min(980px,calc(100% - 80px));padding:11px 22px;border-radius:12px;
        background:rgba(20,33,61,.94);color:#fff;font:500 21px/1.4 ${sans};text-align:center;z-index:2147483610;pointer-events:none;
        box-shadow:0 10px 30px rgba(20,33,61,.28)}
      #rc-cap:empty{display:none}
      .rc-hl{position:fixed;border:3px solid #c2410c;border-radius:14px;box-shadow:0 0 0 9999px rgba(20,33,61,.18);z-index:2147483590;
        pointer-events:none;animation:rc-in .3s ease}
      .rc-ring{position:fixed;border:3px solid #c2410c;border-radius:12px;z-index:2147483591;pointer-events:none;animation:rc-pulse 1.1s ease-out infinite}
      .rc-tip{position:fixed;z-index:2147483592;pointer-events:none;background:#c2410c;color:#fff;font:600 18px/1.25 ${sans};padding:9px 14px;
        border-radius:10px;box-shadow:0 8px 24px rgba(20,33,61,.3);white-space:nowrap;animation:rc-pop .25s ease}
      .rc-tip:after{content:"";position:absolute;left:var(--ax,24px);width:12px;height:12px;margin-left:-6px;background:#c2410c;transform:rotate(45deg)}
      .rc-tip.below:after{top:-6px}
      .rc-tip.above:after{bottom:-6px}
      #rc-chip{position:fixed;right:26px;top:${bar + 16}px;z-index:2147483593;background:#14213d;color:#fff;font:600 16px/1 ${sans};padding:11px 16px;
        border-radius:999px;box-shadow:0 8px 20px rgba(20,33,61,.25);pointer-events:none}
      #rc-chip:empty{display:none}
      #rc-card{position:fixed;left:0;right:0;top:${bar}px;bottom:0;z-index:2147483595;display:flex;align-items:center;justify-content:center;
        background:rgba(246,243,236,.74);backdrop-filter:blur(3px);opacity:0;transition:opacity .3s ease;pointer-events:none}
      #rc-card.on{opacity:1}
      #rc-card .c{background:#fff;border:1px solid #e6e0d2;border-radius:22px;padding:34px 52px 40px;min-width:560px;text-align:center;
        box-shadow:0 24px 60px rgba(20,33,61,.18);transform:scale(.96);transition:transform .35s ease}
      #rc-card.on .c{transform:none}
      #rc-card .n{font:700 15px/1 ${sans};letter-spacing:.14em;color:#c2410c;text-transform:uppercase}
      #rc-card .h{margin-top:14px;font:600 46px/1.1 var(--font-serif,Georgia,serif);color:#14213d}
      #rc-full{position:fixed;inset:0;z-index:2147483620;background:#f6f3ec;display:flex;flex-direction:column;align-items:center;justify-content:center;
        opacity:0;transition:opacity .5s ease;font-family:${sans};color:#14213d}
      #rc-full.on{opacity:1}
      #rc-full .brand{display:flex;align-items:center;gap:14px;font-weight:600;font-size:28px}
      #rc-full .brand svg{width:44px;height:44px;display:block}
      #rc-full h1{margin:26px 0 0;font:600 54px/1.08 var(--font-serif,Georgia,serif);letter-spacing:-.01em;text-align:center}
      #rc-full ol{list-style:none;margin:34px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,330px));gap:14px 44px}
      #rc-full li{display:flex;align-items:center;gap:14px;font-size:21px;font-weight:500;opacity:0;animation:rc-rise .45s ease forwards}
      #rc-full li b{flex:none;width:34px;height:34px;border-radius:50%;background:#14213d;color:#fff;display:flex;align-items:center;justify-content:center;
        font-size:16px;font-weight:700}
      #rc-full.done li b{background:#c2410c}
      #rc-full .foot{margin-top:34px;font-size:21px;color:#625b4e;text-align:center;line-height:1.5}
      #rc-full .url{margin-top:6px;font:600 34px/1.2 var(--font-mono,monospace);color:#c2410c}
      @keyframes rc-pulse{0%{box-shadow:0 0 0 0 rgba(194,65,12,.5)}100%{box-shadow:0 0 0 14px rgba(194,65,12,0)}}
      @keyframes rc-pop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
      @keyframes rc-in{from{opacity:0}to{opacity:1}}
      @keyframes rc-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(style);

    const el = (tag, id) => Object.assign(document.createElement(tag), id ? { id } : {});
    const barEl = el("div", "rc-bar");
    const cursor = el("div", "rc-cursor");
    const cap = el("div", "rc-cap");
    const chip = el("div", "rc-chip");
    const pos = JSON.parse(sessionStorage.getItem("rc-pos") || "[640,360]");
    cursor.style.left = pos[0] + "px";
    cursor.style.top = pos[1] + "px";
    cap.textContent = sessionStorage.getItem("rc-cap") || "";
    chip.textContent = sessionStorage.getItem("rc-chip") || "";
    document.body.append(barEl, cap, chip, cursor);

    const renderBar = (n) => {
      const pill = n === 0 ? "Tutorial" : n > titles.length ? "Done" : `Step ${n} of ${titles.length}`;
      const title = n === 0 ? "Get started with RepairClock" : n > titles.length ? "You’re all set" : titles[n - 1];
      barEl.innerHTML = `<div class="l"><span class="pill">${pill.toUpperCase()}</span><span class="t"></span></div><div class="p">${titles
        .map((_, i) => `<i class="${i + 1 < n ? "done" : i + 1 === n ? "now" : ""}"></i>`)
        .join("")}</div>`;
      barEl.querySelector(".t").textContent = title;
    };
    renderBar(Number(sessionStorage.getItem("rc-step") || 0));

    const clear = () => document.querySelectorAll(".rc-hl,.rc-ring,.rc-tip").forEach((e) => e.remove());
    const box = (cls, r) => {
      const d = el("div");
      d.className = cls;
      Object.assign(d.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
      document.body.appendChild(d);
      return d;
    };
    const logo = () => {
      const svg = document.querySelector('a[aria-label="RepairClock home"] svg')?.cloneNode(true);
      if (svg) svg.removeAttribute("class");
      return svg;
    };

    window.__rc = {
      caption(t) { sessionStorage.setItem("rc-cap", t); cap.textContent = t; },
      chip(t) { sessionStorage.setItem("rc-chip", t); chip.textContent = t; },
      step(n) { sessionStorage.setItem("rc-step", String(n)); renderBar(n); },
      clear,
      hl(r) { document.querySelectorAll(".rc-hl").forEach((e) => e.remove()); box("rc-hl", r); },
      ring(r) { box("rc-ring", r); },
      tip(r, text) {
        const t = el("div");
        t.className = "rc-tip";
        t.textContent = text;
        document.body.appendChild(t);
        const tw = t.offsetWidth;
        const below = r.y + r.h + 14 + t.offsetHeight < innerHeight - 96;
        const left = Math.max(16, Math.min(innerWidth - tw - 16, r.x + Math.min(r.w / 2, 60) - 24));
        t.classList.add(below ? "below" : "above");
        t.style.left = left + "px";
        t.style.top = (below ? r.y + r.h + 14 : r.y - t.offsetHeight - 14) + "px";
        t.style.setProperty("--ax", Math.max(18, Math.min(tw - 18, r.x + Math.min(r.w / 2, 60) - left)) + "px");
      },
      card(n) {
        document.getElementById("rc-card")?.remove();
        const c = el("div", "rc-card");
        c.innerHTML = `<div class="c"><div class="n">Step ${n} of ${titles.length}</div><div class="h"></div></div>`;
        c.querySelector(".h").textContent = titles[n - 1];
        document.body.appendChild(c);
        requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("on")));
      },
      uncard() {
        const c = document.getElementById("rc-card");
        if (!c) return;
        c.classList.remove("on");
        setTimeout(() => c.remove(), 400);
      },
      full(kind) {
        document.getElementById("rc-full")?.remove();
        cursor.style.display = "none";
        const f = el("div", "rc-full");
        const done = kind === "outro";
        if (done) f.classList.add("done");
        const check = '<svg viewBox="0 0 16 16" width="18" height="18"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        f.innerHTML = `<div class="brand"><span class="m"></span>RepairClock</div>
          <h1>${done ? "You’re all set!" : `Get started in ${titles.length} simple steps`}</h1>
          <ol>${titles.map((t, i) => `<li style="animation-delay:${(done ? 0.15 : 0.5) + i * (done ? 0.08 : 0.32)}s"><b>${done ? check : i + 1}</b><span></span></li>`).join("")}</ol>
          ${done
            ? `<p class="foot">Start your free trial at</p><p class="url">repairclock.bygauthier.com</p>
               <p class="foot" style="margin-top:18px;font-size:19px">14 days free · no card needed · questions? hello@bygauthier.com</p>`
            : `<p class="foot">Free for 14 days · no card needed</p>`}`;
        f.querySelectorAll("li span").forEach((s, i) => (s.textContent = titles[i]));
        const m = logo();
        if (m) f.querySelector(".m").appendChild(m);
        document.body.appendChild(f);
        requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("on")));
      },
      unfull() {
        const f = document.getElementById("rc-full");
        if (!f) return;
        f.classList.remove("on");
        cursor.style.display = "";
        setTimeout(() => f.remove(), 600);
      },
    };

    document.addEventListener("mousemove", (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
      sessionStorage.setItem("rc-pos", JSON.stringify([e.clientX, e.clientY]));
    }, true);
    document.addEventListener("mousedown", () => cursor.classList.add("down"), true);
    document.addEventListener("mouseup", () => cursor.classList.remove("down"), true);

    // Notices about this local server don't belong in the video, and links show the real address.
    const tidy = () => {
      document.querySelectorAll('[role="status"]').forEach((s) => {
        if (/^(Simulated billing mode|Card payments open soon)/.test(s.textContent.trim())) s.setAttribute("data-rc-hide", "");
      });
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeValue.includes("localhost:3600")) n.nodeValue = n.nodeValue.replace(/http:\/\/localhost:3600/g, "https://repairclock.bygauthier.com");
      }
    };
    tidy();
    new MutationObserver(tidy).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let current; // the page, for a screenshot if a step fails

// Screen recording from the browser's own frames and their timestamps, at a steady 25 fps (Playwright's
// recorder stretches the video whenever frames come faster than that). While paused, nothing is written:
// that is how waits for the server are cut out.
async function startRecording(page, file, t0) {
  const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "pipe:0",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", file], { stdio: ["pipe", "inherit", "inherit"] });
  const cdp = await page.context().newCDPSession(page);
  const clock = () => (Date.now() - t0) / 1000;
  let last = null;
  let next = null;
  let first = null;
  let paused = false;
  const flush = (until) => {
    while (last && next !== null && next <= until) {
      ff.stdin.write(last);
      next += 1 / FPS;
    }
  };
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    const ts = metadata.timestamp ? metadata.timestamp - t0 / 1000 : clock();
    if (first === null) first = next = ts;
    if (!paused) flush(ts);
    last = Buffer.from(data, "base64");
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  return {
    pause() { flush(clock()); paused = true; },
    resume() { next = clock(); paused = false; },
    async stop() {
      flush(clock());
      await cdp.send("Page.stopScreencast").catch(() => {});
      ff.stdin.end();
      await new Promise((r) => ff.on("close", r));
      return first;
    },
  };
}

(async () => {
  // British date and time formats in form fields.
  const browser = await chromium.launch({ args: ["--lang=en-GB"], env: { ...process.env, LANG: "en_GB.UTF-8" } });
  const ctx = await browser.newContext({
    baseURL: BASE,
    viewport: { width: W, height: H },
    locale: "en-GB",
    timezoneId: "Europe/London",
  });
  await ctx.addInitScript(OVERLAY, { titles, bar: BAR });
  const page = await ctx.newPage();
  current = page;
  const t0 = Date.now();
  const rec = await startRecording(page, `${V}/raw/walkthrough.mp4`, t0);
  let cut = 0; // seconds of waiting cut out of the video so far
  const now = () => (Date.now() - t0) / 1000 - cut;

  const ui = async (fn, ...args) => {
    try { return await page.evaluate(([f, a]) => window.__rc && window.__rc[f](...a), [fn, args]); } catch { return undefined; }
  };
  const rectOf = async (locator, pad = 6) => {
    const b = await locator.boundingBox();
    return b && { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
  };
  const show = async (locator, block = "center") => {
    const b = await locator.boundingBox();
    if (b && b.y > BAR + 12 && b.y + b.height < H - 100) return;
    await locator.evaluate((e, blk) => e.scrollIntoView({ behavior: "smooth", block: blk }), block);
    await sleep(750);
  };
  const moveTo = async (locator, steps = 20) => {
    const b = await locator.boundingBox();
    if (b) await page.mouse.move(b.x + Math.min(b.width / 2, 90), b.y + b.height / 2, { steps });
  };
  const highlight = async (locator, pad = 6, block) => {
    await show(locator, block);
    const r = await rectOf(locator, pad);
    if (r) await ui("hl", r);
  };
  const tip = async (locator, text, pad = 5) => {
    await show(locator);
    const r = await rectOf(locator, pad);
    if (!r) return;
    await ui("ring", r);
    await ui("tip", r, text);
  };
  const tipClick = async (locator, text, hold = 700) => {
    await ui("clear");
    await tip(locator, text);
    await moveTo(locator);
    await sleep(hold);
    await locator.click();
    await ui("clear");
  };
  const type = async (locator, text, delay = 38) => {
    await show(locator);
    await moveTo(locator, 14);
    await locator.click();
    await locator.pressSequentially(text, { delay });
  };

  // Voice lines: a line starts once the one before has finished; the actions run while it plays.
  const timeline = [];
  let voiceEnd = 0;
  const say = async (id, k) => {
    const l = lines[`${id}:${k}`];
    const wait = voiceEnd + (k === 0 ? STEP_GAP : GAP) - now();
    if (wait > 0) await sleep(wait * 1000);
    const at = now();
    timeline.push({ id, k, file: l.file, from: l.from, to: l.to, gain: l.gain, at });
    voiceEnd = at + l.seconds;
    await ui("caption", l.cap);
  };
  const quiet = async (extra = 0) => {
    const w = voiceEnd + extra - now();
    if (w > 0) await sleep(w * 1000);
  };
  // Waits for the server; once the voice has finished, the rest of the wait is cut from the video.
  const waitCut = async (promise) => {
    let settled = false;
    const done = promise.then(() => (settled = true), () => (settled = true));
    await Promise.race([done, quiet(0.35)]);
    if (!settled) {
      rec.pause();
      const from = now();
      await done;
      await sleep(250);
      cut += now() - from;
      rec.resume();
    }
    return promise;
  };
  const stepStart = async (n, id) => {
    await say(id, 0);
    await ui("clear");
    await ui("step", n);
    await ui("card", n);
    await sleep(1900);
    await ui("uncard");
    await sleep(350);
  };
  const nav = page.getByRole("navigation", { name: "Main" });

  // Intro: what the video covers.
  await page.goto("/");
  await page.waitForLoadState("load");
  await ui("step", 0);
  await ui("full", "intro");
  await sleep(900);
  const start = now();
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
  await ui("full", "outro");
  await quiet(2.0);
  const end = now();

  const videoStart = await rec.stop();
  await ctx.close();
  fs.writeFileSync(`${V}/raw/timeline.json`, JSON.stringify({ video: `${V}/raw/walkthrough.mp4`, videoStart, start, end, cut, lines: timeline }, null, 1));
  console.log("recorded", (end - start).toFixed(1), "s,", timeline.length, "voice lines,", cut.toFixed(1), "s of waiting cut");
  await browser.close();
})().catch(async (e) => {
  console.error(e);
  if (current) await current.screenshot({ path: `${V}/raw/failed.png` }).then(() => console.error("at", current.url(), "- screenshot in raw/failed.png")).catch(() => {});
  process.exit(1);
});
