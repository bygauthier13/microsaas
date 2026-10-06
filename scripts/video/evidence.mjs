// Saves the evidence pack PDF of the demo's delay-notice case (LFL-0004) into <work>/evidence/.
import { chromium } from "playwright";
import fs from "node:fs";
const V = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: "http://localhost:3600" });
  await page.goto("/demo");
  await page.locator("form button[type=submit]").first().click();
  await page.waitForURL("**/app");
  await page.goto("/app/cases");
  await page.getByRole("link", { name: /LFL-0004/ }).first().click();
  await page.waitForURL(/\/app\/cases\//);
  const href = await page.getByRole("link", { name: "Evidence pack" }).first().getAttribute("href");
  const res = await page.request.get(href);
  fs.mkdirSync(`${V}/evidence`, { recursive: true });
  fs.writeFileSync(`${V}/evidence/evidence.pdf`, await res.body());
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
