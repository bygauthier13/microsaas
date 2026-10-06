import { expect, test } from "@playwright/test";
import { collectErrors, signUpAndOnboard, uniqueEmail } from "./helpers";

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

test("a plan smaller than the workspace can't be bought, even by forcing the form", async ({ page }) => {
  await signUpAndOnboard(page, { org: "Seat Squeeze Lettings" });
  await page.goto("/app/settings");
  await page.getByLabel("Invite a colleague").fill(uniqueEmail("colleague"));
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.locator("code", { hasText: "/invite/" })).toBeVisible();

  await page.goto("/app/billing");
  const landlord = page.getByRole("button", { name: "Over 1 team members" });
  await expect(landlord).toBeDisabled();
  // Re-enable the button in the page and submit anyway: the server must refuse.
  await landlord.evaluate((el: HTMLButtonElement) => {
    el.disabled = false;
    el.click();
  });
  await page.waitForURL("**/app/billing?error=too_small");
  await expect(page.getByText("That plan is smaller than your workspace")).toBeVisible();
  await expect(page.getByText("Free trial").first()).toBeVisible();
});
