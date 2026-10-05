import { expect, test } from "@playwright/test";
import { PASSWORD, collectErrors, signUpAndOnboard, uniqueEmail } from "./helpers";

test("owner invites a colleague who joins the same workspace", async ({ page, browser }) => {
  const errors = collectErrors(page);
  await signUpAndOnboard(page, { org: "Team Test Lettings" });
  await page.goto("/app/settings");
  await expect(page.getByText("1 of 5 seats")).toBeVisible();
  const colleague = uniqueEmail("colleague");
  await page.getByLabel("Invite a colleague").fill(colleague);
  await page.getByRole("button", { name: "Send invitation" }).click();
  const code = page.locator("code", { hasText: "/invite/" });
  await expect(code).toBeVisible();
  const inviteUrl = new URL(new URL((await code.textContent())!.trim()).pathname, page.url()).toString();
  await page.reload();
  await expect(page.getByText("2 of 5 seats")).toBeVisible();

  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  const otherErrors = collectErrors(other);
  await other.goto(inviteUrl);
  await expect(other.getByRole("heading", { name: "Join Team Test Lettings" })).toBeVisible();
  await other.getByLabel("Your name").fill("Casey Colleague");
  await other.getByLabel("Choose a password").fill(PASSWORD);
  await other.getByRole("button", { name: "Create account & join" }).click();
  await other.waitForURL("**/app");
  await expect(other.getByText("Team Test Lettings").first()).toBeVisible();
  // Members can't change workspace settings.
  await other.goto("/app/settings");
  await expect(other.getByText("Only the workspace owner can change these settings.")).toBeVisible();
  // The link is single-use.
  await ctx.clearCookies();
  await other.goto(inviteUrl);
  await expect(other.getByText("This invitation isn't valid")).toBeVisible();
  expect(otherErrors).toEqual([]);
  await ctx.close();

  await page.reload();
  await expect(page.getByText("Casey Colleague")).toBeVisible();
  expect(errors).toEqual([]);
});
