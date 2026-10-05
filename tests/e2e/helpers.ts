import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Correct-horse-battery-9";

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Download the React DevTools|favicon|Blocked script execution in .about:srcdoc./.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
}

/** Sign up and complete onboarding; lands on the "log your first report" page. */
export async function signUpAndOnboard(page: Page, opts: { email?: string; kind?: "Letting agent" | "Private landlord" | "Social landlord"; nation?: "Scotland" | "England"; org?: string } = {}) {
  const email = opts.email ?? uniqueEmail("e2e");
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Robin Test");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /free trial/i }).click();
  await page.waitForURL("**/app/onboarding");
  await page.getByText(opts.kind ?? "Letting agent", { exact: true }).click();
  await page.getByText(opts.nation ?? "Scotland", { exact: true }).click();
  await page.getByLabel(opts.kind === "Private landlord" ? "Name on your letters" : "Organisation name").fill(opts.org ?? "E2E Lettings");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL("**/app/cases/new?first=1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("first");
  return email;
}
