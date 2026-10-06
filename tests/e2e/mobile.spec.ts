import { expect, test } from "@playwright/test";
import { collectErrors, signUpAndOnboard } from "./helpers";

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(scroll).toBeLessThanOrEqual(client + 1);
}

test("@mobile marketing and app are usable on a phone", async ({ page }) => {
  const errors = collectErrors(page);
  for (const path of ["/", "/pricing", "/scotland", "/tools/deadline-calculator", "/demo"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" }).getByText("Pricing")).toBeVisible();

  await signUpAndOnboard(page, { org: "Mobile Lettings" });
  await page.waitForLoadState("networkidle");
  await noHorizontalScroll(page);
  await page.getByLabel("Address line 1").fill("Flat 1, 2 Mobile Street");
  await page.getByLabel("Landlord (owner)").selectOption("none");
  await page.getByLabel("What did they report?").fill("Mould on bathroom ceiling, spreading.");
  await page.getByRole("button", { name: /log report/i }).click();
  await page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}/);
  await noHorizontalScroll(page);
  await expect(page.getByText("What's due")).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("button", { name: "Watch the 2-minute setup guide" })).toBeVisible();
  await page.getByRole("link", { name: "Cases", exact: true }).click();
  await page.waitForURL("**/app/cases");
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
});
