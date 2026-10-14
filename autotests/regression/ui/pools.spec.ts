import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { zeroAddress } from "viem";

import { MARKETS } from "../../../sdk/src/configs/markets";
import { getToken, getTokenBySymbol, getTokenVisualMultiplier } from "../../../sdk/src/configs/tokens";
import { test } from "../fixtures/browser";
import { inputNumber } from "../fixtures/trade";
import { readRegressionGlvs } from "../fixtures/deploymentConfig";
import { displayedNumber } from "../fixtures/displayedNumber";
import { configuredMarkets, marketLabel } from "../fixtures/marketConfig";
import { watchMarketsApi } from "../fixtures/marketData";

type ApyResponse = Record<"markets" | "glvs", Record<string, { baseApy: number }>>;

function poolTable(page: Page, type: "GM" | "GLV") {
  return page.getByRole("table").filter({
    has: page.getByRole("columnheader", { name: type === "GM" ? "POOL" : "VAULT", exact: true }),
  });
}

function poolRows(page: Page, type: "GM" | "GLV") {
  return poolTable(page, type)
    .locator("tbody tr")
    .filter({ has: page.getByRole("link", { name: "Details", exact: true }) });
}

// Runs check on every page of the pool list, advancing with the numbered pagination buttons.
async function forEachPoolPage(page: Page, type: "GM" | "GLV", check: () => Promise<void>) {
  const card = page
    .locator("div")
    .filter({ has: page.getByText(type === "GM" ? "GM pools" : "GLV vaults", { exact: true }) })
    .filter({ has: poolTable(page, type) })
    .last();
  const first = card.getByRole("button", { name: "1", exact: true });
  if (await first.isVisible()) await first.click();
  for (let pageNumber = 1; ; pageNumber++) {
    await check();
    const next = card.getByRole("button", { name: String(pageNumber + 1), exact: true });
    if (!(await next.isVisible())) return;
    await next.click();
  }
}

function watchApy(page: Page) {
  const apys = new Map<string, ApyResponse>();
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (url.pathname !== "/apy" || !response.ok()) return;
    const json = await response.json().catch(() => undefined);
    if (json?.markets) apys.set(url.searchParams.get("period")!, json);
  });
  return apys;
}

type UsdgBoostResponse =
  | { status: "not_started" }
  | {
      status: "active";
      pools: { marketAddress: string; boostApr: number }[];
      glv: { glvAddress: string; boostApr: number } | null;
    };

// USDG pools add the launch boost to the shown APY (src/domain/synthetics/usdgLaunchBoost/utils.ts).
function watchUsdgBoost(page: Page) {
  const boost: { response?: UsdgBoostResponse } = {};
  page.on("response", async (response) => {
    if (!response.url().includes("/v1/incentives/usdg/boost-apr") || !response.ok()) return;
    boost.response = await response.json().catch(() => undefined);
  });
  return (address: string, type: "GM" | "GLV", composition: string) => {
    const { response } = boost;
    if (!response) return 0;
    if (response.status === "not_started") {
      const isBoosted =
        composition.includes("USDG") && (type === "GLV" || MARKETS[42161][address]?.indexTokenAddress !== zeroAddress);
      return isBoosted ? (type === "GLV" ? 0.08 : 0.05) : 0;
    }
    if (type === "GLV") return response.glv?.glvAddress === address ? response.glv.boostApr : 0;
    return response.pools.find((pool) => pool.marketAddress === address)?.boostApr ?? 0;
  };
}

// Markets enabled in src/config/static/markets.ts; the app config uses path aliases, so it is parsed.
function enabledUiMarkets(chainId: number) {
  const path = "src/config/static/markets.ts";
  const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const configs = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((declaration) => declaration.name.getText(file) === "MARKETS_UI_CONFIGS")?.initializer;
  if (!configs || !ts.isObjectLiteralExpression(configs)) throw new Error(`Missing MARKETS_UI_CONFIGS in ${path}`);
  const chain = configs.properties
    .filter(ts.isPropertyAssignment)
    .find((property) => property.name.getText(file) === (chainId === 42161 ? "[ARBITRUM]" : "[AVALANCHE]"));
  if (!chain || !ts.isObjectLiteralExpression(chain.initializer))
    throw new Error(`Missing chain ${chainId} in ${path}`);
  return chain.initializer.properties.filter(ts.isPropertyAssignment).flatMap((market) => {
    const enabled =
      ts.isObjectLiteralExpression(market.initializer) &&
      market.initializer.properties.some(
        (field) =>
          ts.isPropertyAssignment(field) &&
          field.name.getText(file) === "enabled" &&
          field.initializer.kind === ts.SyntaxKind.TrueKeyword
      );
    return enabled && ts.isStringLiteral(market.name) ? [market.name.text] : [];
  });
}

for (const metric of [
  { name: "TVL (SUPPLY)", column: 1 },
  { name: "FEE APY", column: 3 },
]) {
  test(`12.03 GM pools sort by ${metric.name} in both directions`, async ({ page }) => {
    await page.goto("/pools");
    const table = poolTable(page, "GM");
    const rows = table.locator("tbody tr").filter({ has: page.getByRole("link", { name: "Details", exact: true }) });
    await expect(rows.nth(2)).toBeVisible();
    const sort = table.getByRole("button", { name: metric.name, exact: true });
    for (const direction of ["desc", "asc"] as const) {
      await sort.click();
      await expect
        .poll(
          async () => {
            const texts = await rows.evaluateAll(
              (elements, column) => elements.map((row) => row.querySelectorAll("td")[column].textContent!),
              metric.column
            );
            // Pools without APY data show N/A and carry no sort value.
            const values = texts.filter((text) => text.trim() !== "N/A").map(displayedNumber);
            return (
              values.length > 2 &&
              values.every(
                (value, i) =>
                  Number.isFinite(value) &&
                  (i === 0 || (direction === "asc" ? values[i - 1] <= value : values[i - 1] >= value))
              )
            );
          },
          { timeout: 30_000 }
        )
        .toBe(true);
    }
  });
}

test("12.18 configured GLV vaults are all listed with distinct details links", async ({ page, chainId }) => {
  await page.goto("/pools");
  const addresses = readRegressionGlvs(chainId as 42161 | 43114);
  expect(addresses.length).toBeGreaterThan(0);
  const table = poolTable(page, "GLV");
  await expect(table.getByRole("link", { name: "Details", exact: true })).toHaveCount(addresses.length);
  for (const address of addresses) {
    const link = table.locator(`a[href*="market=${address}"]`);
    await expect(link).toBeVisible();
    await expect(link.locator("xpath=ancestor::tr")).not.toContainText(/NaN|Infinity|undefined/);
  }
});

test("12.04 pool search filters rows and recovers from no matches", async ({ page }) => {
  await page.goto("/pools");
  const table = poolTable(page, "GM");
  const search = page.getByPlaceholder("Search pools", { exact: true });
  await expect(table.getByRole("link", { name: "Details", exact: true }).first()).toBeVisible();
  await search.fill("regression-no-such-pool");
  await expect(page.getByText("No pools matched", { exact: true })).toBeVisible();
  await expect(table.getByRole("link", { name: "Details", exact: true })).toHaveCount(0);
  await search.fill("BTC");
  await expect(table.getByRole("link", { name: "Details", exact: true }).first()).toBeVisible();
  for (const row of await table.locator("tbody tr").all()) {
    await expect(row.getByRole("cell").first()).toContainText(/BTC/i);
  }
  await search.clear();
  await expect(page.getByText("No pools matched", { exact: true })).toBeHidden();
  await expect(table.getByRole("link", { name: "Details", exact: true }).nth(1)).toBeVisible();
});

test("12.01 23.12 /pools lists every enabled GM market the API does not disable, across all pages", async ({
  page,
  chainId,
}) => {
  test.slow();
  const api = watchMarketsApi(page, chainId);
  await page.goto("/pools");
  await expect(poolRows(page, "GM").first()).toBeVisible();
  await expect.poll(() => api.config?.length ?? 0).toBeGreaterThan(0);
  const disabled = new Set(api.config!.filter((market) => market.isDisabled).map((m) => m.marketTokenAddress));
  const sdkMarkets = MARKETS[chainId as keyof typeof MARKETS];
  const expected = enabledUiMarkets(chainId).filter((address) => sdkMarkets[address] && !disabled.has(address));
  // Rows re-sort while pool data loads, so a pass that skipped markets between pages is repeated.
  await expect(async () => {
    const shown = new Set<string>();
    await forEachPoolPage(page, "GM", async () => {
      await expect(poolRows(page, "GM").first()).toBeVisible();
      for (const href of await poolRows(page, "GM")
        .getByRole("link", { name: "Details", exact: true })
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")!))) {
        shown.add(href.match(/market=(0x[\da-fA-F]{40})/)![1]);
      }
    });
    expect([...shown].sort()).toEqual(expected.sort());
  }).toPass({ timeout: 120_000 });
});

for (const type of ["GM", "GLV"] as const) {
  test(`12.05 ${type} details open from the list and expose buy/sell forms`, async ({ page }) => {
    await page.goto("/pools");
    const details = poolTable(page, type).getByRole("link", { name: "Details", exact: true }).first();
    await expect(details).toHaveAttribute("href", /\/pools\/details\?market=0x[\da-fA-F]{40}/);
    const href = await details.getAttribute("href");
    await details.click();
    await expect(page).toHaveURL(new RegExp(`market=${new URL(href!, page.url()).searchParams.get("market")}`));
    await expect(page.getByRole("button", { name: `Buy ${type}`, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `Sell ${type}`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Buy ${type}`, exact: true }).click();
    const amount = page.getByTestId("gm-first-token-input");
    await amount.fill("1");
    await expect.poll(() => inputNumber(amount)).toBe(1);
    await page.getByRole("button", { name: `Sell ${type}`, exact: true }).click();
    await expect(page.getByRole("button", { name: "Connect wallet", exact: true }).last()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: `Buy ${type}`, exact: true })).toBeVisible();
    await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
  });

  test(`12.06 ${type} details show the list's TVL, the fee APR the app received, a zero balance without a wallet and backing composition summing to 100%`, async ({
    page,
  }) => {
    test.slow();
    const apys = watchApy(page);
    await page.goto("/pools");
    const first = poolRows(page, type).first();
    await expect(first.getByRole("cell").nth(1)).toContainText("$", { timeout: 30_000 });
    const href = await first.getByRole("link", { name: "Details", exact: true }).getAttribute("href");
    const address = href!.match(/market=(0x[\da-fA-F]{40})/)![1];
    // Rows re-sort while data loads, so keep using the same market's row.
    const row = poolRows(page, type).filter({ has: page.locator(`a[href*="market=${address}"]`) });
    const listTvl = displayedNumber(await row.getByRole("cell").nth(1).innerText());
    await row.getByRole("link", { name: "Details", exact: true }).click();
    const header = (label: string) => page.getByText(label, { exact: true }).first().locator("xpath=..");
    await expect
      .poll(async () => displayedNumber(await header("TVL (supply)").innerText()), { timeout: 30_000 })
      .toBeGreaterThan(0);
    expect(Math.abs(displayedNumber(await header("TVL (supply)").innerText()) / listTvl - 1)).toBeLessThan(0.01);
    await expect(header("TVL (supply)")).toContainText(new RegExp(`\\(.+ ${type}\\)`));
    await expect(header("Balance")).toContainText(new RegExp(`\\$\\s*0\\.00\\s*\\(0\\.0+ ${type}\\)`));
    await page.getByRole("button", { name: "Fee APR", exact: true }).click();
    await page.getByRole("button", { name: "30d", exact: true }).click();
    const feeApr = page
      .getByText("Fee APY", { exact: true })
      .locator("xpath=ancestor::div[contains(@class, 'items-center')][1]");
    await expect
      .poll(async () => {
        const apy = apys.get("30d")?.[type === "GM" ? "markets" : "glvs"][address]?.baseApy;
        return apy === undefined ? NaN : Math.abs(displayedNumber(await feeApr.innerText()) - apy * 100);
      })
      .toBeLessThanOrEqual(0.006);
    const backing = page
      .getByRole("table")
      .filter({ has: page.getByRole("columnheader", { name: "COLLATERAL", exact: true }) });
    await expect
      .poll(async () => {
        const values = (await backing.locator("tbody tr td:last-child").allTextContents()).map(displayedNumber);
        return values.length > 0 && values.every((value) => value >= 0 && value <= 100)
          ? Math.abs(values.reduce((sum, value) => sum + value, 0) - 100)
          : NaN;
      })
      .toBeLessThanOrEqual(0.02);
  });
}

test("12.19 every configured GLV vault's details page loads with its TVL and buy/sell forms", async ({
  page,
  chainId,
}) => {
  for (const address of readRegressionGlvs(chainId as 42161 | 43114)) {
    await page.goto(`/pools/details?market=${address}`);
    const tvl = page.getByText("TVL (supply)", { exact: true }).first().locator("xpath=..");
    await expect.poll(async () => displayedNumber(await tvl.innerText())).toBeGreaterThan(0);
    await expect(tvl).toContainText(/\(.+ GLV\)/);
    await expect(page.getByRole("button", { name: "Buy GLV", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sell GLV", exact: true })).toBeVisible();
    await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
  }
});

test("12.22 each GLV composition lists GM markets sharing the vault's collateral, within cap and summing to 100%", async ({
  page,
  chainId,
}) => {
  test.slow();
  const markets = configuredMarkets(chainId);
  for (const address of readRegressionGlvs(chainId as 42161 | 43114)) {
    await page.goto(`/pools/details?market=${address}`);
    const poolLabel = page.getByText(/^\[[^\]]+-[^\]]+\]$/).first();
    await expect(poolLabel).toBeVisible({ timeout: 45_000 });
    const pool = (await poolLabel.innerText()).slice(1, -1);
    const names = markets
      .filter((market) => market.indexToken && market.pool === pool)
      .map((market) => marketLabel(market.indexToken!));
    const table = page
      .getByRole("table")
      .filter({ has: page.getByRole("columnheader", { name: "TVL/CAP", exact: true }) });
    await expect
      .poll(
        async () => {
          const rows = await table
            .locator("tbody tr")
            .evaluateAll((elements) =>
              elements.map((row) =>
                Array.from(row.querySelectorAll("td"), (cell) => (cell as HTMLElement).innerText.trim())
              )
            );
          if (rows.length < 2) return ["fewer than two markets"];
          const problems = rows.flatMap(([name, tvlCap]) => {
            const [tvl, cap] = tvlCap.split("/").map(displayedNumber);
            return [
              !names.includes(name) && `${name} is not a [${pool}] GM market`,
              !(tvl >= 0 && tvl <= cap * 1.001) && `${name} TVL ${tvlCap}`,
            ].filter(Boolean) as string[];
          });
          const total = rows.reduce((sum, row) => sum + displayedNumber(row[2]), 0);
          return Math.abs(total - 100) <= rows.length * 0.01 ? problems : [...problems, `shares sum to ${total}`];
        },
        { timeout: 45_000 }
      )
      .toEqual([]);
  }
});

for (const period of ["Last 30d", "Last 90d", "Last 180d"]) {
  test(`pool performance period ${period} persists on refresh`, async ({ page }) => {
    await page.goto("/pools");
    const button = page.getByRole("button", { name: period, exact: true });
    await button.click();
    await expect(button).toHaveClass(/!bg-button-secondary/);
    await page.reload();
    await expect(button).toHaveClass(/!bg-button-secondary/);
    await expect(poolTable(page, "GM").getByRole("link", { name: "Details", exact: true }).first()).toBeVisible();
  });
}

function expectedPoolLabels(chainId: number, address: string) {
  const market = MARKETS[chainId as keyof typeof MARKETS][address];
  if (!market) return undefined;
  const [index, long, short] = [market.indexTokenAddress, market.longTokenAddress, market.shortTokenAddress].map(
    (token) => (token === zeroAddress ? undefined : getToken(chainId, token))
  );
  return {
    name: index ? `${getTokenVisualMultiplier(index)}${index.baseSymbol || index.symbol}/USD` : "SWAP-ONLY",
    composition: `[${long!.symbol}-${short!.symbol}]`,
    hasLidoApr: [long, short].some((token) => token?.symbol.toLowerCase() === "wsteth"),
  };
}

for (const type of ["GM", "GLV"] as const) {
  test(`12.02 ${type === "GM" ? "23.12 " : ""}every ${type} row shows its configured name and composition, TVL with supply, and the fee APY the app received`, async ({
    page,
    chainId,
  }) => {
    test.slow();
    const apys = watchApy(page);
    const usdgBoost = watchUsdgBoost(page);
    await page.goto("/pools");
    await page.getByRole("button", { name: "Last 30d", exact: true }).click();
    await expect.poll(() => apys.has("30d")).toBe(true);
    const rows = poolRows(page, type);
    await expect(rows.first()).toBeVisible();
    await forEachPoolPage(page, type, async () => {
      await expect
        .poll(async () => {
          const apy = apys.get("30d")![type === "GM" ? "markets" : "glvs"];
          const cells = await rows.evaluateAll((elements) =>
            elements.map((row) => ({
              href: row.querySelector("a[href*='market=']")!.getAttribute("href")!,
              name: (row.querySelectorAll("td")[0] as HTMLElement).innerText.split("\n").map((line) => line.trim()),
              tvl: (row.querySelectorAll("td")[1] as HTMLElement).innerText.split("\n").map((line) => line.trim()),
              apy: (row.querySelectorAll("td")[3] as HTMLElement).innerText.trim(),
            }))
          );
          if (!cells.length) return ["no rows rendered"];
          return cells.flatMap(({ href, name: nameLines, tvl, apy: apyText }) => {
            const address = href.match(/market=(0x[\da-fA-F]{40})/)![1];
            // USDG pools put a "Whitelist only" or "Launch boost" badge between the name and the composition.
            const name = nameLines.filter((line) => line !== "Whitelist only" && line !== "Launch boost");
            const compositionIndex = name.findIndex((line) => /^\[.+-.+\]$/.test(line));
            const shown = { name: name[compositionIndex - 1], composition: name[compositionIndex] };
            const labels = type === "GM" ? expectedPoolLabels(chainId, address) : undefined;
            const expected =
              type === "GM"
                ? labels && { name: labels.name, composition: labels.composition }
                : { name: "GLV", composition: shown.composition };
            const tvlUsd = displayedNumber(tvl[0]);
            const supply = displayedNumber(tvl[1] ?? "");
            const expectedApy =
              (apy[address]?.baseApy ?? 0) +
              (chainId === 42161 ? usdgBoost(address, type, shown.composition ?? "") : 0);
            const apyOk =
              expectedApy === 0
                ? apyText === "N/A"
                : labels?.hasLidoApr
                  ? /^[\d,.]+%$/.test(apyText)
                  : Math.abs(displayedNumber(apyText) - expectedApy * 100) <= 0.006;
            const problems = [
              JSON.stringify(shown) !== JSON.stringify(expected) && `label ${JSON.stringify(shown)}`,
              !(tvlUsd > 0) && `tvl ${tvl[0]}`,
              !(supply >= 0 && new RegExp(`${type}\\)$`).test(tvl[1] ?? "")) && `supply ${tvl[1]}`,
              !apyOk && `apy ${apyText} vs ${expectedApy * 100}`,
            ].filter(Boolean);
            return problems.length ? [`${address}: ${problems.join(", ")}`] : [];
          });
        })
        .toEqual([]);
    });
  });
}

test("13.08 partial (Earn no longer lists pool APRs): only incentivized pools show the bonus badge, and bonus plus base APY equals the shown APY", async ({
  page,
  chainId,
}) => {
  let rewards: Record<string, string> = {};
  await page.route(/\/incentives(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    if (!json.lp?.isActive) {
      // No live LP program: reward every other configured GM pool with 100k USDC per week.
      const markets = Object.keys(MARKETS[chainId as keyof typeof MARKETS]).filter((_, i) => i % 2 === 0);
      json.lp = {
        isActive: true,
        period: 7 * 24 * 3600,
        token: getTokenBySymbol(chainId, "USDC").address,
        totalRewards: String(BigInt(markets.length) * 100_000_000_000n),
        rewardsPerMarket: Object.fromEntries(markets.map((market) => [market, "100000000000"])),
        excludeHolders: [],
      };
      test.info().annotations.push({ type: "incentives", description: "simulated LP program (none live)" });
    }
    rewards = json.lp.rewardsPerMarket;
    await route.fulfill({ response, json });
  });
  await page.goto("/pools");
  let bonusChecked = 0;
  for (const type of ["GLV", "GM"] as const) {
    const rows = poolRows(page, type);
    await expect(rows.first()).toBeVisible();
    await expect(rows.first().getByRole("cell").nth(3)).toContainText(/%|N\/A/);
    for (const row of await rows.all()) {
      const address = (await row.getByRole("link", { name: "Details", exact: true }).getAttribute("href"))!.match(
        /market=(0x[\da-fA-F]{40})/
      )![1];
      const apy = row.getByRole("cell").nth(3);
      const badge = apy.getByRole("img", { name: "Sparkle", exact: true });
      // USDG pools show the launch boost with the same sparkle; 12.02 checks their APY.
      if (chainId === 42161 && (await row.getByRole("cell").first().innerText()).includes("USDG")) continue;
      if (BigInt(rewards[address] ?? 0) === 0n) {
        await expect(badge).toHaveCount(0);
        continue;
      }
      await expect(badge).toBeVisible();
      await apy.locator(".Tooltip-handle").hover();
      const popup = page.locator(".Tooltip-popup").last();
      await expect(popup).toContainText("Bonus APR");
      const text = await popup.innerText();
      const [base, bonus, lido = "0"] = [
        /Base APY:?\s*([\d.,]+)%/,
        /Bonus APR:?\s*([\d.,]+)%/,
        /wstETH APR:?\s*([\d.,]+)%/,
      ].map((pattern) => pattern.exec(text)?.[1]);
      expect(displayedNumber(bonus!)).toBeGreaterThan(0);
      const total = displayedNumber(base!) + displayedNumber(bonus!) + displayedNumber(lido);
      expect(Math.abs(displayedNumber(await apy.innerText()) - total)).toBeLessThanOrEqual(0.02);
      await page.getByRole("banner").hover();
      await expect(popup).toBeHidden();
      bonusChecked++;
    }
  }
  expect(bonusChecked, "no incentivized pool on the first page").toBeGreaterThan(0);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});
