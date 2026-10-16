import { expect } from "@playwright/test";

import { test } from "../fixtures/accountState";
import { accountData } from "../fixtures/accountData";
import { selectMarket } from "../fixtures/trade";

test("9.09 orders on two markets all show whichever market is selected", async ({ page, accountState, chainId }) => {
  const eth = accountState.data.order(3, true, 1);
  const btc = {
    ...accountData(chainId, accountState.address, "BTC").order(3, false, 2),
    triggerPrice: 90_000n * 10n ** 22n,
  };
  accountState.orders = [eth, btc];
  await accountState.connect(page);
  const table = page.getByTestId("trade-table-large");
  await table.getByRole("button", { name: /^Orders/ }).click();
  const rows = table.locator('tr[data-qa^="order-"]');
  for (const symbol of ["ETH", "BTC", "ETH"]) {
    await selectMarket(page, symbol);
    await expect(rows).toHaveCount(2);
    await expect(page.getByTestId(`order-${eth.key}`)).toContainText(/ETH.*Long/);
    await expect(page.getByTestId(`order-${btc.key}`)).toContainText(/BTC.*Short/);
    await expect(page.getByTestId(`order-${btc.key}`)).toContainText(/90,000\.00/);
  }
});
