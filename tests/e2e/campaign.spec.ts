import { expect, test } from "@playwright/test";

const isBeacon = (url: string) => url.endsWith("/api/track");

test("a visit from an outreach email is counted with the email's name", async ({ page }) => {
  const beacon = page.waitForRequest((r) => isBeacon(r.url()) && (r.postData() ?? "").includes("landing_visited"));
  await page.goto("/?from=email1");
  expect(JSON.parse((await beacon).postData() ?? "{}")).toEqual({ event: "landing_visited", props: { campaign: "email1", path: "/" } });
});

test("ordinary visits and odd values send nothing", async ({ page }) => {
  const sent: string[] = [];
  page.on("request", (r) => {
    if (isBeacon(r.url())) sent.push(r.postData() ?? "");
  });
  await page.goto("/");
  await page.goto("/?from=<script>");
  await page.waitForTimeout(1000);
  expect(sent).toEqual([]);
});
