import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import {
  factor,
  fetchMarketsInfo,
  findMarket,
  headerPriceValue,
  infoRowValue,
  openExecutionDetails,
  openTooltip,
  selectedMarketName,
  watchMarketsApi,
} from "../fixtures/marketData";
import {
  inputNumber,
  labelledInput,
  openSettings,
  openTrade,
  selectMarket,
  selectTradeDirection,
  selectTradeMode,
  setSettingsToggle,
} from "../fixtures/trade";

async function feesTooltip(page: Page) {
  const box = await openExecutionDetails(page);
  await expect(infoRowValue(box, /^Fees/)).toContainText("$");
  return openTooltip(page, infoRowValue(box, /^Fees/).locator(".Tooltip-handle"));
}

function percentOf(text: string, label: string) {
  const match = new RegExp(`${label}:\\s*\\(([\\d.]+)% of`).exec(text);
  return match ? Number(match[1]) : NaN;
}

test("2.32 Long and Short open fees equal the position fee configured in /v1/markets/info (ETH, plus GOLD at 0.01/0.02% on Arbitrum)", async ({
  page,
  request,
  chainId,
}) => {
  const api = watchMarketsApi(page, chainId);
  await openTrade(page);
  await expect.poll(() => api.origin).toBeDefined();
  const markets = await fetchMarketsInfo(request, api.origin!);
  for (const symbol of chainId === 42161 ? ["ETH", "GOLD"] : ["ETH"]) {
    await selectMarket(page, symbol);
    const market = findMarket(markets, await selectedMarketName(page));
    const configured = [
      factor(market.positionFeeFactorForBalanceWasImproved) * 100,
      factor(market.positionFeeFactorForBalanceWasNotImproved) * 100,
    ];
    for (const direction of ["Long", "Short"] as const) {
      await selectTradeDirection(page, direction);
      await page.getByTestId("margin-input").fill("100");
      const popup = await feesTooltip(page);
      await expect
        .poll(
          async () => {
            const fee = percentOf(await popup.innerText(), "Open fee");
            return configured.some((value) => Math.abs(fee - value) < 0.0005);
          },
          { message: `${market.name} ${direction} open fee is one of ${configured.join("/")}%` }
        )
        .toBe(true);
      await page.mouse.move(0, 0);
    }
  }
});

for (const direction of ["Long", "Short"] as const) {
  test(`5.27 22.14 (tradebox preview) ${direction}: liquidation distance is 1/leverage minus fees and maintenance margin, near entry at max leverage`, async ({
    page,
    chainId,
  }, testInfo) => {
    const api = watchMarketsApi(page, chainId);
    await openTrade(page);
    await selectMarket(page, "ETH");
    await selectTradeDirection(page, direction);
    const market = findMarket(api.config, await selectedMarketName(page));
    const improved = factor(market.positionFeeFactorForBalanceWasImproved);
    const notImproved = factor(market.positionFeeFactorForBalanceWasNotImproved);
    const maintenance = factor(market.minCollateralFactorForLiquidation);
    const maxLiquidationImpact = factor(market.maxPositionImpactFactorForLiquidations);
    await page.getByTestId("margin-input").fill("1000");
    await page.getByTestId("leverage-slider").first().click();
    const popover = page.getByText("Adjust leverage", { exact: true }).locator("../..");
    const input = popover.getByRole("textbox");
    const max = parseFloat((await popover.locator(".rc-slider-mark-text").last().textContent())!);
    expect(max).toBeGreaterThanOrEqual(50);
    const liquidation = infoRowValue(page.getByTestId("tradebox"), "Liquidation price");
    const samples: Record<number, unknown> = {};
    for (const leverage of [2, 10, 25, max]) {
      await input.fill(String(leverage));
      await input.press("Tab");
      // Leverage applies to the margin left after the open fee.
      await expect
        .poll(async () => (await inputNumber(page.getByTestId("position-size-input"))) / 1000)
        .toBeGreaterThan(leverage * 0.9);
      await expect
        .poll(
          async () => {
            const margin = await inputNumber(page.getByTestId("margin-input"));
            const size = await inputNumber(page.getByTestId("position-size-input"));
            const mark = await headerPriceValue(page);
            const liq = displayedNumber(await liquidation.innerText());
            const distance = (direction === "Long" ? mark - liq : liq - mark) / mark;
            const upper = margin / size - improved - notImproved - maintenance + 0.001;
            const lower = margin / size - 2 * notImproved - maintenance - maxLiquidationImpact - 0.001;
            samples[leverage] = { margin, size, mark, liq, distance, lower, upper };
            return distance > 0 && distance < 1 / leverage && distance >= lower && distance <= upper;
          },
          { message: `${direction} ${leverage}x liquidation distance` }
        )
        .toBe(true);
    }
    await testInfo.attach("liquidation-samples", { body: JSON.stringify(samples), contentType: "application/json" });
  });
}

test("5.29 network fee is positive, matches its native amount and stays within the chain's USD bound", async ({
  page,
  chainId,
}, testInfo) => {
  const native = chainId === 42161 ? "ETH" : "AVAX";
  // Typical quotes are about $0.2 on Arbitrum and $0.6 on Avalanche.
  const maxUsd = chainId === 42161 ? 1 : 2.5;
  const fees: Record<string, string> = {};
  await openTrade(page);
  await selectMarket(page, native);
  for (const direction of ["Long", "Short"] as const) {
    await selectTradeDirection(page, direction);
    await page.getByTestId("margin-input").fill("100");
    const fee = infoRowValue(await openExecutionDetails(page), "Network fee");
    await expect
      .poll(async () => {
        const text = await fee.innerText();
        const amount = displayedNumber(new RegExp(`([\\d.]+)\\s*${native}`).exec(text)?.[1] ?? "");
        const usd = displayedNumber(/\$\s*([\d.]+)/.exec(text)?.[1] ?? "");
        const price = await headerPriceValue(page);
        fees[direction] = `${text} at ${native} $${price}`;
        return usd > 0 && usd <= maxUsd && Math.abs(amount * price - usd) <= 0.006 + usd * 0.05;
      })
      .toBe(true);
  }
  await testInfo.attach("network-fees", { body: JSON.stringify(fees), contentType: "application/json" });
});

test("5.33 paying USDC into the pool's long-token collateral shows the swap hop and its configured swap fee", async ({
  page,
  chainId,
}) => {
  const api = watchMarketsApi(page, chainId);
  await openTrade(page);
  const settings = await openSettings(page);
  await setSettingsToggle(settings, "Enable external swaps", false);
  await page.keyboard.press("Escape");
  await selectMarket(page, "ETH");
  await expect(page.getByTestId("margin-collateral-selector")).toContainText("USDC");
  const name = await selectedMarketName(page);
  const longToken = /\[([^-\]]+)-/.exec(name)![1];
  await page.getByTestId("collateral-in-selector-button").click();
  await page.getByTestId(`collateral-in-selector-row-${longToken}`).click();
  await expect(page.getByTestId("collateral-in-selector-button")).toContainText(longToken);
  await page.getByTestId("margin-input").fill("100");
  const box = await openExecutionDetails(page);
  await expect(box.getByText("Fees (including swap)")).toBeVisible();
  const popup = await feesTooltip(page);
  await expect(popup).toContainText(`Swap USDC to ${longToken}:`);
  await expect(popup).toContainText("Open fee:");
  const pair = name.replace(/^.*\[/, "[");
  const swapFees = api
    .config!.filter((m) => !m.isDisabled && m.name.endsWith(pair))
    .flatMap((m) => [
      factor(m.swapFeeFactorForBalanceWasImproved) * 100,
      factor(m.swapFeeFactorForBalanceWasNotImproved) * 100,
    ]);
  const fee = percentOf(await popup.innerText(), `Swap USDC to ${longToken}`);
  expect(
    swapFees.some((value) => Math.abs(fee - value) < 0.0005),
    `${fee}% in ${swapFees.join("/")}%`
  ).toBe(true);
  await expect(popup).not.toContainText(/NaN|undefined|Infinity/);
});

test("5.31 6.06 (live data, no wallet; the order's acceptable price is checked in connected-state/unsignedOrders) Market shows the Settings slippage, Limit recommends at least the 0.3% impact buffer, Stop Market shows N/A", async ({
  page,
}) => {
  await openTrade(page);
  const settings = await openSettings(page);
  const slippage = labelledInput(settings, "Default allowed slippage");
  await slippage.fill("0.7");
  await slippage.press("Tab");
  await setSettingsToggle(settings, "Set acceptable price impact", true);
  await page.keyboard.press("Escape");
  await page.reload();
  await selectMarket(page, "ETH");
  const box = page.getByTestId("tradebox");
  for (const direction of ["Long", "Short"] as const) {
    await selectTradeDirection(page, direction);
    await selectTradeMode(page, "Market");
    await page.getByTestId("margin-input").fill("100");
    await openExecutionDetails(page);
    await expect.poll(() => inputNumber(labelledInput(box, "Allowed slippage"))).toBe(0.7);
    const mark = await headerPriceValue(page);
    await selectTradeMode(page, "Limit");
    await page.getByTestId("trigger-price-input").fill((mark * (direction === "Long" ? 0.95 : 1.05)).toFixed(2));
    await page.getByTestId("margin-input").fill("100");
    const impact = labelledInput(box, "Acceptable price impact");
    // The recommendation is the 0.3% buffer plus the current impact at the trigger price.
    await expect.poll(() => inputNumber(impact)).toBeGreaterThanOrEqual(0.3);
    expect(await inputNumber(impact)).toBeLessThan(1);
    await selectTradeMode(page, "Stop Market");
    await page.getByTestId("trigger-price-input").fill((mark * (direction === "Long" ? 1.05 : 0.95)).toFixed(2));
    await expect(infoRowValue(box, "Acceptable price impact")).toHaveText("N/A");
  }
});
