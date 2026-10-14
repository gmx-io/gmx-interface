import { expect, type Page } from "@playwright/test";

import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import {
  factor,
  findMarket,
  findValues,
  headerPrice,
  headerPriceValue,
  openTooltip,
  selectedMarketName,
  watchMarketsApi,
  type ApiMarket,
} from "../fixtures/marketData";
import { openTrade, selectMarket } from "../fixtures/trade";

function headerItem(page: Page, label: RegExp) {
  return page.getByRole("banner").getByText(label).locator("xpath=following-sibling::div[1]");
}

function expectedHourlyRates(config: ApiMarket, values: ApiMarket) {
  const hourly = (value: string | boolean) => factor(value) * 3600 * 100;
  const inTokens = config.useOpenInterestInTokensForBalance === true;
  const longOi = Number(inTokens ? values.longInterestInTokens : values.longInterestUsd);
  const shortOi = Number(inTokens ? values.shortInterestInTokens : values.shortInterestUsd);
  const paying = hourly(values.fundingFactorPerSecond);
  const received = (payingOi: number, receivingOi: number) => (receivingOi ? (paying * payingOi) / receivingOi : 0);
  return {
    Long: {
      funding: values.longsPayShorts ? -paying : received(shortOi, longOi),
      borrow: -hourly(values.borrowingFactorPerSecondForLongs),
    },
    Short: {
      funding: values.longsPayShorts ? received(longOi, shortOi) : -paying,
      borrow: -hourly(values.borrowingFactorPerSecondForShorts),
    },
  };
}

function displayedRates(text: string) {
  const [long, short] = text.split("Short positions net rate:");
  const parse = (part: string) => ({
    net365d: displayedNumber(/365d:\s*([^\n]+)/.exec(part)![1]),
    funding: /funding fee of ([^%]+)%/.test(part) ? displayedNumber(/funding fee of ([^%]+)%/.exec(part)![1]) : 0,
    borrow: /borrow fee of ([^%]+)%/.test(part) ? displayedNumber(/borrow fee of ([^%]+)%/.exec(part)![1]) : 0,
  });
  return { Long: parse(long), Short: parse(short) };
}

test("2.25 BTC, ETH (and AVAX on Avalanche) mark prices are within 1% of Coinbase spot", async ({
  page,
  request,
  chainId,
}, testInfo) => {
  await openTrade(page);
  const prices: Record<string, { displayed: number; coinbase: number }> = {};
  for (const symbol of chainId === 43114 ? ["BTC", "ETH", "AVAX"] : ["BTC", "ETH"]) {
    await selectMarket(page, symbol);
    const response = await request.get(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`);
    expect(response.ok()).toBe(true);
    const coinbase = Number((await response.json()).data.amount);
    expect(coinbase).toBeGreaterThan(0);
    await expect.poll(async () => Math.abs((await headerPriceValue(page)) / coinbase - 1)).toBeLessThan(0.01);
    prices[symbol] = { displayed: await headerPriceValue(page), coinbase };
  }
  await testInfo.attach("external-prices", { body: JSON.stringify(prices), contentType: "application/json" });
});

test("2.26 5.10 BTC and ETH mark prices update without a page reload", async ({ page }) => {
  test.setTimeout(240_000);
  await openTrade(page);
  await page.evaluate(() => ((window as unknown as { regressionPage: string }).regressionPage = "kept"));
  for (const symbol of ["BTC", "ETH"]) {
    await selectMarket(page, symbol);
    const price = headerPrice(page);
    // Two consecutive changes, so a value left over from the previous market cannot pass alone.
    for (let i = 0; i < 2; i++) {
      const before = await price.innerText();
      await expect(price).not.toHaveText(before, { timeout: 90_000 });
    }
  }
  expect(await page.evaluate(() => (window as unknown as { regressionPage: string }).regressionPage)).toBe("kept");
});

for (const symbol of ["BTC", "ETH"]) {
  test(`2.27 2.28 ${symbol} funding and borrow rates follow the polled /v1/markets/values`, async ({
    page,
    chainId,
  }, testInfo) => {
    const api = watchMarketsApi(page, chainId);
    await openTrade(page);
    await selectMarket(page, symbol);
    const config = findMarket(api.config, await selectedMarketName(page));
    const responses = api.valuesResponses;
    await expect.poll(() => api.valuesResponses, { timeout: 30_000 }).toBeGreaterThan(responses + 1);
    const popup = await openTooltip(page, page.getByRole("banner").locator(".Chart-header-value"));
    await expect(popup).toContainText("Short positions net rate:");
    const close = (displayed: number, expected: number, tolerance: number) =>
      Math.abs(displayed - expected) <= tolerance + Math.abs(expected) * 0.03;
    let last: unknown;
    await expect
      .poll(
        async () => {
          const values = findValues(api.values, config);
          const expected = expectedHourlyRates(config, values);
          const displayed = displayedRates(await popup.innerText());
          last = { expected, displayed, values };
          return (["Long", "Short"] as const).every(
            (side) =>
              close(displayed[side].funding, expected[side].funding, 0.0001) &&
              close(displayed[side].borrow, expected[side].borrow, 0.0001) &&
              close(displayed[side].net365d, (expected[side].funding + expected[side].borrow) * 8760, 0.01)
          );
        },
        { timeout: 30_000 }
      )
      .toBe(true);
    await testInfo.attach("rates", { body: JSON.stringify(last), contentType: "application/json" });
  });

  test(`2.29 ${symbol} open interest matches /v1/markets/values and stays below the configured caps`, async ({
    page,
    chainId,
  }) => {
    const api = watchMarketsApi(page, chainId);
    await openTrade(page);
    await selectMarket(page, symbol);
    const config = findMarket(api.config, await selectedMarketName(page));
    const decimals = getTokenBySymbol(chainId, symbol).decimals;
    const label = page.getByRole("banner").getByText(/^Open interest \(/i);
    await expect(label).toHaveText(/\((\d+(?:\.\d+)?)%\/(\d+(?:\.\d+)?)%\)/);
    const [, longShare, shortShare] = /\((\d+(?:\.\d+)?)%\/(\d+(?:\.\d+)?)%\)/.exec(await label.innerText())!;
    expect(Number(longShare) + Number(shortShare)).toBeCloseTo(100, 1);
    const header = headerItem(page, /^Open interest \(/i);
    const popup = await openTooltip(page, header.locator(".Tooltip"));
    for (const [i, side] of (["Long", "Short"] as const).entries()) {
      const key = side === "Long" ? "long" : "short";
      await expect
        .poll(async () => {
          const match = new RegExp(`${side} OI:\\s*([\\d,.]+)\\s*\\S+\\s*\\(([^)]+)\\)`).exec(await popup.innerText());
          const values = findValues(api.values, config);
          const tokens = Number(values[`${key}InterestInTokens`]) / 10 ** decimals;
          const usd = factor(values[`${key}InterestUsd`]);
          const cap = factor(config[`maxOpenInterest${side}`]);
          const displayedTokens = displayedNumber(match?.[1] ?? "");
          const displayedUsd = displayedNumber(match?.[2] ?? "");
          // Balance-by-tokens markets show the token OI at the current price, others the USD OI.
          const expectedUsd = config.useOpenInterestInTokensForBalance
            ? displayedTokens * (await headerPriceValue(page))
            : usd;
          // The header rounds to one decimal of k/m.
          const headerUsd = displayedNumber((await header.innerText()).split("/")[i]);
          return (
            tokens > 0 &&
            Math.abs(displayedTokens - tokens) <= 0.01 + tokens * 0.002 &&
            Math.abs(displayedUsd / expectedUsd - 1) < 0.01 &&
            Math.abs(headerUsd / displayedUsd - 1) < 0.05 &&
            usd < cap &&
            displayedUsd < cap
          );
        })
        .toBe(true);
    }
  });
}
