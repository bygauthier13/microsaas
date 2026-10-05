import { expect, test, type Page } from "@playwright/test";

/**
 * The full customer journey: sign up → onboard → log a report → investigate → issue the
 * written summary → landlord approval via the public link → start repairs → upload a photo →
 * evidence pack → export → sign out → protected routes.
 */

const PASSWORD = "Correct-horse-battery-9";

// 1×1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Download the React DevTools|favicon|Blocked script execution in .about:srcdoc./.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function signUp(page: Page, email: string, name = "Alex Morgan") {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /free trial|create account/i }).click();
  await page.waitForURL("**/app/onboarding");
}

test("full agent journey", async ({ page, browser }) => {
  const errors = collectErrors(page);
  const email = `alex+${Date.now()}@example.com`;

  await signUp(page, email);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Onboarding
  await page.getByText("Letting agent", { exact: true }).click();
  await page.getByText("Scotland", { exact: true }).click();
  await page.getByLabel("Organisation name").fill("Lothian Lettings Test");
  await page.getByLabel("Roughly how many homes?").fill("180");
  await page.getByLabel("Phone for tenants").fill("0131 555 0100");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL("**/app/cases/new?first=1");

  // Log the first report with a new home + landlord
  await page.getByLabel("Address line 1").fill("Flat 2/1, 14 Dalmeny Street");
  await page.getByLabel("Town").fill("Edinburgh");
  await page.getByLabel("Postcode").fill("eh6 8pg");
  await page.getByLabel("Tenant name").fill("Jamie Reid");
  await page.getByLabel("Tenant email").fill("jamie.tenant@example.com");
  await page.getByLabel("Landlord (owner)").selectOption("new");
  await page.getByLabel("Landlord name").fill("Morag Campbell");
  await page.getByLabel("Landlord email").fill("morag.landlord@example.com");
  await page.getByLabel("What did they report?").fill("Black mould spreading across the bedroom ceiling above the window, about 1m². Came back after cleaning.");
  await expect(page.getByText("Live preview")).toBeVisible();
  await page.getByRole("button", { name: /log report/i }).click();
  await page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}\?created=1/);
  const caseUrl = page.url().split("?")[0];
  await expect(page.getByText("Report logged — the statutory clock is running")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What's due" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Investigation by a competent person/ })).toBeVisible();

  // Record the investigation
  await page.getByLabel("Who investigated").fill("Sam Reid, Reid Damp Surveys Ltd");
  await page.getByText("No — repair work is needed").click();
  await page.getByLabel("What was found").fill("Black mould approx 1.2m2 on bedroom ceiling. Surface moisture 28% WME. Bathroom extractor fan not working.");
  await page.getByLabel("Likely cause").selectOption("ventilation");
  await page.getByLabel("Repair work required").fill("Replace bathroom extractor fan; treat and redecorate bedroom ceiling");
  await page.getByRole("button", { name: "Record investigation" }).click();
  await expect(page.getByText("Investigation recorded.").first()).toBeVisible();

  // Written summary: generated draft + content check, then issue by email
  await page.reload();
  const summary = page.getByLabel("Written summary text");
  await expect(summary).toBeVisible();
  await expect(summary).toHaveValue(/NOT currently substantially free from damp and mould/);
  await expect(summary).toHaveValue(/Sam Reid, Reid Damp Surveys Ltd/);
  await expect(page.getByText("States whether the home is substantially free from damp and mould")).toBeVisible();
  await page.getByRole("button", { name: "Issue written summary" }).click();
  await expect(page.getByText(/Written summary issued and emailed to the tenant/).first()).toBeVisible();

  // Landlord approval request → public link
  await page.reload();
  await page.getByText("Ask the landlord to approve work").click();
  await page.getByLabel("Cost (£, optional)").fill("420");
  await page.getByLabel("Work to approve").fill("Replace bathroom extractor fan and treat bedroom ceiling");
  await page.getByRole("button", { name: "Send approval link" }).click();
  const linkCode = page.locator("code", { hasText: "/approve/" });
  await expect(linkCode).toBeVisible();
  // The link is built from APP_URL; follow its path on whichever server is under test.
  const approveUrl = new URL(new URL((await linkCode.textContent())!.trim()).pathname, page.url()).toString();

  const landlordCtx = await browser.newContext();
  const landlord = await landlordCtx.newPage();
  const landlordErrors = collectErrors(landlord);
  await landlord.goto(approveUrl);
  await expect(landlord.getByRole("heading", { name: /Approve repair work at Flat 2\/1/ })).toBeVisible();
  await expect(landlord.getByText("£420.00")).toBeVisible();
  await landlord.getByLabel("Type your full name to confirm").fill("Morag Campbell");
  await landlord.getByRole("button", { name: "Confirm approval" }).click();
  await expect(landlord.getByText(/your approval has been recorded/)).toBeVisible();
  // A second visit shows the decision instead of the form.
  await landlord.reload();
  await expect(landlord.getByText("This request was approved")).toBeVisible();
  expect(landlordErrors).toEqual([]);
  await landlordCtx.close();

  await page.goto(caseUrl);
  await expect(page.getByText("approved", { exact: true })).toBeVisible();
  await expect(page.getByText(/Morag Campbell approved the repair work/)).toBeVisible();

  // Repairs begin
  await page.getByLabel("What work began").fill("Extractor fan replaced; ceiling mould treatment started.");
  await page.getByRole("button", { name: "Record start of work" }).click();
  await expect(page.getByText("Repair start recorded.").first()).toBeVisible();

  // Upload a photo
  await page.reload();
  await page.getByText("Upload photos, reports or quotes").click();
  await page.setInputFiles("#files", { name: "ceiling.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("Uploaded 1 file.").first()).toBeVisible();

  // Evidence pack + CSV export
  const pack = await page.request.get(`${caseUrl.replace("/app/cases/", "/api/cases/")}/evidence-pack`);
  expect(pack.status()).toBe(200);
  expect(pack.headers()["content-type"]).toBe("application/pdf");
  expect((await pack.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const csv = await page.request.get("/api/export/cases");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Dalmeny Street");

  // Dashboard + lists
  await page.goto("/app");
  await expect(page.getByText("14 Dalmeny Street").first()).toBeVisible();
  await page.goto("/app/cases?filter=all");
  await expect(page.getByText("Flat 2/1, 14 Dalmeny Street").first()).toBeVisible();

  // Sent emails are visible in the outbox (no email provider configured in tests)
  await page.goto("/app/outbox");
  await expect(page.getByText(/Written summary of damp and mould investigation/).first()).toBeVisible();

  // Sign out → protected routes bounce to login
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.waitForURL((url) => url.pathname === "/");
  await page.goto("/app/cases");
  await page.waitForURL("**/login**");
  const unauth = await page.request.get("/api/export/cases");
  expect(unauth.status()).toBe(401);

  expect(errors).toEqual([]);
});

test("validation errors are shown inline", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Short Pass");
  await page.getByLabel("Work email").fill(`short+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("abc");
  // Bypass the browser's minLength check to exercise server-side validation.
  await page.locator("#password").evaluate((el) => el.removeAttribute("minlength"));
  await page.getByRole("button", { name: /free trial|create account/i }).click();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
});
