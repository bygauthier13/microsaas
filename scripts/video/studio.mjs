// Shared by the video recorders: an overlay drawn over the app (cursor, captions, highlights, "Click …" tips,
// an optional step banner with title cards, full-screen cards), a screen recorder that keeps the video in step
// with the clock, and the timing of the voice lines.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";

export const BASE = "http://localhost:3600";
export const W = 1280;
export const H = 720;
const FPS = 25;
const GAP = 0.15; // seconds between two voice lines of a scene
const SCENE_GAP = 0.5; // ...and before a new scene
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OVERLAY = ({ titles, bar }) => {
  const install = () => {
    if (document.getElementById("rc-cursor")) return;
    const sans = '"IBM Plex Sans", var(--font-sans), system-ui, sans-serif';
    const style = document.createElement("style");
    style.textContent = `
      ${bar ? `body{padding-top:${bar}px!important}
      .sticky.top-0{top:${bar}px!important}
      aside.sticky.h-screen{height:calc(100vh - ${bar}px)!important}
      .lg\\:top-6{top:${bar + 24}px!important}
      html{scroll-padding-top:${bar + 24}px}` : ""}
      main{padding-bottom:180px!important}
      [aria-live="polite"].fixed.bottom-4{bottom:92px!important}
      [data-rc-hide],section[aria-labelledby="tour-heading"]{display:none!important}
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
    document.body.append(...(bar ? [barEl] : []), cap, chip, cursor);

    const renderBar = (n) => {
      if (!bar) return;
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
      press() { cursor.classList.add("down"); setTimeout(() => cursor.classList.remove("down"), 160); },
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
      // A full-screen card; elements with class "m" get the logo.
      full(html, cls = "") {
        document.getElementById("rc-full")?.remove();
        cursor.style.display = "none";
        const f = el("div", "rc-full");
        if (cls) f.className = cls;
        f.innerHTML = html;
        f.querySelectorAll(".m").forEach((m) => {
          const svg = logo();
          if (svg) m.appendChild(svg);
        });
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

    // Notices about this local server and the demo don't belong in the video, and links show the real address.
    const tidy = () => {
      document.querySelectorAll('[role="status"]').forEach((s) => {
        if (/^(Simulated billing mode|Card payments open soon|Demo data:)/.test(s.textContent.trim())) s.setAttribute("data-rc-hide", "");
      });
      document.querySelectorAll("span.font-semibold").forEach((s) => {
        if (s.textContent.trim() === "Demo workspace.") s.parentElement?.setAttribute("data-rc-hide", "");
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

/**
 * Records `scenes(studio)` into the work folder V: raw/walkthrough.mp4, plus raw/timeline.json with when each
 * voice line from audio/lines.json starts. `bar` is the height of the step banner (0 for none) and `titles` the
 * step names it shows; `storageState` signs the browser in. If a scene fails, raw/failed.png shows where.
 */
export async function record(V, { titles = [], bar = 0, storageState } = {}, scenes) {
  const lines = Object.fromEntries(JSON.parse(fs.readFileSync(`${V}/audio/lines.json`, "utf8")).map((l) => [`${l.id}:${l.k}`, l]));
  // British date and time formats in form fields.
  const browser = await chromium.launch({ args: ["--lang=en-GB"], env: { ...process.env, LANG: "en_GB.UTF-8" } });
  let page;
  try {
    const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: W, height: H }, locale: "en-GB", timezoneId: "Europe/London", storageState });
    await ctx.addInitScript(OVERLAY, { titles, bar });
    page = await ctx.newPage();
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
      if (b && b.y > bar + 12 && b.y + b.height < H - 100) return;
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
    const click = async (locator) => {
      await show(locator);
      await moveTo(locator);
      await sleep(200);
      await locator.click();
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
      const wait = voiceEnd + (k === 0 ? SCENE_GAP : GAP) - now();
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
    // First line of a step: the banner moves on and the step's title card shows while it plays.
    const stepStart = async (n, id) => {
      await say(id, 0);
      await ui("clear");
      await ui("step", n);
      await ui("card", n);
      await sleep(1900);
      await ui("uncard");
      await sleep(350);
    };

    let start = 0;
    await scenes({ page, ui, rectOf, show, moveTo, highlight, tip, click, tipClick, type, say, quiet, waitCut, stepStart, begin: () => (start = now()) });
    const end = now();

    const videoStart = await rec.stop();
    await ctx.close();
    fs.writeFileSync(`${V}/raw/timeline.json`, JSON.stringify({ video: `${V}/raw/walkthrough.mp4`, videoStart, start, end, cut, lines: timeline }, null, 1));
    console.log("recorded", (end - start).toFixed(1), "s,", timeline.length, "voice lines,", cut.toFixed(1), "s of waiting cut");
  } catch (e) {
    if (page) await page.screenshot({ path: `${V}/raw/failed.png` }).then(() => console.error("at", page.url(), "- screenshot in raw/failed.png")).catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}
