import { expect, test } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

test("a home with an open report can't be archived, even by forcing the form", async ({ page }) => {
  await signUpAndOnboard(page, { org: "Archive Shuffle Lettings" });
  await page.goto("/app/cases/new");
  await page.getByLabel("Address line 1").fill("3 Shuffle Street");
  await page.getByLabel("Town").fill("Glasgow");
  await page.getByLabel("Postcode").fill("g1 1aa");
  await page.getByLabel("Landlord (owner)").selectOption("none");
  await page.getByLabel("What did they report?").fill("Mould on the bathroom ceiling, spreading since last week.");
  await page.getByRole("button", { name: /log report/i }).click();
  await page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}\?created=1/);

  await page.goto("/app/properties");
  const archive = page.getByRole("button", { name: "Archive 3 Shuffle Street" });
  await expect(archive).toBeDisabled();
  await archive.evaluate((el: HTMLButtonElement) => {
    el.disabled = false;
    el.click();
  });
  await page.waitForURL("**/app/properties?error=open_case");
  await expect(page.getByText("This home has an open report.")).toBeVisible();
  await expect(page.getByText("3 Shuffle Street").first()).toBeVisible();
});
