import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

test("demo workspace: explore, issue a summary, demo data stays isolated", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/demo");
  await page.getByRole("button", { name: "Open the demo workspace" }).click();
  await page.waitForURL("**/app");
  await expect(page.getByText("Demo workspace.")).toBeVisible();
  await expect(page.getByText("Lothian & Forth Lettings").first()).toBeVisible();
  await expect(page.getByText("Overdue", { exact: true }).first()).toBeVisible();

  // The case whose written summary is due today.
  await page.getByRole("link", { name: /22 Restalrig Avenue/ }).first().click();
  await expect(page.getByText("Demo data: shown as if the 2026 Regulations already apply.")).toBeVisible();
  await expect(page.getByLabel("Written summary text")).toHaveValue(/Sam Reid, Reid Damp Surveys Ltd/);
  await page.getByRole("button", { name: "Issue written summary" }).click();
  await expect(page.getByText(/Written summary issued and emailed to the tenant/).first()).toBeVisible();

  // Demo emails are recorded, never delivered.
  await page.goto("/app/outbox");
  await expect(page.getByText(/emails are never delivered/)).toBeVisible();
  await expect(page.getByText(/Written summary of damp and mould investigation — 22 Restalrig Avenue/).first()).toBeVisible();

  // Billing is disabled for demo workspaces.
  await page.goto("/app/billing");
  await expect(page.getByRole("button", { name: /Choose|Switch to/ })).toHaveCount(0);

  // Evidence pack works on seeded data (letters appended).
  const caseLink = await page.goto("/app/cases?filter=all");
  expect(caseLink?.status()).toBe(200);
  const href = await page.getByRole("link", { name: /41 Easter Road/ }).first().getAttribute("href");
  const pack = await page.request.get(`${href!.replace("/app/cases/", "/api/cases/")}/evidence-pack`);
  expect(pack.status()).toBe(200);
  expect(errors).toEqual([]);
});
