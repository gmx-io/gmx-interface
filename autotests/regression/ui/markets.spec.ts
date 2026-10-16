import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { marketLabel, selectorIndexTokens } from "../fixtures/marketConfig";
import { watchMarketsApi } from "../fixtures/marketData";
import { openMarketSelector, openTrade, selectMarket } from "../fixtures/trade";

// Category filters of the market selector, see src/components/ChartTokenSelector/marketFilters.ts.
const CATEGORY_TABS = [
  { tab: "Crypto", categories: ["ai", "layer1", "layer2", "defi", "meme"] },
  { tab: "TradFi", categories: ["tradfi"] },
];

// Other "All" filters can render beside the selector, so scope to the category tab row.
const categoryTab = (page: Page, name: string) =>
  page
    .locator("div")
    .filter({ has: page.getByRole("button", { name: "Crypto", exact: true }) })
    .last()
    .getByRole("button", { name, exact: true });

test("5.06 5.07 selector lists every enabled market, filters by category, and search recovers from no matches", async ({
  page,
  chainId,
}) => {
  const api = watchMarketsApi(page, chainId);
  await openTrade(page);
  await openMarketSelector(page);
  await expect.poll(() => api.config?.length ?? 0).toBeGreaterThan(0);
  const tokens = selectorIndexTokens(chainId, api.config!).map(({ token }) => token);
  const rows = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "LAST PRICE", exact: true }) })
    .locator("tbody tr");
  const labels = () =>
    rows.evaluateAll((elements) =>
      elements.map((row) => (row as HTMLTableRowElement).cells[1].innerText.trim().split(/\s+/)[0]).sort()
    );
  await expect.poll(() => rows.count()).toBeGreaterThanOrEqual(tokens.length);
  for (const { tab, categories } of CATEGORY_TABS) {
    await categoryTab(page, tab).click();
    const expected = tokens.filter((token) => token.categories?.some((category) => categories.includes(category)));
    expect(expected.length, `${tab} markets`).toBeGreaterThan(0);
    await expect.poll(labels).toEqual(expected.map(marketLabel).sort());
  }
  await categoryTab(page, "All").click();
  await expect.poll(() => rows.count()).toBeGreaterThanOrEqual(tokens.length);

  const search = page.getByPlaceholder("Search market", { exact: true });
  await search.fill("BTC");
  const btc = page.getByRole("row").filter({ has: page.getByText("BTC/USD", { exact: true }) });
  await expect(btc).toBeVisible();
  await expect(btc.getByRole("img", { name: "BTC", exact: true })).toBeVisible();
  await search.fill("regression-no-such-market");
  await expect(btc).toHaveCount(0);
  await expect(
    page
      .getByText(/No .*found|No .*match/)
      .filter({ visible: true })
      .first()
  ).toBeVisible();
  await search.fill("BTC");
  await btc.click();
  await expect(search).toBeHidden();
  await expect(page.getByRole("banner").getByRole("button", { name: /BTC\/USD/ })).toBeVisible();
});

test("5.09 favorites filter persists across a page refresh", async ({ page }) => {
  await openTrade(page);
  await openMarketSelector(page);
  await page.getByPlaceholder("Search market", { exact: true }).fill("ETH");
  const row = page.getByRole("row").filter({ has: page.getByText("ETH/USD", { exact: true }) });
  await row.getByRole("button").click();
  await page.getByRole("button", { name: "Favourites", exact: true }).click();
  await expect(row).toBeVisible();
  await page.reload();
  await openMarketSelector(page);
  await expect(row).toBeVisible();
  await expect(page.getByRole("row").filter({ has: page.getByText("BTC/USD", { exact: true }) })).toHaveCount(0);
  await row.getByRole("button").click();
  await categoryTab(page, "All").click();
  await expect(page.getByRole("row").filter({ has: page.getByText("BTC/USD", { exact: true }) })).toBeVisible();
});

test("22.02 synthetic market uses its index token in the header and size units", async ({ page, chainId }) => {
  await openTrade(page);
  const symbol = chainId === 42161 ? "SILVER" : "DOGE";
  await selectMarket(page, symbol);
  await expect(page.getByTestId("position-size")).toContainText(symbol);
  await page.getByTestId("position-size-display-mode-button").click();
  await expect(page.getByRole("cell", { name: symbol, exact: true })).toBeVisible();
});

test("3.08 chain selector switches to the other chain and to MegaETH and persists each", async ({ page, chainId }) => {
  await openTrade(page);
  const other = chainId === 42161 ? { name: "Avalanche", id: "43114" } : { name: "Arbitrum", id: "42161" };
  for (const { name, id } of [other, { name: "MegaETH", id: "4326" }]) {
    await test.step(name, async () => {
      await page.getByTestId("networks-dropdown-handle").click();
      await page.getByTestId(`networks-dropdown-${name}`).click();
      await expect(page.getByRole("banner").getByRole("button", { name, exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => localStorage.getItem("SELECTED_NETWORK"))).toBe(id);
      await page.reload();
      await expect(page.getByRole("banner").getByRole("button", { name, exact: true })).toBeVisible();
      await expect(page.getByTestId("margin-input")).toBeVisible();
    });
  }
});
