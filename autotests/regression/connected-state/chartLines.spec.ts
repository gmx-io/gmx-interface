import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/accountState";
import { displayedNumber } from "../fixtures/displayedNumber";
import { selectMarket } from "../fixtures/trade";
import { fundedPositionRow } from "../fixtures/tradingForms";

const PRICE = 10n ** 12n;

type TradingLine = { tool: string; text: string; price: number };

// Position and order lines are canvas-only and absent from getAllShapes(), so read the chart model in the iframe.
function chartTradingLines(page: Page): Promise<TradingLine[]> {
  return page
    .frameLocator('iframe[title="Financial Chart"]')
    .locator("body")
    .evaluate(() => {
      const api = (window as any).tradingViewApi;
      if (!api) return [];
      return api
        .activeChart()
        ._chartWidget.model()
        .model()
        .allLineTools()
        .filter((source: any) => source.toolname === "LineToolPosition" || source.toolname === "LineToolOrder")
        .map((source: any) => ({
          tool: source.toolname,
          text: source.adapter().getText(),
          price: source.adapter().getPrice(),
        }));
    });
}

test("20.06 20.07 chart draws entry, liquidation, TP and SL lines for a mocked position and Chart positions hides them", async ({
  page,
  accountState,
}) => {
  const { position, order } = accountState.data;
  accountState.positions = [position(true)];
  accountState.orders = [
    { ...order(5, true, 1), triggerPrice: 3000n * PRICE },
    { ...order(6, true, 2), triggerPrice: 2100n * PRICE },
  ];
  await accountState.connect(page);
  await selectMarket(page, "ETH");
  const lines = async () =>
    (await chartTradingLines(page))
      .sort((a, b) => b.price - a.price)
      .map(({ tool, text, price }) => [tool, text.replace(/\s+/g, " "), price]);
  const expected = [
    ["LineToolOrder", "Long ETH/USD · TP · +$ 200.00", 3000],
    ["LineToolPosition", "Long ETH/USD · PnL +$ 0.00 · $ 1,000.00", 2500],
    ["LineToolOrder", "Long ETH/USD · SL · -$ 160.00", 2100],
    ["LineToolPosition", "Long ETH/USD · liquidation", expect.any(Number)],
  ];
  await expect.poll(lines, { timeout: 30_000 }).toEqual(expected);
  // The app recomputes the liquidation price on 2.2.1 instead of using the mocked one; the line must match the row.
  const rowLiquidation = displayedNumber(await fundedPositionRow(page, true).getByRole("cell").nth(6).innerText());
  await expect.poll(async () => (await lines())[3][2]).toBeCloseTo(rowLiquidation, 0);
  const toggle = page.getByRole("button", { name: "Chart positions", exact: true });
  await toggle.click();
  await expect.poll(lines).toEqual([]);
  await toggle.click();
  await expect.poll(lines, { timeout: 30_000 }).toEqual(expected);
});
