import { expect, type Locator, type Page } from "@playwright/test";

import { MARKETS } from "../../../sdk/src/configs/markets";
import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import { displayedSumMatches, factor, openTooltip, watchMarketsApi } from "../fixtures/marketData";

const networks = { 42161: "Arbitrum", 43114: "Avalanche" } as Record<number, string>;
const invalid = /NaN|undefined|Infinity|null/;

function overviewRow(page: Page, label: string) {
  return page
    .locator(".DashboardV2-cards .App-card-row")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator(".Tooltip-handle");
}

async function closeTooltips(page: Page) {
  await page.mouse.move(0, 0);
  await expect(page.locator(".Tooltip-popup")).toHaveCount(0);
}

// Reads the handle and its tooltip together, since both refresh with live data.
async function readTooltip(page: Page, handle: Locator) {
  const popup = await openTooltip(page, handle);
  const reading = { value: await handle.innerText(), text: await popup.innerText() };
  await closeTooltips(page);
  return reading;
}

async function expectTooltipSum(page: Page, handle: Locator, parse: (text: string) => number[], message: string) {
  await expect
    .poll(
      async () => {
        const { value, text } = await readTooltip(page, handle);
        return displayedSumMatches(displayedNumber(value), parse(text));
      },
      // Treasury and staking values come from several RPC reads and can take over 15 seconds.
      { message, timeout: 45_000 }
    )
    .toBe(true);
}

// Waits for one consistent reading that lists the required networks; values refresh while the page is open.
async function chainsStats(page: Page, label: string, required: string[] = []) {
  const handle = overviewRow(page, label);
  await expect(handle).toBeVisible({ timeout: 45_000 });
  let stats = { value: NaN, entries: {} as Record<string, number> };
  await expect
    .poll(
      async () => {
        const reading = await readTooltip(page, handle);
        const value = displayedNumber(reading.value);
        // Network rows and the total; stale or missing-data notices are not amounts.
        const rows = reading.text.matchAll(/([A-Za-z][\w ]*):\s+(\$?\s*[\d.,]+[kmbt]?)\s*$/gm);
        stats = { value, entries: Object.fromEntries([...rows].map(([, title, v]) => [title, displayedNumber(v)])) };
        const { Total } = stats.entries;
        return Total !== undefined && displayedSumMatches(value, [Total]) && required.every((n) => n in stats.entries);
      },
      { timeout: 45_000, message: `${label} total and ${required.join(", ")} rows` }
    )
    .toBe(true);
  return stats;
}

function usdValues(text: string) {
  return [...text.matchAll(/\$\s*([\d.,]+[kmbt]?)/g)].map(([, value]) => displayedNumber(value));
}

function rowAmounts(text: string) {
  return [...text.matchAll(/:\s+\$?\s*([\d.,]+[kmbt]?)/g)].map(([, value]) => displayedNumber(value));
}

function poolTable(page: Page, type: "GM" | "GLV") {
  return page.getByRole("table").filter({
    has: page.getByRole("columnheader", { name: type === "GM" ? "POOL" : "VAULT", exact: true }),
  });
}

test(
  "2.30 Pools TVL equals the pool values the app received and the selected network's GM pools on Stats",
  { tag: "@avalanche" },
  async ({ page, chainId }, testInfo) => {
    const api = watchMarketsApi(page, chainId);
    await page.goto("/pools");
    const tvl = page.getByText("TVL in vaults and pools", { exact: true }).locator("xpath=preceding-sibling::*[1]");
    await expect(tvl).toHaveText(/\$\s*[\d,]{7,}/, { timeout: 45_000 });
    let expected = 0;
    await expect
      .poll(async () => {
        if (!api.config || !api.values) return false;
        // The app sums only enabled markets from its own market config, not every market the API lists.
        const configured = Object.keys(MARKETS[chainId as 42161]);
        const enabled = new Set(
          api.config
            .filter((m) => !m.isDisabled && configured.includes(m.marketTokenAddress))
            .map((m) => m.marketTokenAddress)
        );
        expected = api.values
          .filter((v) => enabled.has(v.marketTokenAddress))
          .reduce((sum, v) => sum + factor(v.poolValueMax), 0);
        return Math.abs(displayedNumber(await tvl.innerText()) / expected - 1) < 0.001;
      })
      .toBe(true);
    const poolsTvl = displayedNumber(await tvl.innerText());
    await page.goto("/stats");
    const network = networks[chainId];
    const gmPools = await chainsStats(page, "GM pools", [network]);
    const totalTvl = await chainsStats(page, "TVL", [network]);
    await testInfo.attach("tvl", {
      body: JSON.stringify({ poolsTvl, expected, gmPools, totalTvl }),
      contentType: "application/json",
    });
    expect(
      displayedSumMatches(gmPools.entries[network], [poolsTvl], 0.003),
      `Stats ${network} GM pools vs Pools TVL`
    ).toBe(true);
    expect(totalTvl.entries[network]).toBeGreaterThan(gmPools.entries[network]);
  }
);

test("2.31 GM and GLV fee APY equal the /apy base APY the app received and APY/performance values are sane", async ({
  page,
  chainId,
}) => {
  const host = chainId === 42161 ? "arbitrum" : "avalanche";
  const apys: Record<
    string,
    { markets: Record<string, { baseApy: number }>; glvs: Record<string, { baseApy: number }> }
  > = {};
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (url.pathname !== "/apy" || !url.hostname.startsWith(host) || !response.ok()) return;
    apys[url.searchParams.get("period") ?? ""] = await response.json().catch(() => undefined);
  });
  await page.goto("/pools");
  const period = await page.evaluate(() => JSON.parse(localStorage.getItem('"pools-time-range"') ?? '"90d"'));
  const fees: number[] = [];
  for (const type of ["GLV", "GM"] as const) {
    const rows = poolTable(page, type)
      .locator("tbody tr")
      .filter({ has: page.getByRole("link", { name: "Details", exact: true }) });
    await expect(rows.first().locator("td").nth(3)).toHaveText(/\d+\.\d{2}%/, { timeout: 45_000 });
    await expect.poll(() => apys[period]).toBeDefined();
    for (const row of await rows.all()) {
      const href = (await row.getByRole("link", { name: "Details", exact: true }).getAttribute("href"))!;
      const address = new URL(href, page.url()).searchParams.get("market")!;
      const apyCell = row.locator("td").nth(3);
      const base = (apys[period][type === "GM" ? "markets" : "glvs"][address]?.baseApy ?? NaN) * 100;
      const fee = displayedNumber(await apyCell.innerText());
      const performance = (await row.locator("td").nth(4).innerText()).trim();
      fees.push(fee);
      expect(fee, `${type} ${address} fee APY`).toBeGreaterThanOrEqual(0);
      expect(fee, `${type} ${address} fee APY`).toBeLessThan(1000);
      // Bonus and wstETH APR are added on top of the base APY; such cells carry a tooltip or sparkle.
      if (await apyCell.locator(".Tooltip, img").count()) expect(fee).toBeGreaterThanOrEqual(base - 0.011);
      else expect(Math.abs(fee - base), `${type} ${address} fee APY vs /apy ${base}`).toBeLessThanOrEqual(0.011);
      if (performance !== "-") {
        expect(Math.abs(displayedNumber(performance)), `${type} ${address} performance`).toBeLessThan(1000);
      }
    }
  }
  const median = fees.sort((a, b) => a - b)[Math.floor(fees.length / 2)];
  expect(median).toBeGreaterThan(0.1);
  expect(median).toBeLessThan(100);
});

test("18.09 every Stats tooltip opens with content and no NaN, undefined or Infinity", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/stats");
  await expect(overviewRow(page, "TVL")).toBeVisible({ timeout: 45_000 });
  await expect(overviewRow(page, "Users")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".stats-wrapper--gmx .Tooltip").first()).toBeVisible();
  const markets = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "MARKETS", exact: true }) });
  await expect.poll(() => markets.locator("tbody tr .Tooltip").count()).toBeGreaterThan(10);
  // The hover target: the handle, or the container itself for tooltips rendered "as" another element.
  const handles = page.locator(".Tooltip-handle, .Tooltip:not(:has(> .Tooltip-handle))");
  const problems: string[] = [];
  let opened = 0;
  for (let i = 0; i < (await handles.count()); i++) {
    const handle = handles.nth(i);
    if (!(await handle.isVisible())) continue;
    const name = (await handle.innerText()).replace(/\s+/g, " ").slice(0, 40);
    await handle.scrollIntoViewIfNeeded();
    const popup = await openTooltip(page, handle).catch(() => undefined);
    if (!popup) {
      problems.push(`${name}: did not open`);
      continue;
    }
    const text = await popup.innerText();
    await closeTooltips(page);
    opened++;
    if (!text.trim() || invalid.test(text)) problems.push(`${name}: ${JSON.stringify(text.slice(0, 120))}`);
  }
  expect(opened).toBeGreaterThan(30);
  expect(problems).toEqual([]);
});

test("18.10 Stats sections agree: totals equal their network or pool rows, OI is long plus short, TVL covers GM pools", async ({
  page,
  chainId,
}) => {
  test.setTimeout(180_000);
  await page.goto("/stats");
  const stats: Record<string, Awaited<ReturnType<typeof chainsStats>>> = {};
  for (const label of ["24h volume", "Open interest", "Long positions", "Short positions", "TVL", "GM pools"]) {
    stats[label] = await chainsStats(page, label, [networks[chainId]]);
    const { Total, ...networkEntries } = stats[label].entries;
    expect(displayedSumMatches(Total, Object.values(networkEntries)), `${label} network rows sum to the total`).toBe(
      true
    );
  }
  // A network that has not answered yet is listed as a notice, not a row, so compare the rows present in both.
  const shared = (...labels: string[]) =>
    Object.keys(stats[labels[0]].entries).filter(
      (n) => n !== "Total" && labels.every((label) => n in stats[label].entries)
    );
  const oiNetworks = shared("Open interest", "Long positions", "Short positions");
  const tvlNetworks = shared("TVL", "GM pools");
  expect(oiNetworks).toContain(networks[chainId]);
  expect(tvlNetworks).toContain(networks[chainId]);
  for (const network of oiNetworks) {
    const sides = [stats["Long positions"].entries[network], stats["Short positions"].entries[network]];
    expect(
      displayedSumMatches(stats["Open interest"].entries[network], sides, 0.003),
      `${network} OI is long plus short`
    ).toBe(true);
  }
  // Solana's TVL falls back to its GM pools when the protocol stats have no store value, so they can be equal.
  for (const network of tvlNetworks) {
    expect(stats.TVL.entries[network], `${network} TVL includes GM pools`).toBeGreaterThanOrEqual(
      stats["GM pools"].entries[network]
    );
  }

  await expectTooltipSum(page, overviewRow(page, "Treasury"), rowAmounts, "Treasury is other tokens plus GMX");
  const staked = page
    .locator(".stats-wrapper--gmx .App-card-row")
    .filter({ has: page.getByText("Total staked", { exact: true }) })
    .locator(".Tooltip-handle");
  await expect
    .poll(
      async () => {
        const { value, text } = await readTooltip(page, staked);
        const usd = usdValues(text);
        const total = usd.pop()!;
        return displayedSumMatches(total, usd) && displayedSumMatches(displayedNumber(value), [total]);
      },
      { message: "Total staked GMX is the sum of the networks" }
    )
    .toBe(true);

  const rows = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "MARKETS", exact: true }) })
    .locator("tbody tr")
    .filter({ has: page.locator(".Tooltip") });
  await expect.poll(() => rows.count()).toBeGreaterThan(3);
  for (const row of await rows.all()) {
    const market = (await row.locator("td").first().innerText()).trim();
    for (const [column, name] of [
      [2, "TVL"],
      [3, "liquidity"],
    ] as const) {
      const cell = row.locator("td").nth(column).locator(".Tooltip-handle");
      await expectTooltipSum(page, cell, usdValues, `${market} ${name} is the sum of its pools`);
    }
    const rate = row.locator("td").nth(4).locator(".Tooltip-handle");
    await expect
      .poll(
        async () => {
          const { value: best, text: pools } = await readTooltip(page, rate);
          const pairs = [...pools.matchAll(/([+-]\s*[\d.]+)%\s+([+-]\s*[\d.]+)%/g)].map(([, l, s]) => [
            displayedNumber(l),
            displayedNumber(s),
          ]);
          const [long, short] = [...best.matchAll(/([+-]\s*[\d.]+)%/g)].map(([, v]) => displayedNumber(v));
          return (
            pairs.length > 0 &&
            long === Math.max(...pairs.map(([l]) => l)) &&
            short === Math.max(...pairs.map(([, s]) => s))
          );
        },
        { message: `${market} net rate is the best pool rate` }
      )
      .toBe(true);
  }
  await expect(page.locator(".DashboardV2")).not.toContainText(invalid);
});
