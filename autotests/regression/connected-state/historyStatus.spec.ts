import { expect } from "@playwright/test";
import { encodeErrorResult } from "viem";

import CustomErrors from "../../../sdk/src/abis/CustomErrors";
import { test } from "../fixtures/accountState";
import { mockTradeHistory, tradeAction } from "../fixtures/tradeHistory";

const PRICE = 10n ** 12n;

test("9.03 trade history labels created, executed, cancelled and failed orders", async ({
  page,
  context,
  accountState,
  chainId,
}) => {
  const reasonBytes = encodeErrorResult({
    abi: CustomErrors,
    errorName: "OrderNotFulfillableAtAcceptablePrice",
    args: [2600n * PRICE, 2500n * PRICE],
  });
  const cases = [
    { eventName: "OrderCreated", orderType: 3, label: "Create Limit" },
    { eventName: "OrderExecuted", orderType: 3, label: "Execute Limit" },
    { eventName: "OrderCancelled", orderType: 3, label: "Cancel Limit" },
    { eventName: "OrderFrozen", orderType: 3, label: "Failed Limit", failed: true },
    { eventName: "OrderExecuted", orderType: 5, label: "Execute Take-Profit" },
    { eventName: "OrderExecuted", orderType: 6, label: "Execute Stop-Loss" },
    { eventName: "OrderCancelled", orderType: 2, label: "Failed Market Increase", failed: true, reasonBytes },
  ];
  const rows = cases.map(({ eventName, orderType, reasonBytes }, index) =>
    tradeAction(chainId, accountState.address, index, {
      eventName,
      orderType,
      isLong: true,
      triggerPrice: (orderType === 2 ? 0n : 2000n * PRICE).toString(),
      reasonBytes: reasonBytes ?? null,
    })
  );
  await mockTradeHistory(context, chainId, accountState.address, rows);
  await accountState.connect(page);
  const table = page.getByTestId("trade-table-large");
  await table.getByRole("button", { name: "Trades", exact: true }).click();
  for (const [index, { label, failed }] of cases.entries()) {
    const action = table
      .locator(`tr:has(a[href$='/tx/${rows[index].transactionHash}'])`)
      .locator(".TradeHistoryRow-action-handle")
      .last();
    await expect(action).toHaveText(label);
    if (failed) await expect(action).toHaveClass(/text-red-500/);
    else await expect(action).not.toHaveClass(/text-red-500/);
  }
  await table
    .locator(`tr:has(a[href$='/tx/${rows.at(-1)!.transactionHash}'])`)
    .locator(".TradeHistoryRow-action-handle")
    .last()
    .hover();
  await expect(page.locator(".Tooltip-popup")).toContainText("Execution price didn't meet acceptable price");
  await expect(table).not.toContainText(/NaN|Infinity|undefined/);
});

test("21.07 fresh account shows the empty Positions, Orders, Trades and Claims states", async ({
  page,
  accountState,
}) => {
  await accountState.connect(page);
  const tabs = page.getByTestId("exchange-list-tabs");
  await expect(page.getByText("No open positions", { exact: true })).toBeVisible();
  await tabs.getByRole("button", { name: /^Orders/ }).click();
  await expect(page.getByText("No open orders", { exact: true })).toBeVisible();
  await tabs.getByRole("button", { name: "Trades", exact: true }).click();
  await expect(page.getByText("No trades yet", { exact: true })).toBeVisible();
  await tabs.getByRole("button", { name: "Claims", exact: true }).click();
  await expect(page.getByText("No claims yet", { exact: true })).toBeVisible();
});
