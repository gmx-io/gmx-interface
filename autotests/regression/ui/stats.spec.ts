import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import {
  displayedSumMatches,
  factor,
  findMarket,
  findValues,
  openTooltip,
  watchMarketsApi,
} from "../fixtures/marketData";

test("18.01 18.02 18.03 18.08 overview and protocol statistics show positive values", async ({ page }) => {
  await page.goto("/stats");
  const cards = page.locator(".DashboardV2-cards");
  for (const label of [
    "TVL",
    "GM pools",
    "24h volume",
    "Open interest",
    "Long positions",
    "Short positions",
    "Fees",
    "Volume",
    "Users",
    "Treasury",
  ]) {
    const row = cards.locator(".App-card-row").filter({ has: page.getByText(label, { exact: true }) });
    await expect(row).toHaveCount(1);
    const value = row.locator(":scope > div").last();
    await expect.poll(async () => displayedNumber(await value.innerText()), { message: label }).toBeGreaterThan(0);
    await expect(row).not.toContainText(/NaN|Infinity|undefined/);
  }
});

test("18.04 18.05 GMX and GM token supply, price and market cap are positive", async ({ page }) => {
  await page.goto("/stats");
  const tokens = page.locator(".stats-wrapper--gmx");
  for (const label of ["Price", "Total supply", "Total staked", "Supply", "Market cap"]) {
    const rows = tokens.locator(".App-card-row").filter({ has: page.getByText(label, { exact: true }) });
    await expect(rows).toHaveCount(label === "Market cap" ? 2 : 1);
    for (const row of await rows.all()) {
      const value = row.locator(":scope > div").last();
      await expect.poll(async () => displayedNumber(await value.innerText()), { message: label }).toBeGreaterThan(0);
      await expect(row).not.toContainText(/NaN|Infinity|undefined/);
    }
  }
});

test("18.06 18.08 stats market search finds ETH with pool TVLs matching /v1/markets/values and recovers from no results", async ({
  page,
  chainId,
}) => {
  const api = watchMarketsApi(page, chainId);
  await page.goto("/stats");
  const search = page.getByPlaceholder("Search market", { exact: true });
  const table = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "MARKETS", exact: true }) });
  await search.fill("ETH");
  const row = table.locator("tbody tr").first();
  await expect(row).toContainText("ETH/USD");
  await expect.poll(async () => displayedNumber(await row.locator("td").nth(1).innerText())).toBeGreaterThan(0);
  const tvl = row.locator("td").nth(2).locator(".Tooltip-handle");
  await expect
    .poll(
      async () => {
        const popup = await openTooltip(page, tvl);
        const [total, text] = [displayedNumber(await tvl.innerText()), await popup.innerText()];
        await page.mouse.move(0, 0);
        const pools = [...text.matchAll(/(\S+\/USD)\s*\[([^\]]+)\]\s*:\s*(\$\s*[\d.,]+[kmbt]?)/g)].map(
          ([, index, pool, value]) => ({ name: `${index} [${pool}]`, value: displayedNumber(value) })
        );
        return (
          pools.length > 0 &&
          displayedSumMatches(
            total,
            pools.map((p) => p.value)
          ) &&
          pools.every(({ name, value }) =>
            displayedSumMatches(
              factor(findValues(api.values, findMarket(api.config, name)).poolValueMax),
              [value],
              0.005
            )
          )
        );
      },
      { message: "ETH pool TVLs match the poolValueMax the app received" }
    )
    .toBe(true);
  await expect(table).not.toContainText(/NaN|Infinity|undefined/);
  await search.fill("no-such-market");
  await expect(table.getByText("No markets found", { exact: true })).toBeVisible();
  await search.clear();
  await expect(table.getByText("No markets found", { exact: true })).toBeHidden();
  await expect.poll(() => table.locator("tbody tr").count()).toBeGreaterThan(2);
});

test("18.07 stats Buy GM opens the pools list", async ({ page }) => {
  await page.goto("/stats");
  await page.getByRole("link", { name: /Buy GM$/, exact: false }).click();
  await expect(page).toHaveURL(/\/pools$/);
  await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
});

test("13.13 stats Buy GMX opens the buy options and GMX swap", async ({ page }) => {
  await page.goto("/stats");
  await page.getByRole("button", { name: /Buy GMX$/, exact: false }).click();
  await expect(page.getByText("Buy on other platforms", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Buy GMX on GMX swap", exact: true }).click();
  await expect(page).toHaveURL(/\/trade\/swap/);
  await expect(page.getByTestId("receive-selector")).toContainText("GMX");
});
