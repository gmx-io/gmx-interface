import { expect } from "@playwright/test";

import { test } from "../fixtures/accountState";
import { accountData } from "../fixtures/accountData";

for (const type of [3, 8]) {
  test(`6.04 22.02 synthetic order type ${type} displays the index token instead of the backing token`, async ({
    page,
    accountState,
    chainId,
  }) => {
    const symbol = chainId === 42161 ? "SILVER" : "DOGE";
    const data = accountData(chainId, accountState.address, symbol);
    const order = data.order(type);
    accountState.orders = [order];
    await accountState.connect(page);
    await page
      .getByTestId("trade-table-large")
      .getByRole("button", { name: /^Orders/ })
      .click();
    const row = page.getByTestId(`order-${order.key}`);
    await expect(row).toContainText(new RegExp(`${symbol}.*Long`));
    await expect(row.getByRole("img", { name: symbol, exact: true }).first()).toBeVisible();
    await expect(row).not.toContainText(/ETH\/USD|AVAX\/USD/);
    await accountState.refresh(page);
    await expect(row).toContainText(symbol);
  });
}
