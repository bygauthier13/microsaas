import { expect, test } from "@playwright/test";
import { collectErrors, signUpAndOnboard } from "./helpers";

test("error states and access control", async ({ page, request }) => {
  const errors = collectErrors(page);
  // Public: invalid approval link, reset link, forgot-password never reveals accounts.
  await page.goto("/approve/not-a-real-token");
  await expect(page.getByText("This link isn't valid")).toBeVisible();
  await page.goto("/forgot-password");
  await page.getByLabel("Work email").fill("nobody@example.com");
  await page.getByRole("button", { name: "Email me a reset link" }).click();
  await expect(page.getByText(/If an account exists for that address/)).toBeVisible();
  await page.goto("/reset-password?token=bogus");
  await page.getByLabel("New password").fill("Another-long-password-1");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText(/expired or was already used/)).toBeVisible();

  // Wrong password.
  await page.goto("/login");
  await page.getByLabel("Work email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("That email and password don't match.")).toBeVisible();

  // APIs refuse anonymous access.
  expect((await request.get("/api/documents/00000000-0000-0000-0000-000000000000")).status()).toBe(401);
  expect((await request.get("/api/cases/00000000-0000-0000-0000-000000000000/evidence-pack")).status()).toBe(401);
  expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(503);
  expect((await request.post("/api/track", { data: JSON.stringify({ event: "signup_completed" }) })).status()).toBe(400);

  // Signed in: unknown case → 404; form validation errors render inline.
  await signUpAndOnboard(page, { org: "Errors Test Lettings" });
  const res = await page.goto("/app/cases/00000000-0000-0000-0000-000000000000");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("We couldn't find that page")).toBeVisible();
  // The browser logs the deliberate 404 as a failed resource load; that one is expected.
  errors.splice(0, errors.length, ...errors.filter((e) => !e.includes("status of 404")));
  await page.goto("/app/cases/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Address line 1").fill("1 Test Street");
  await page.getByLabel("What did they report?").fill("Mould");
  await page.locator("#aware_date").fill("2030-01-01");
  await page.locator("#aware_date").evaluate((el) => el.removeAttribute("max"));
  await page.getByRole("button", { name: /log report/i }).click();
  // Server-side validation: the landlord choice is checked first, and nothing typed is lost.
  await expect(page.getByText("Enter the landlord's name (or choose “No landlord”).")).toBeVisible();
  await expect(page.getByLabel("What did they report?")).toHaveValue("Mould");
  await expect(page.getByLabel("Address line 1")).toHaveValue("1 Test Street");
  await page.getByLabel("Landlord (owner)").selectOption("none");
  await page.getByRole("button", { name: /log report/i }).click();
  await expect(page.getByText(/can't be in the future/)).toBeVisible();
  expect(errors).toEqual([]);
});
