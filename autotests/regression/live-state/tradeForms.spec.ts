import { expect } from "@playwright/test";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { test } from "../fixtures/liveWallet";
import { selectedMarketName } from "../fixtures/marketData";
import { inputNumber, selectMarket, selectTradeDirection } from "../fixtures/trade";
import { configureClassicTrading } from "../fixtures/tradingForms";

for (const direction of ["Long", "Short"] as const) {
  test(`5.15 5.34 live ${direction}: margin token search recovers and Collateral In switches between both pool tokens on one market`, async ({
    page,
    liveWallet,
    liveAccounts,
  }) => {
    await liveWallet.connect(page);
    await selectMarket(page, "ETH");
    await selectTradeDirection(page, direction);
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
}

test("8.06 live position: close receive-token search changes output without changing the close size", async ({
  page,
  liveWallet,
  liveAccount,
}) => {
  await liveWallet.connect(page);
  await configureClassicTrading(page);
  const p = liveAccount.position!;
  const row = page.getByTestId(`position-item-${p.indexName}-${p.poolName}-${p.isLong ? "Long" : "Short"}`);
  await row.getByTestId("position-close-button").click({ timeout: 45_000 });
  const modal = page.getByTestId("position-close-modal");
  const input = modal.getByTestId("amount-input-input");
  const size = (Number(p.sizeInUsd) / 1e30 / 2).toFixed(2);
  await input.fill(size);
  for (const symbol of ["ETH", "USDC"]) {
    await modal.locator(".PositionSelector-selected-receive-token").click();
    const picker = page.locator(".TokenSelector-modal .Modal-content");
    const search = picker.getByPlaceholder("Search", { exact: true });
    await search.fill(symbol);
    await picker.getByText(symbol, { exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(modal.locator(".PositionSelector-selected-receive-token")).toContainText(symbol);
    await expect.poll(() => inputNumber(input)).toBe(Number(size));
  }
});
