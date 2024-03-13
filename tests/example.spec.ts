import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3010";

test("has title", async ({ page }) => {
  await page.goto(`${BASE_URL}/#/trade`);

  await page.waitForTimeout(5000);

  // screen shot
  expect(await page.screenshot()).toMatchSnapshot("screenshot.png");
});
