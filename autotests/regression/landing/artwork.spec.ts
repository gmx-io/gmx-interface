import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { test } from "../fixtures/landing";

// CI sets this to last release's downloaded baselines (workflow input baseline_run_id).
const baselineDir = process.env.REGRESSION_BASELINE_DIR;

async function artworkScreenshots(page: Page) {
  await page.goto("/");
  await expect(page.locator(".text-heading-1").filter({ hasText: "from your wallet" })).toBeVisible();
  // Load lazy artwork before the full-page capture.
  await page.evaluate(() =>
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => (image.loading = "eager"))
  );
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Array.from(document.images)
            .filter((image) => image.getClientRects().length > 0)
            .every((image) => image.complete)
        ),
      { timeout: 90_000 }
    )
    .toBe(true);
  const liquidity = page.locator("section").filter({ has: page.getByRole("heading", { name: /in liquidity/ }) });
  const aprs = liquidity.getByText(/[\d.]+%\s*APR/);
  await expect(aprs).toHaveCount(2);
  // Live figures change width, so mask their fixed-width containers.
  const mask = [
    ...["Traders", "Open interest", "Total volume"].map((name) => page.getByText(name, { exact: true }).locator("..")),
    page.getByRole("heading", { name: /in liquidity/ }).locator(".."),
    aprs.locator(".."),
    page.locator(".animate-scroll"),
  ];
  // One image per section, so a height change in one section doesn't shift the rest.
  const sections = await page.locator("section").all();
  return Promise.all(sections.map((section) => section.screenshot({ animations: "disabled", caret: "hide", mask })));
}

for (const { name, width, height } of [
  { name: "landing-artwork-1920px", width: 1920, height: 1080 },
  { name: "landing-artwork-phone", width: 390, height: 844 },
]) {
  test(`0.15 ${baselineDir ? "2.35 " : ""}landing artwork at ${width}px ${baselineDir ? "matches last release's baseline" : "is saved as the next baseline"}`, async ({
    page,
  }, testInfo) => {
    test.slow();
    await page.setViewportSize({ width, height });
    const screenshots = await artworkScreenshots(page);
    expect(screenshots.length).toBeGreaterThan(3);
    mkdirSync("test-results/baselines", { recursive: true });
    for (const [index, screenshot] of screenshots.entries()) {
      const file = `${name}-section-${index + 1}.png`;
      writeFileSync(join("test-results/baselines", file), screenshot);
      await testInfo.attach(file, { body: screenshot, contentType: "image/png" });
      if (baselineDir) expect.soft(screenshot).toMatchSnapshot(file, { maxDiffPixelRatio: 0.01, threshold: 0.05 });
    }
  });
}
