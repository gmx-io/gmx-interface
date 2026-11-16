import { expect } from "@playwright/test";

import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { test } from "../fixtures/browser";
import { relativeDiff, watchTickerPrices } from "../fixtures/quoteDetails";
import { inputNumber, labelledInput, selectTradeMode } from "../fixtures/trade";

let price: ReturnType<typeof watchTickerPrices>;

test.beforeEach(async ({ page, chainId }) => {
  price = watchTickerPrices(page, chainId);
  await page.goto("/trade/swap?mode=market&from=USDC&to=ETH");
  await expect(page.getByTestId("collateral-selector")).toContainText("USDC");
  await expect(page.getByTestId("receive-selector")).toContainText("ETH");
  await expect(page).not.toHaveURL(/[?&](mode|from|to)=/);
});

test("11.03 swap quote converts at the oracle price from either input and clears together", async ({ page }) => {
  const ethPerUsdc = () => price("USDC", "minPrice") / price("ETH", "maxPrice");
  const pay = page.getByTestId("pay-input");
  const receive = page.getByTestId("swap-receive-input");
  await pay.fill("100");
  await expect.poll(async () => relativeDiff(await inputNumber(receive), 100 * ethPerUsdc())).toBeLessThan(0.01);
  // A typed receive amount is the minimum after slippage, so pay covers the selected 0.5% slippage too.
  await page.getByTestId("tradebox").getByRole("button", { name: "0.5%", exact: true }).click();
  await receive.fill("0.1");
  await expect
    .poll(async () => relativeDiff(await inputNumber(pay), 0.1 / ethPerUsdc() / (1 - 0.005)))
    .toBeLessThan(0.003);
  await pay.clear();
  await expect(receive).toHaveValue("");
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});

test("11.02 receive token search filters by token, recovers from no matches and selects the result", async ({
  page,
  chainId,
}) => {
  await page.getByTestId("receive-selector").click();
  const modal = page.getByTestId("receive-selector-modal");
  const tokens = modal.locator('[data-qa^="receive-selector-token-"]');
  await expect(tokens.nth(3)).toBeVisible();
  const total = await tokens.count();
  const search = modal.getByPlaceholder("Search", { exact: true });
  await search.fill("btc");
  await expect(modal.getByTestId("receive-selector-token-BTC")).toBeVisible();
  const shown = await tokens.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-qa")!.replace("receive-selector-token-", ""))
  );
  expect(shown.length).toBeLessThan(total);
  for (const symbol of shown) {
    const token = getTokenBySymbol(chainId, symbol);
    expect([token.name, token.symbol, ...(token.searchAliases ?? [])].join(" ").toLowerCase(), symbol).toContain("btc");
  }
  await search.fill("regression-no-such-token");
  await expect(modal.getByText("No tokens matched", { exact: true })).toBeVisible();
  await expect(tokens).toHaveCount(0);
  await search.clear();
  await expect(tokens).toHaveCount(total);
  await search.fill("btc");
  await modal.getByTestId("receive-selector-token-BTC").click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId("receive-selector")).toContainText("BTC");
  await expect(page.getByTestId("collateral-selector")).toContainText("USDC");
});

test("swap direction button exchanges the pay and receive tokens", async ({ page }) => {
  await page.getByTestId("pay-input").fill("100");
  await expect.poll(() => inputNumber(page.getByTestId("swap-receive-input"))).toBeGreaterThan(0);
  await page.getByTestId("swap-ball").click();
  await expect(page.getByTestId("collateral-selector")).toContainText("ETH");
  await expect(page.getByTestId("receive-selector")).toContainText("USDC");
  await expect.poll(() => inputNumber(page.getByTestId("pay-input"))).toBeGreaterThan(0);
  await page.getByTestId("swap-ball").click();
  await expect(page.getByTestId("collateral-selector")).toContainText("USDC");
  await expect(page.getByTestId("receive-selector")).toContainText("ETH");
});

test("11.11 limit swap exposes a trigger rate and returns to Market", async ({ page }) => {
  await selectTradeMode(page, "Limit");
  const rate = page.getByTestId("trigger-price-input");
  await rate.fill("3000");
  await expect.poll(() => inputNumber(rate)).toBe(3000);
  await page.getByTestId("pay-input").fill("100");
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
  await selectTradeMode(page, "Market");
  await expect(rate).toBeHidden();
});

test("TWAP swap calculates the size of each part", async ({ page }) => {
  await selectTradeMode(page, "TWAP");
  await page.getByTestId("pay-input").fill("100");
  const box = page.getByTestId("tradebox");
  const parts = labelledInput(box, "Number of parts");
  await parts.fill("5");
  await parts.press("Tab");
  await expect(parts).toHaveValue("5");
  await expect(box.getByText("Size per part", { exact: true }).locator("..")).toContainText(/\$\s*20\.00/);
  await expect(box.getByText("Frequency", { exact: true })).toBeVisible();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});
