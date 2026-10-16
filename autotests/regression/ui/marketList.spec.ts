import { expect, type Page } from "@playwright/test";
import { parseUnits } from "viem";

import { calculateDisplayDecimals } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/browser";
import {
  KEEPER_MARKETS_URL,
  configuredMarkets,
  isIndexToken,
  marketLabel,
  newestPerpMarkets,
  overrideJson,
  promotedTokenAddresses,
  recentlyListedIndexTokens,
  selectorIndexTokens,
  sortedMarketAddresses,
  tokenIconPattern,
  type KeeperMarket,
} from "../fixtures/marketConfig";
import { watchMarketsApi } from "../fixtures/marketData";
import { openMarketSelector, openTrade, selectMarket } from "../fixtures/trade";

function selectorTable(page: Page) {
  return page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "LAST PRICE", exact: true }) });
}

function selectorRows(page: Page) {
  return selectorTable(page)
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => {
        const cells = (row as HTMLTableRowElement).cells;
        const icon = row.querySelector<HTMLImageElement>("img[data-qa='token-icon']");
        return {
          label: cells[1].innerText.trim().split(/\s+/)[0],
          price: cells[2].innerText.trim(),
          isNew: cells[0].innerText.includes("New"),
          icon: icon && {
            alt: icon.alt,
            src: decodeURIComponent(icon.src),
            loaded: icon.complete && icon.naturalWidth > 0,
          },
        };
      })
    );
}

function recentlyListedTab(page: Page) {
  return page.getByRole("button", { name: /^Recently listed/ });
}

function priceIssue(text: string) {
  const match = /^\$\s?(\d{1,3}(?:,\d{3})*)(?:\.(\d+))?$/.exec(text);
  if (!match) return "not a separated USD price";
  const [, integer, fraction = ""] = match;
  const digits = `${integer.replaceAll(",", "")}.${fraction}`;
  const value = Number(digits);
  if (!(value > 0)) return "zero";
  if ((integer.replaceAll(",", "") + fraction).replace(/^0+/, "").length < 3)
    return "rounded below 3 significant digits";
  const expected = calculateDisplayDecimals(parseUnits(digits, 30));
  // A value rounded up onto a magnitude boundary keeps the decimals of the smaller magnitude.
  if (fraction.length !== expected && !(Number.isInteger(Math.log10(value)) && fraction.length === expected + 1))
    return `${fraction.length} decimals, expected ${expected}`;
}

test(
  "22.01 22.03 23.08 selector lists every tradeable configured market with its index token name and loaded icon",
  { tag: "@avalanche" },
  async ({ page, chainId }) => {
    const api = watchMarketsApi(page, chainId);
    await openTrade(page);
    await openMarketSelector(page);
    await expect.poll(() => api.config?.length ?? 0).toBeGreaterThan(0);
    const expected = selectorIndexTokens(chainId, api.config!).map(({ token }) => ({
      label: marketLabel(token),
      icon: tokenIconPattern(token.symbol),
      symbol: token.symbol,
    }));
    await expect
      .poll(async () => (await selectorRows(page)).map((row) => row.label).sort())
      .toEqual(expected.map(({ label }) => label).sort());
    await expect
      .poll(async () => {
        const rows = await selectorRows(page);
        return expected
          .filter(({ label, icon, symbol }) => {
            const row = rows.find((candidate) => candidate.label === label);
            return !row?.icon?.loaded || row.icon.alt !== symbol || !icon.test(row.icon.src);
          })
          .map(({ label }) => label);
      })
      .toEqual([]);
  }
);

test("22.04 23.09 selector defaults to the promoted tokens, then pool value, and sortedMarkets.ts lists every perp market", async ({
  page,
  chainId,
}) => {
  const sorted = sortedMarketAddresses(chainId);
  expect(sorted.length, "duplicate sortedMarkets.ts entries").toBe(new Set(sorted).size);
  expect(
    configuredMarkets(chainId)
      .filter((market) => market.indexToken && !sorted.includes(market.marketTokenAddress))
      .map((market) => `${marketLabel(market.indexToken!)} [${market.pool}]`),
    "configured perp markets missing from sortedMarkets.ts"
  ).toEqual([]);

  const promoted = promotedTokenAddresses(chainId);
  const api = watchMarketsApi(page, chainId);
  await openTrade(page);
  await openMarketSelector(page);
  await expect
    .poll(
      async () => {
        if (!api.config || !api.values) return "waiting for /v1/markets data";
        const poolValues = new Map(
          api.values.map((values) => [values.marketTokenAddress, BigInt(String(values.poolValueMax))])
        );
        const tokens = selectorIndexTokens(chainId, api.config).map(({ token, markets }) => ({
          label: marketLabel(token),
          address: token.address,
          poolValue: markets.reduce((sum, market) => sum + (poolValues.get(market.marketTokenAddress) ?? 0n), 0n),
        }));
        const labels = (await selectorRows(page)).map((row) => row.label);
        const shown = labels.map((label) => tokens.find((token) => token.label === label));
        if (shown.length !== tokens.length || shown.some((token) => !token)) return `listed: ${labels.join(", ")}`;
        const pinned = promoted.filter((address) => tokens.some((token) => token.address === address));
        const head = shown.slice(0, pinned.length).map((token) => token!.address);
        if (head.join() !== pinned.join()) return `promoted head: ${labels.slice(0, pinned.length).join(", ")}`;
        const rest = shown.slice(pinned.length);
        const unordered = rest.findIndex((token, i) => i > 0 && token!.poolValue > rest[i - 1]!.poolValue);
        return unordered === -1
          ? "ordered"
          : `${rest[unordered]!.label} has more pool value than ${rest[unordered - 1]!.label}`;
      },
      { timeout: 30_000 }
    )
    .toBe("ordered");
});

test("22.05 22.17 22.21 23.10 selector prices are nonzero and use the display decimals for their magnitude", async ({
  page,
}) => {
  await openTrade(page);
  await openMarketSelector(page);
  await expect
    .poll(async () => {
      const rows = await selectorRows(page);
      if (rows.length < 3) return ["selector not loaded"];
      return rows.flatMap((row) => {
        const issue = priceIssue(row.price);
        return issue ? [`${row.label} ${row.price}: ${issue}`] : [];
      });
    })
    .toEqual([]);
});

test("22.06 23.16 23.20 a disabled market is removed from the selector, Pools and the Stats markets list", async ({
  page,
  context,
  chainId,
}) => {
  const markets = configuredMarkets(chainId);
  // Disabling a market whose index token has no other pool makes the token itself disappear.
  const target = newestPerpMarkets(chainId).find(
    (market) => markets.filter((other) => other.indexTokenAddress === market.indexTokenAddress).length === 1
  )!;
  const label = marketLabel(target.indexToken);
  const served = await overrideJson<{ marketTokenAddress: string }[]>(
    context,
    /\/v1\/markets\/config(?:\?|$)/,
    (json) =>
      json.map((market) =>
        market.marketTokenAddress === target.marketTokenAddress ? { ...market, isDisabled: true } : market
      )
  );

  await openTrade(page);
  await expect.poll(() => served.count).toBeGreaterThan(0);
  await openMarketSelector(page);
  // Initial RPC data can precede the API config, so wait for the disabled flag to apply.
  await expect
    .poll(async () => {
      const labels = (await selectorRows(page)).map((row) => row.label);
      return labels.length > 2 && !labels.includes(label);
    })
    .toBe(true);

  await page.goto("/pools");
  const pools = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "POOL", exact: true }) });
  await expect(pools.getByRole("link", { name: "Details", exact: true }).nth(2)).toBeVisible();
  await expect(pools.locator(`a[href*="market=${target.marketTokenAddress}"]`)).toHaveCount(0);
  await expect(pools.getByText(label, { exact: true })).toHaveCount(0);

  await page.goto("/stats");
  const stats = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "MARKETS", exact: true }) });
  await expect.poll(() => stats.locator("tbody tr").count()).toBeGreaterThan(2);
  await page.getByPlaceholder("Search market", { exact: true }).fill(target.indexToken.symbol);
  await expect(stats.getByText("No markets found", { exact: true })).toBeVisible();
});

test("22.06 23.16 live disabled and delisted markets are not listed on Pools", async ({ page, chainId }) => {
  const api = watchMarketsApi(page, chainId);
  const keeper = page.waitForResponse(KEEPER_MARKETS_URL);
  await page.goto("/pools");
  const pools = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "POOL", exact: true }) });
  await expect(pools.getByRole("link", { name: "Details", exact: true }).nth(2)).toBeVisible();
  const { markets } = (await (await keeper).json()) as { markets: KeeperMarket[] };
  await expect.poll(() => api.config?.length ?? 0).toBeGreaterThan(0);
  const hidden = [
    ...api.config!.filter((market) => market.isDisabled).map((market) => market.marketTokenAddress),
    ...markets.filter((market) => !market.isListed).map((market) => market.marketToken),
  ];
  test.skip(hidden.length === 0, "no market on this chain is disabled or delisted");
  for (const address of hidden) await expect(pools.locator(`a[href*="market=${address}"]`)).toHaveCount(0);
});

test("5.08 Recently listed tab shows only markets listed within 30 days and hides when there are none", async ({
  page,
  context,
  chainId,
}) => {
  const [recent, older] = newestPerpMarkets(chainId);
  const day = 24 * 60 * 60 * 1000;
  const listing = { recent: true };
  await overrideJson<{ markets: KeeperMarket[] }>(context, KEEPER_MARKETS_URL, ({ markets }) => ({
    markets: markets.map((market) => {
      const age =
        listing.recent && market.indexToken === recent.indexTokenAddress
          ? 29 * day
          : market.indexToken === older.indexTokenAddress
            ? 31 * day
            : 3 * 365 * day;
      return { ...market, listingDate: new Date(Date.now() - age).toISOString() };
    }),
  }));

  await openTrade(page);
  await openMarketSelector(page);
  await recentlyListedTab(page).click();
  await expect(recentlyListedTab(page)).toHaveText(/^Recently listed\s*1$/);
  await expect
    .poll(() => selectorRows(page))
    .toEqual([expect.objectContaining({ label: marketLabel(recent.indexToken), isNew: true })]);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect
    .poll(async () => (await selectorRows(page)).find((row) => row.label === marketLabel(older.indexToken))?.isNew)
    .toBe(false);

  listing.recent = false;
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder("Search market", { exact: true })).toBeHidden();
  const refreshed = page.waitForResponse(KEEPER_MARKETS_URL);
  await openMarketSelector(page);
  await refreshed;
  await expect(recentlyListedTab(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
  await expect.poll(async () => (await selectorRows(page)).filter((row) => row.isNew).length).toBe(0);
});

test("5.08 Recently listed tab matches the keeper's live listing dates", async ({ page, chainId }) => {
  const api = watchMarketsApi(page, chainId);
  await openTrade(page);
  const keeper = page.waitForResponse(KEEPER_MARKETS_URL);
  await openMarketSelector(page);
  const { markets } = (await (await keeper).json()) as { markets: KeeperMarket[] };
  await expect.poll(() => api.config?.length ?? 0).toBeGreaterThan(0);
  const recent = recentlyListedIndexTokens(markets);
  const expected = selectorIndexTokens(chainId, api.config!)
    .filter(({ token }) => recent.some((address) => isIndexToken(token, address)))
    .map(({ token }) => marketLabel(token));
  await test.info().attach("recently-listed", {
    body: JSON.stringify({ recent, expected }, null, 2),
    contentType: "application/json",
  });
  // Reopening renders from the fetched listing dates instead of the first, empty render.
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder("Search market", { exact: true })).toBeHidden();
  await openMarketSelector(page);
  await expect.poll(async () => (await selectorRows(page)).length).toBeGreaterThan(2);
  if (!expected.length) {
    await expect(recentlyListedTab(page)).toBeHidden();
    return;
  }
  await recentlyListedTab(page).click();
  await expect(recentlyListedTab(page)).toHaveText(new RegExp(`^Recently listed\\s*${expected.length}$`));
  await expect.poll(async () => (await selectorRows(page)).map((row) => row.label).sort()).toEqual(expected.sort());
});

test("23.11 TradingView chart loads for the three newest listed markets", async ({ page, chainId }) => {
  await openTrade(page);
  const chart = page.frameLocator('iframe[title="Financial Chart"]');
  const legend = chart.getByRole("region", { name: "Chart #1", exact: true }).getByRole("toolbar");
  for (const market of newestPerpMarkets(chainId).slice(0, 3)) {
    const label = marketLabel(market.indexToken);
    await test.step(label, async () => {
      await selectMarket(page, label.replace("/USD", ""));
      await expect(legend).toContainText(label);
      await expect(legend).toContainText(/C\s*[\d,.]*[1-9]/);
    });
  }
});
