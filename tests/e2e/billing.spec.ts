import { expect, test } from "@playwright/test";
import { collectErrors, signUpAndOnboard } from "./helpers";

test("simulated billing: upgrade, cancel at period end, resume", async ({ page }) => {
  const errors = collectErrors(page);
  await signUpAndOnboard(page, { org: "Billing Test Lettings" });
  await page.goto("/app/billing");
  await expect(page.getByText("Free trial").first()).toBeVisible();
  await expect(page.getByText("Simulated billing mode")).toBeVisible();
  await page.getByRole("button", { name: "Choose Agent" }).click();
  await page.waitForURL("**/app/billing?checkout=success");
  await expect(page.getByText("You're subscribed — thank you!")).toBeVisible();
  await expect(page.getByText("Your plan", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Cancel plan" }).click();
  await page.waitForURL("**/app/billing?canceled=1");
  await expect(page.getByText("Cancels at period end")).toBeVisible();
  await page.getByRole("button", { name: "Resume plan" }).click();
  await page.waitForURL("**/app/billing?resumed=1");
  await expect(page.getByText("Your plan will continue to renew.")).toBeVisible();

  // Annual toggle shows annual prices.
  await page.getByRole("tab", { name: /Annual/ }).click();
  await expect(page.getByText("£990").first()).toBeVisible();
  expect(errors).toEqual([]);
});
