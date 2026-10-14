import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";
import {
  inputNumber,
  labelledInput,
  openSettings,
  openTrade,
  selectTradeDirection,
  selectTradeMode,
} from "../fixtures/trade";

for (const { label, value, id } of [
  { label: "Default allowed slippage", value: "0.7", id: "19.03" },
  { label: "TWAP number of parts", value: "8", id: "19.06" },
  { label: "Max network fee buffer", value: "40", id: "19.05" },
]) {
  test(`${id} ${label} persists and reopens with the chosen value`, async ({ page }) => {
    await openTrade(page);
    const modal = await openSettings(page);
    if (label === "Max network fee buffer") await modal.getByText("Classic", { exact: true }).click();
    const input = labelledInput(modal, label);
    await input.fill(value);
    await input.press("Tab");
    await expect(input).toHaveValue(value);
    await page.reload();
    await openSettings(page);
    await expect(input).toHaveValue(value);
  });
}

for (const { tab, labels } of [
  { tab: "Trading" as const, labels: ["Auto-cancel TP/SL", "Enable external swaps", "Set acceptable price impact"] },
  {
    tab: "Display" as const,
    labels: [
      "Manual leverage",
      "Display net value and PnL after all fees",
      "Include PnL in leverage display",
      "Show positions on chart",
      "Break down net price impact",
    ],
  },
]) {
  for (const label of labels) {
    test(`19.09 ${label} toggles and survives refresh`, async ({ page }) => {
      await openTrade(page);
      const modal = await openSettings(page, tab);
      const toggle = modal
        .getByText(label, { exact: true })
        .locator("xpath=ancestor::div[contains(@class, 'inline-flex')][1]")
        .locator("div.cursor-pointer");
      const wasEnabled = (await toggle.getAttribute("class"))!.includes("bg-blue-400");
      await toggle.click();
      if (wasEnabled) await expect(toggle).not.toHaveClass(/bg-blue-400/);
      else await expect(toggle).toHaveClass(/bg-blue-400/);
      await page.reload();
      await openSettings(page, tab);
      if (wasEnabled) await expect(toggle).not.toHaveClass(/bg-blue-400/);
      else await expect(toggle).toHaveClass(/bg-blue-400/);
    });
  }
}

test("19.08 chart trade markers selection persists", async ({ page }) => {
  await openTrade(page);
  const modal = await openSettings(page, "Display");
  await modal.getByRole("button", { name: /^(All trades|Current position only|Off)$/ }).click();
  await page.getByText("Off", { exact: true }).click();
  await expect(modal.getByRole("button", { name: "Off", exact: true })).toBeVisible();
  await page.reload();
  await openSettings(page, "Display");
  await expect(modal.getByRole("button", { name: "Off", exact: true })).toBeVisible();
});

test("2.18 language changes visible UI and persists across refresh", async ({ page }) => {
  await openTrade(page);
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await page.getByText("Русский", { exact: true }).click();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Подключить кошелек");
  await page.reload();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Подключить кошелек");
  await page.getByRole("button", { name: "Язык", exact: true }).click();
  await page.getByText("English", { exact: true }).click();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});

test("19.04 default allowed slippage applies to Market positions and swaps, and is disabled for Limit and TWAP swaps", async ({
  page,
}) => {
  await openTrade(page);
  const settings = await openSettings(page);
  const slippage = labelledInput(settings, "Default allowed slippage");
  await slippage.fill("1.5");
  await slippage.press("Tab");
  await page.keyboard.press("Escape");
  await page.reload();
  const box = page.getByTestId("tradebox");
  await page.getByTestId("margin-input").fill("100");
  await box.getByRole("button", { name: "Execution details", exact: true }).click();
  await expect.poll(() => inputNumber(labelledInput(box, "Allowed slippage"))).toBe(1.5);
  await selectTradeDirection(page, "Swap");
  const preset = box.getByRole("button", { name: "1.5%", exact: true });
  await expect(preset).toHaveClass(/bg-blue-500/);
  await expect(preset).toBeEnabled();
  for (const mode of ["Limit", "TWAP"] as const) {
    await selectTradeMode(page, mode);
    await expect(preset).toBeDisabled();
  }
  await selectTradeMode(page, "Market");
  await expect(preset).toBeEnabled();
  await expect(preset).toHaveClass(/bg-blue-500/);
});
