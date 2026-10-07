import { expect, test } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

const GUIDE = "Set up RepairClock in 8 steps";

/** Waits for the anonymous "video_played" event and returns its properties. */
function videoPlayed(page: import("@playwright/test").Page) {
  return page
    .waitForRequest((r) => r.url().endsWith("/api/track") && (r.postData() ?? "").includes("video_played"))
    .then((r) => JSON.parse(r.postData() ?? "{}").props);
}

test("the homepage plays the overview and opens the setup guide beside it", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section#video");
  const overview = section.locator('video[src="/videos/overview.mp4"]');
  await expect(overview).toBeVisible();
  const played = videoPlayed(page);
  await section.getByRole("button", { name: "Play the 90-second overview" }).click();
  await expect(overview).toHaveAttribute("controls", "");
  expect(await played).toEqual({ video: "overview", page: "home" });

  await section.getByRole("button", { name: "Play the setup guide" }).click();
  const dialog = page.getByRole("dialog", { name: GUIDE });
  await expect(dialog.locator("video")).toHaveAttribute("src", "/videos/setup-guide.mp4");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await section.getByRole("link", { name: "See all 8 steps →" }).click();
  await page.waitForURL("**/guide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(GUIDE);
});

test("each step of the guide starts the video at that step", async ({ page }) => {
  await page.goto("/guide");
  const steps = page.getByRole("list", { name: "Steps in this video" }).getByRole("button");
  await expect(steps).toHaveCount(9);
  const played = videoPlayed(page);
  await steps.filter({ hasText: "4. Log a damp or mould report" }).click();
  expect(await played).toEqual({ video: "setup-guide", page: "guide" });
  const video = page.locator('video[src="/videos/setup-guide.mp4"]');
  await expect(video).toHaveAttribute("controls", "");
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(46);
});

test("the demo workspace links to the setup guide", async ({ page }) => {
  await page.goto("/demo");
  await page.locator("form button[type=submit]").first().click();
  await page.waitForURL("**/app");
  const played = videoPlayed(page);
  await page.getByRole("button", { name: "▶ Watch the 2-minute setup guide" }).click();
  const dialog = page.getByRole("dialog", { name: GUIDE });
  await expect(dialog).toBeVisible();
  expect(await played).toEqual({ video: "setup-guide", page: "app" });
  await dialog.getByRole("button", { name: "Close the video" }).click();
  await expect(dialog).toBeHidden();
});

test("a trial workspace keeps the setup guide in the side menu on every page", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/app/properties");
  await page.locator("aside").getByRole("button", { name: "Watch the 2-minute setup guide" }).click();
  await expect(page.getByRole("dialog", { name: GUIDE })).toBeVisible();
});
