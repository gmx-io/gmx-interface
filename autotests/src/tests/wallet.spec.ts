import { expect } from "@playwright/test";
import { test } from "../base";

test.describe("Wallet", () => {
  test("Should able to connect wallet", async ({ page, gmx }) => {
    await page.goto(gmx.baseUrl);
    await page.waitForSelector(gmx.header.userAddress.selector);
    const element = await page.$(gmx.header.userAddress.selector);
    expect(element).not.toBeNull();
  });
});
