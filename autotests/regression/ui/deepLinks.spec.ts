import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { configuredMarkets, marketLabel, newestPerpMarkets, type ConfiguredMarket } from "../fixtures/marketConfig";
import { selectedMarketName } from "../fixtures/marketData";
import { inputNumber } from "../fixtures/trade";

// Delisted markets, no longer in the app configs.
const DELISTED: Record<number, { symbol: string; address: string }> = {
  42161: { symbol: "BOME", address: "0x71237F8C3d1484495A136022E16840b70fF84a69" },
  43114: { symbol: "MELANIA", address: "0xe19da27Bf9733c429445E289B662bECDCa6ce10b" },
};

// The second configured pool of an index token, so the link cannot pass by landing on the default pool.
function secondPool(chainId: number, isNative: boolean) {
  const markets = configuredMarkets(chainId).filter((market) => market.indexToken);
  return markets.find(
    (market) =>
      Boolean(market.indexToken!.isNative) === isNative &&
      markets.filter((other) => other.indexTokenAddress === market.indexTokenAddress).indexOf(market) === 1
  ) as ConfiguredMarket & { indexToken: NonNullable<ConfiguredMarket["indexToken"]> };
}

// The header shows a placeholder until markets load; keep polling instead of failing on it.
function shownMarket(page: Page) {
  return selectedMarketName(page).catch(() => "");
}

// Tabs expose no selected state to assistive technology; the active tab is only styled.
function expectActiveTab(page: Page, testId: string, name: string) {
  return expect(page.getByTestId(testId).getByRole("button", { name, exact: true })).toHaveClass(
    /!text-typography-primary/
  );
}

async function expectUsableTradebox(page: Page) {
  await expect(page.getByTestId("tradebox")).toBeVisible();
  await page.getByTestId("margin-input").fill("100");
  await expect.poll(() => inputNumber(page.getByTestId("position-size-input"))).toBeGreaterThan(0);
  const shown = (await selectedMarketName(page)).split(" ")[0];
  const legend = page
    .frameLocator('iframe[title="Financial Chart"]')
    .getByRole("region", { name: "Chart #1", exact: true })
    .getByRole("toolbar");
  await expect(legend).toContainText(shown);
}

for (const { title, isNative } of [
  { title: "22.22 a direct trade URL opens the linked market, pool, side and order mode", isNative: false },
  { title: "22.22 a direct trade URL opens the linked pool of a native-token market", isNative: true },
]) {
  test(title, async ({ page, chainId }) => {
    const market = secondPool(chainId, isNative);
    const name = `${marketLabel(market.indexToken)} [${market.pool}]`;
    await page.goto(`/trade/short?market=${market.indexToken.symbol}&pool=${market.pool}&mode=limit`);
    await expect(page.getByTestId("tradebox")).toBeVisible();
    await expect.poll(() => shownMarket(page)).toBe(name);
    await expectActiveTab(page, "trade-direction", "Short");
    await expectActiveTab(page, "trade-mode", "Limit");
    await expect(page.getByTestId("trigger-price-input")).toBeVisible();
    await expect(page).toHaveURL(/\/trade\/short$/);
    await page.reload();
    await expect.poll(() => shownMarket(page)).toBe(name);
  });
}

test("22.22 a direct trade URL opens the newest listed market", async ({ page, chainId }) => {
  const market = newestPerpMarkets(chainId)[0];
  await page.goto(`/trade/long?market=${market.indexToken.symbol}`);
  await expect.poll(() => shownMarket(page)).toMatch(new RegExp(`^${marketLabel(market.indexToken)} \\[`));
  await expectActiveTab(page, "trade-direction", "Long");
  await expectUsableTradebox(page);
});

for (const kind of ["newest", "second pool"] as const) {
  test(`22.23 a direct pool details URL opens the ${kind} GM pool`, async ({ page, chainId }) => {
    const market = kind === "newest" ? newestPerpMarkets(chainId)[0] : secondPool(chainId, false);
    await page.goto(`/pools/details?market=${market.marketTokenAddress}`);
    await expect(page.getByText(`GM: ${marketLabel(market.indexToken)}`, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(`[${market.pool}]`, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy GM", exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("table")
        .filter({ has: page.getByRole("columnheader", { name: "COMPOSITION", exact: true }) })
        .first()
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`market=${market.marketTokenAddress}`));
  });
}

for (const kind of ["malformed", "unknown", "delisted"] as const) {
  test(`22.24 23.21 a ${kind} market address in a pool URL falls back to the Pools list`, async ({ page, chainId }) => {
    const market = {
      malformed: "not-a-market",
      unknown: "0x0000000000000000000000000000000000000001",
      delisted: DELISTED[chainId].address,
    }[kind];
    expect(configuredMarkets(chainId).map((config) => config.marketTokenAddress)).not.toContain(market);
    await page.goto(`/pools/details?market=${market}`);
    await expect(page).toHaveURL(/\/pools$/);
    await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Details", exact: true }).first()).toBeVisible();
  });
}

for (const kind of ["unknown", "delisted"] as const) {
  test(`22.24 23.21 an ${kind} market in a trade URL keeps a usable tradebox and chart`, async ({ page, chainId }) => {
    const symbol = kind === "unknown" ? "REGRESSIONNOSUCH" : DELISTED[chainId].symbol;
    await page.goto(`/trade/long?market=${symbol}`);
    await expect(page.getByRole("banner").getByRole("button", { name: /\/USD/ })).toBeVisible();
    expect(await selectedMarketName(page)).not.toContain(`${symbol}/USD`);
    await expectUsableTradebox(page);
    await expect(page).toHaveURL(/\/trade\/long$/);
  });
}
