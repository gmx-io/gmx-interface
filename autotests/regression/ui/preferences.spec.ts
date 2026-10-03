import { expect } from "@playwright/test";
import { stringToHex } from "viem";

import { test } from "../fixtures/browser";

test("RR-02-17 theme selection survives reload", async ({ page }) => {
  await page.goto("/trade");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.getByTestId("confirm-trade-button")).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("RR-19-01 RR-19-06 TWAP parts persist after changing settings", async ({ page }) => {
  await page.goto("/trade");
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  const modal = page.getByTestId("settings-modal");
  await expect(modal).toBeVisible();
  const parts = modal.getByRole("textbox").nth(1);
  await parts.fill("7");
  await parts.press("Tab");
  await expect(parts).toHaveValue("7");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await expect(modal.getByRole("textbox").nth(1)).toHaveValue("7");
});

test("RR-22-24 referral deep link is stored and removed from the URL", async ({ page }) => {
  await page.goto("/trade?ref=regression");
  await expect(page.getByTestId("confirm-trade-button")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("GMX-referralCode")))
    .toBe(stringToHex("regression", { size: 32 }));
  await expect(page).not.toHaveURL(/[?&]ref=/);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("GMX-referralCode")))
    .toBe(stringToHex("regression", { size: 32 }));
});

test("RR-05-11 RR-06-01 switching direction and order type updates the form", async ({ page }) => {
  await page.goto("/trade");
  await page.getByTestId("trade-direction").getByRole("button", { name: "Short", exact: true }).click();
  await page.getByTestId("trade-mode").getByRole("button", { name: "Limit", exact: true }).click();
  await expect(page.getByTestId("trigger-price-input")).toBeVisible();
  await page.getByTestId("trade-mode").getByRole("button", { name: "Market", exact: true }).click();
  await expect(page.getByTestId("trigger-price-input")).toHaveCount(0);
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});
