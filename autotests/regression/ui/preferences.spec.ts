import { expect } from "@playwright/test";
import { stringToHex } from "viem";

import { test } from "../fixtures/browser";

test("2.17 theme selection applies across pages and survives reload", async ({ page }) => {
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto("/trade");
  await expect(page.locator("html")).toHaveClass(/dark/);
  const dark = await background();
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect.poll(background).not.toBe(dark);
  const light = await background();
  await page.reload();
  await expect(page.getByTestId("confirm-trade-button")).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  for (const path of ["/pools", "/earn/discover", "/stats", "/leaderboard", "/referrals"]) {
    await page.goto(path);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect.poll(background).toBe(light);
  }
});

test("15.04 referral deep link is stored, removed from the URL and kept in a new session", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/trade?ref=regression");
  await expect(page.getByTestId("confirm-trade-button")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("GMX-referralCode")))
    .toBe(stringToHex("regression", { size: 32 }));
  await expect(page).not.toHaveURL(/[?&]ref=/);
  const session = await browser.newContext({ baseURL, storageState: await page.context().storageState() });
  try {
    const next = await session.newPage();
    await next.goto("/trade");
    await expect(next.getByTestId("confirm-trade-button")).toBeVisible();
    await expect
      .poll(() => next.evaluate(() => localStorage.getItem("GMX-referralCode")))
      .toBe(stringToHex("regression", { size: 32 }));
  } finally {
    await session.close();
  }
});
