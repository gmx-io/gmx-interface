import { expect } from "@playwright/test";

import { test } from "../fixtures/accountState";
import { mockTradeHistory } from "../fixtures/tradeHistory";

test("10.01 10.02 10.03 10.05 populated trade history shows type, direction, size, price, PnL, fees and explorer links", async ({
  page,
  context,
  accountState,
  chainId,
}) => {
  const { rows } = await mockTradeHistory(context, chainId, accountState.address);
  await accountState.connect(page);
  const table = page.getByTestId("trade-table-large");
  await table.getByRole("button", { name: "Trades", exact: true }).click();
  const first = table.locator(`tr:has(a[href$='/tx/${rows[0].transactionHash}'])`);
  await expect(first).toContainText(/ETH.*Long/);
  await expect(first).toContainText(/1,000\.00/);
  await expect(first).toContainText(/2,500\.00/);
  const link = first.locator(`a[href$='/tx/${rows[0].transactionHash}']`);
  await expect(link).toHaveAttribute(
    "href",
    `${chainId === 42161 ? "https://arbiscan.io" : "https://snowtrace.io"}/tx/${rows[0].transactionHash}`
  );
  await expect(link).toHaveAttribute("target", "_blank");
  const second = table.locator(`tr:has(a[href$='/tx/${rows[1].transactionHash}'])`);
  await expect(second).toContainText(/ETH.*Short/);
  await expect(second).toContainText(/1,001\.00/);
  // Row 0 is an executed market increase, row 1 a market decrease realizing $10 (see tradeAction()).
  await expect(first.locator(".TradeHistoryRow-action-handle")).toHaveText("Market Increase");
  await expect(second.locator(".TradeHistoryRow-action-handle")).toHaveText("Market Decrease");
  await expect(first.getByRole("cell").nth(4)).toHaveText("-");
  await expect(second.getByRole("cell").nth(4)).toHaveText(/^\+?\$\s*10\.00$/);
  await expect(second.getByRole("cell").nth(4).locator(".text-green-500")).toBeVisible();
  // 0.6 USDC position fee at $1 collateral price.
  for (const row of [first, second]) await expect(row.getByRole("cell").nth(5)).toHaveText(/^-\$\s*0\.60$/);
  await expect(table).not.toContainText(/NaN|Infinity|undefined/);
});

test("10.04 17.10 populated history paginates forward and backward without losing earlier trades", async ({
  page,
  context,
  accountState,
  chainId,
}) => {
  const { rows } = await mockTradeHistory(context, chainId, accountState.address);
  await page.goto(`/traders/${accountState.address}`);
  await page.getByRole("button", { name: "Trades", exact: true }).click();
  await expect(page.locator(`a[href$='/tx/${rows[0].transactionHash}']`)).toBeVisible();
  await page.locator(".pagination").getByRole("button", { name: "2", exact: true }).click();
  await expect(page.locator(`a[href$='/tx/${rows[25].transactionHash}']`)).toBeVisible();
  await expect(page.locator(`a[href$='/tx/${rows[0].transactionHash}']`)).toHaveCount(0);
  await page.locator(".pagination").getByRole("button", { name: "3", exact: true }).click();
  await expect(page.locator(`a[href$='/tx/${rows[50].transactionHash}']`)).toBeVisible();
  await page.locator(".pagination").getByRole("button", { name: "1", exact: true }).click();
  await expect(page.locator(`a[href$='/tx/${rows[0].transactionHash}']`)).toBeVisible();
});
