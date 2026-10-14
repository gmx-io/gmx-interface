import { test } from "../fixtures/browser";
import { BASELINE_PAGES, captureBaseline } from "../fixtures/pageState";

for (const baseline of BASELINE_PAGES) {
  test(`0.15 desktop baseline screenshot of ${baseline.path} once it has settled`, async ({ page }, testInfo) => {
    await captureBaseline(page, testInfo, baseline);
  });
}
