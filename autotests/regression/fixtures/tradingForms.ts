import { expect, type Page } from "@playwright/test";

import {
  inputNumber,
  labelledInput,
  openSettings,
  selectMarket,
  selectTradeDirection,
  selectTradeMode,
  setSettingsToggle,
} from "./trade";

export async function configureClassicTrading(page: Page) {
  const settings = await openSettings(page);
  await settings.getByText("Classic", { exact: true }).click();
  const slippage = labelledInput(settings, "Default allowed slippage");
  await slippage.fill("0.3");
  await slippage.press("Tab");
  await setSettingsToggle(settings, "Enable external swaps", false);
  await settings.getByRole("button", { name: "Display settings", exact: true }).click();
  await setSettingsToggle(settings, "Manual leverage", false);
  await page.keyboard.press("Escape");
  // The current form keeps its own slippage state; reload to apply the edited default.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
}

export async function fillPositionOrder(
  page: Page,
  params: {
    isLong: boolean;
    collateral: string;
    size: string;
    mode?: "Market" | "Limit" | "Stop Market" | "TWAP";
    trigger?: string;
  }
) {
  await selectMarket(page, "ETH");
  await selectTradeDirection(page, params.isLong ? "Long" : "Short");
  await selectTradeMode(page, params.mode ?? "Market");
  await expect(page.getByTestId("margin-collateral-selector")).toContainText("USDC");
  const unit = page.getByTestId("position-size-display-mode-button");
  await unit.click();
  await page.getByRole("cell", { name: "USD", exact: true }).click();
  if (params.trigger) await page.getByTestId("trigger-price-input").fill(params.trigger);
  await page.getByTestId("margin-input").fill(params.collateral);
  await page.getByTestId("position-size-input").fill(params.size);
  await expect.poll(() => inputNumber(page.getByTestId("margin-input"))).toBe(Number(params.collateral));
  await expect.poll(() => inputNumber(page.getByTestId("position-size-input"))).toBe(Number(params.size));
  return page.getByTestId("confirm-trade-button");
}

export function fundedPositionRow(page: Page, isLong: boolean) {
  return page
    .getByTestId("trade-table-large")
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", { name: new RegExp(`ETH/USD.*${isLong ? "Long" : "Short"}`) }),
    });
}

export async function fillCollateralEdit(
  page: Page,
  isLong: boolean,
  operation: "Deposit" | "Withdraw",
  amount: string
) {
  await selectMarket(page, "ETH");
  await fundedPositionRow(page, isLong).getByTestId("position-edit-button").click();
  const modal = page.getByTestId("position-edit-modal");
  await expect(modal.locator("xpath=ancestor::div[contains(concat(' ', @class, ' '), ' Modal ')][1]")).toHaveCSS(
    "opacity",
    "1"
  );
  await modal.getByTestId("operation-tabs").getByRole("button", { name: operation, exact: true }).click();
  await modal.getByTestId("amount-input-input").fill(amount);
  await expect.poll(() => inputNumber(modal.getByTestId("amount-input-input"))).toBe(Number(amount));
  return modal.getByTestId("confirm-button");
}

export async function fillPositionClose(page: Page, isLong: boolean, size: string | "max") {
  await selectMarket(page, "ETH");
  await fundedPositionRow(page, isLong).getByTestId("position-close-button").click();
  const modal = page.getByTestId("position-close-modal");
  await expect(modal.locator("xpath=ancestor::div[contains(concat(' ', @class, ' '), ' Modal ')][1]")).toHaveCSS(
    "opacity",
    "1"
  );
  await modal.getByTestId("close-order-type").getByRole("button", { name: "Market", exact: true }).click();
  if (size === "max") await modal.getByRole("button", { name: /^Max:/ }).click();
  else await modal.getByTestId("amount-input-input").fill(size);
  return modal.getByTestId("confirm-button");
}
