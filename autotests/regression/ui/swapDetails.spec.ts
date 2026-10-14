import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import { infoRowValue, openTooltip } from "../fixtures/marketData";
import {
  feeBreakdown,
  impactAndFee,
  type Quote,
  relativeDiff,
  settledQuote,
  usdText,
  watchTickerPrices,
} from "../fixtures/quoteDetails";
import { inputNumber, labelledInput, openSettings, setSettingsToggle } from "../fixtures/trade";

async function openSwap(page: Page, from: string, to: string) {
  await page.goto(`/trade/swap?mode=market&from=${from}&to=${to}`);
  await expect(page.getByTestId("collateral-selector")).toContainText(from);
  await expect(page.getByTestId("receive-selector")).toContainText(to);
}

// Keeps quotes on GMX pools so fee rows and liquidity are deterministic.
async function disableExternalSwaps(page: Page) {
  const settings = await openSettings(page);
  await setSettingsToggle(settings, "Enable external swaps", false);
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
}

function quoteParts(page: Page) {
  return {
    pay: usdText(page.getByTestId("pay")),
    receive: usdText(page.getByTestId("swap-receive")),
    row: infoRowValue(page.getByTestId("tradebox"), "Price impact / fees"),
  };
}

async function openExecutionDetails(page: Page) {
  const box = page.getByTestId("tradebox");
  const networkFee = box.getByText("Network fee", { exact: true });
  if (!(await networkFee.isVisible()))
    await box.getByRole("button", { name: "Execution details", exact: true }).click();
  await expect(networkFee).toBeVisible();
  return box;
}

async function swapFeeBreakdown(page: Page) {
  const box = await openExecutionDetails(page);
  const fees = infoRowValue(box, "Fees");
  await expect(fees).toContainText("$");
  const popup = await openTooltip(page, fees.locator(".Tooltip-handle"));
  const items = feeBreakdown(await popup.innerText());
  await page.getByRole("banner").hover();
  return { total: displayedNumber(await fees.innerText()), items };
}

function expectMinReceive(page: Page, slippagePercent: number) {
  const min = infoRowValue(page.getByTestId("tradebox"), "Minimum receive");
  const receive = page.getByTestId("swap-receive-input");
  return expect
    .poll(async () => {
      const expected = (await inputNumber(receive)) * (1 - slippagePercent / 100);
      return relativeDiff(displayedNumber(await min.innerText()), expected);
    })
    .toBeLessThan(0.0005);
}

test("11.01 partial (filtering needs a wallet): disconnected pay selector opens a connect prompt and closes unchanged", async ({
  page,
}) => {
  await openSwap(page, "USDC", "ETH");
  await page.getByTestId("collateral-selector").click();
  const modal = page.getByTestId("collateral-selector-modal");
  await expect(modal.getByText(/Connect wallet to view\s*payment options/)).toBeVisible();
  await expect(modal.getByRole("button", { name: "Connect wallet", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(page.getByTestId("collateral-selector")).toContainText("USDC");
});

test("11.05 swap rate matches the oracle prices the app received and the fee breakdown adds up", async ({
  page,
  chainId,
}) => {
  const price = watchTickerPrices(page, chainId);
  await openSwap(page, "USDC", "ETH");
  await disableExternalSwaps(page);
  await page.getByTestId("pay-input").fill("1000");
  const parts = quoteParts(page);
  const quote = await settledQuote(parts);
  expect(quote.fee).toBeLessThan(0);
  expect(quote.fee).toBeGreaterThan(-1);
  await expect.poll(() => relativeDiff(quote.pay, 1000 * price("USDC", "minPrice"))).toBeLessThan(0.002);
  await expect
    .poll(async () => {
      const receive = await inputNumber(page.getByTestId("swap-receive-input"));
      const { impact, fee } = await impactAndFee(parts.row);
      const rate = (price("USDC", "minPrice") / price("ETH", "maxPrice")) * (1 + (impact + fee) / 100);
      return relativeDiff(receive / 1000, rate);
    })
    .toBeLessThan(0.003);

  const { total, items } = await swapFeeBreakdown(page);
  const swapFee = items.find((item) => item.label === "Swap USDC to ETH");
  expect(swapFee, JSON.stringify(items)).toBeDefined();
  expect(Math.abs(swapFee!.percent - Math.abs(quote.fee))).toBeLessThanOrEqual(0.001);
  expect(swapFee!.usd).toBeLessThan(0);
  expect(Math.abs(Math.abs(swapFee!.usd) - (quote.pay * swapFee!.percent) / 100)).toBeLessThanOrEqual(
    0.01 + quote.pay * 0.00001
  );
  const sum = items.reduce((acc, item) => acc + item.usd, 0);
  expect(Math.abs(total - sum)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(quote.receive - (quote.pay + sum))).toBeLessThanOrEqual(0.03);
  const networkFee = displayedNumber((await page.getByTestId("info-row-network-fee").innerText()).split("(")[1] ?? "");
  expect(networkFee).toBeLessThan(0);
  expect(networkFee).toBeGreaterThan(-5);
  await expect(infoRowValue(page.getByTestId("tradebox"), "Swap route")).toHaveText("GMX pools");
});

test("11.06 minimum receive equals the receive amount less each allowed slippage choice", async ({ page }) => {
  await openSwap(page, "USDC", "ETH");
  await page.getByTestId("pay-input").fill("1000");
  const box = page.getByTestId("tradebox");
  await expect.poll(() => inputNumber(page.getByTestId("swap-receive-input"))).toBeGreaterThan(0);
  for (const [label, slippage] of [
    ["0.5%", 0.5],
    ["1.5%", 1.5],
    ["0.3%", 0.3],
  ] as const) {
    const preset = box.getByRole("button", { name: label, exact: true });
    await preset.click();
    await expect(preset).toHaveClass(/bg-blue-500/);
    await expectMinReceive(page, slippage);
  }
  await box.getByText("Custom", { exact: true }).click();
  const custom = box
    .getByText("Allowed slippage", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]")
    .getByRole("textbox");
  await custom.fill("2.5");
  await custom.press("Tab");
  await expect(box.getByRole("button", { name: "0.3%", exact: true })).not.toHaveClass(/bg-blue-500/);
  await expectMinReceive(page, 2.5);
});

test("11.08 swap slippage defaults to the Settings value, survives reload and drives minimum receive", async ({
  page,
}) => {
  await openSwap(page, "USDC", "ETH");
  const box = page.getByTestId("tradebox");
  await expect(box.getByText("Allowed slippage", { exact: true })).toBeVisible();
  const settings = await openSettings(page);
  const input = labelledInput(settings, "Default allowed slippage");
  await input.fill("1");
  await input.press("Tab");
  await page.keyboard.press("Escape");
  await page.reload();
  const preset = box.getByRole("button", { name: "1.0%", exact: true });
  await expect(preset).toHaveClass(/bg-blue-500/);
  await page.getByTestId("pay-input").fill("1000");
  await expectMinReceive(page, 1);
  await openSettings(page);
  await expect(input).toHaveValue("1");
});

test("11.07 11.12 large swap shows its negative price impact and the high impact warning above the submit button", async ({
  page,
  chainId,
}) => {
  test.slow();
  const from = chainId === 42161 ? "ETH" : "AVAX";
  await openSwap(page, from, "USDC");
  await disableExternalSwaps(page);
  const pay = page.getByTestId("pay-input");
  const box = page.getByTestId("tradebox");
  const warning = box.getByText("High swap price impact", { exact: true });
  const parts = quoteParts(page);
  await pay.fill("1");
  const unitUsd = (await settledQuote(parts)).pay;
  let quote: Quote | undefined;
  // Impact grows about linearly with size: aim each step at ~0.75% so it stops before pool liquidity runs out.
  for (
    let usd = 250_000;
    !quote || quote.impact > -0.6;
    usd *= quote.impact < 0 ? Math.min(1.5, Math.max(1.1, 0.75 / -quote.impact)) : 1.5
  ) {
    expect(usd, "price impact never reached the warning threshold").toBeLessThan(50_000_000);
    await pay.fill((usd / unitUsd).toFixed(4));
    quote = await settledQuote(parts, usd);
    expect(quote.fee, `swap of $${usd} exceeds GMX pool liquidity before a high impact warning`).toBeLessThan(0);
    if (quote.impact > -0.4) await expect(warning).toBeHidden();
  }
  await expect(warning).toBeVisible();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
  const warningUsd = displayedNumber(await warning.locator("xpath=following-sibling::div[1]").innerText());
  const { items } = await swapFeeBreakdown(page);
  const impact = items.find((item) => item.label === "Swap price impact");
  expect(impact, JSON.stringify(items)).toBeDefined();
  expect(Math.abs(impact!.percent - Math.abs(quote.impact))).toBeLessThanOrEqual(0.01);
  expect(relativeDiff(Math.abs(impact!.usd), (quote.pay * impact!.percent) / 100)).toBeLessThan(0.01);
  expect(relativeDiff(warningUsd, impact!.usd)).toBeLessThan(0.005);
  await pay.fill("1");
  await expect(warning).toBeHidden();
});
