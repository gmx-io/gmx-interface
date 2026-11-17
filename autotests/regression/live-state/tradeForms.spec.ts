import { expect } from "@playwright/test";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { test } from "../fixtures/liveWallet";
import { selectedMarketName } from "../fixtures/marketData";
import { selectMarket, selectTradeDirection } from "../fixtures/trade";

// Both selectors are direction-independent, so one side is enough.
test("5.15 5.34 live Long: margin token search recovers and Collateral In switches between both pool tokens on one market", async ({
  page,
  liveWallet,
  liveAccounts,
}) => {
  await liveWallet.connect(page);
  await selectMarket(page, "ETH");
  await selectTradeDirection(page, "Long");
  const selector = page.getByTestId("margin-collateral-selector");
  for (const symbol of [liveAccounts.chainId === 42161 ? "ETH" : "AVAX", "USDC"]) {
    await selector.click();
    const modal = page.getByTestId("margin-collateral-selector-modal");
    const search = modal.getByPlaceholder("Search", { exact: true });
    await search.fill("no-such-asset");
    await expect(modal.locator('[data-qa^="available-token-"]')).toHaveCount(0);
    await search.fill(symbol);
    const token = getTokenBySymbol(liveAccounts.chainId, symbol);
    await modal.getByTestId(`available-token-${token.address}-${liveAccounts.chainId}`).click();
    await expect(modal).toBeHidden();
    await expect(selector).toContainText(symbol);
  }
  const market = await selectedMarketName(page);
  const poolTokens = [...new Set(/\[([^\]]+)\]/.exec(market)![1].split("-"))];
  expect(poolTokens, "The selected pool has two collateral tokens").toHaveLength(2);
  const collateral = page.getByTestId("collateral-in-selector-button");
  // Selecting both tokens in turn changes the position collateral at least once, whatever the default is.
  for (const symbol of poolTokens) {
    await collateral.click();
    await page.getByTestId(`collateral-in-selector-row-${symbol}`).click();
    await expect(collateral).toContainText(symbol);
    expect(await selectedMarketName(page)).toBe(market);
  }
});
