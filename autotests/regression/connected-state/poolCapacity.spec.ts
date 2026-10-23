import { expect, type Page } from "@playwright/test";
import { zeroAddress } from "viem";

import { test } from "../fixtures/accountState";
import { configuredMarkets } from "../fixtures/marketConfig";

function gmMarket(chainId: number, index: string, pool: string) {
  const market = configuredMarkets(chainId).find((m) => m.indexToken?.symbol === index && m.pool === pool);
  expect(market, `${index}/USD [${pool}]`).toBeDefined();
  return market!.marketTokenAddress;
}

async function depositButton(page: Page) {
  // At this viewport the form is a collapsed bottom sheet until a tab is chosen.
  await page.getByRole("button", { name: "Buy GM", exact: true }).click({ timeout: 45_000 });
  const input = page.getByTestId("gm-first-token-input");
  await expect(input).toBeVisible();
  await input.fill("0.01");
  const form = page.locator("form").filter({ has: page.getByTestId("gm-first-token") });
  const button = form.locator("button[type=submit]");
  await expect(button).not.toHaveText(/Loading|Connect wallet/, { timeout: 45_000 });
  return button;
}

test("12.25 deposit into a pool at its deposit cap is blocked with the at-capacity message; other pools are not", async ({
  page,
  accountState,
  chainId,
}) => {
  const capped = gmMarket(chainId, chainId === 42161 ? "ETH" : "AVAX", chainId === 42161 ? "WETH-USDC" : "WAVAX-USDC");
  const open = gmMarket(chainId, "BTC", "BTC-USDC");
  accountState.balances.set(zeroAddress, 10n ** 18n);
  // The API reports the pool's deposit caps; zero caps put the capped pool at capacity for this browser only.
  let rewritten = 0;
  await page.route(/\/v1\/markets\/config(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const json = (await response.json()) as Record<string, unknown>[];
    for (const market of json) {
      if (market.marketTokenAddress !== capped) continue;
      market.maxLongPoolUsdForDeposit = "0";
      market.maxShortPoolUsdForDeposit = "0";
      rewritten++;
    }
    await route.fulfill({ response, json });
  });
  await accountState.connect(page, `/pools/details?market=${capped}`);
  const banner = page.getByText(
    "This pool is at maximum capacity and not accepting deposits right now. Try a different pool.",
    { exact: true }
  );
  const button = await depositButton(page);
  expect(rewritten).toBeGreaterThan(0);
  await expect(button).toHaveText("Maximum pool capacity reached");
  await expect(button).toBeDisabled();
  await expect(banner).toBeVisible();

  await page.getByRole("button", { name: "Sell GM", exact: true }).click();
  await expect(banner).toBeHidden();
  await expect(button).not.toHaveText("Maximum pool capacity reached");

  await page.goto(`/pools/details?market=${open}`);
  const openButton = await depositButton(page);
  await expect(openButton).not.toHaveText("Maximum pool capacity reached");
  await expect(banner).toBeHidden();
  await page.unrouteAll({ behavior: "ignoreErrors" });
});
