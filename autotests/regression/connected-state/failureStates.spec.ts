import { expect } from "@playwright/test";
import { encodeErrorResult, zeroAddress } from "viem";

import CustomErrors from "../../../sdk/src/abis/CustomErrors";
import { test } from "../fixtures/accountState";
import { mockTradeHistory, tradeAction } from "../fixtures/tradeHistory";
import { configureClassicTrading } from "../fixtures/tradingForms";
import { inspectRejectedOrder } from "../fixtures/walletReview";

const PRICE = 10n ** 12n;

test.describe("frozen order", () => {
  test.use({ walletReviewMode: true, unsignedReviewMode: true });

  test.beforeEach(async ({ accountState }) => {
    accountState.orders = [{ ...accountState.data.order(3), isFrozen: true }];
    accountState.balances.set(zeroAddress, 10n ** 18n);
  });

  test("26.07 partial: a frozen limit order is labelled Failed Limit with its reason in Trades and its Orders row cancels via a cancelOrder request (rejected unsigned; collateral reclaim not verified)", async ({
    page,
    context,
    accountState,
    chainId,
    walletReviews,
  }) => {
    const [order] = accountState.orders;
    const frozen = tradeAction(chainId, accountState.address, 0, {
      eventName: "OrderFrozen",
      orderType: 3,
      orderKey: order.key,
      triggerPrice: (2000n * PRICE).toString(),
      reasonBytes: encodeErrorResult({
        abi: CustomErrors,
        errorName: "OrderNotFulfillableAtAcceptablePrice",
        args: [2600n * PRICE, 2500n * PRICE],
      }),
    });
    await mockTradeHistory(context, chainId, accountState.address, [frozen]);
    await accountState.connect(page);
    await configureClassicTrading(page);
    const table = page.getByTestId("trade-table-large");
    await table.getByRole("button", { name: "Trades", exact: true }).click();
    const action = table
      .locator(`tr:has(a[href$='/tx/${frozen.transactionHash}'])`)
      .locator(".TradeHistoryRow-action-handle")
      .last();
    await expect(action).toHaveText("Failed Limit");
    await expect(action).toHaveClass(/text-red-500/);
    await action.hover();
    await expect(page.locator(".Tooltip-popup")).toContainText("Execution price didn't meet acceptable price");

    await table.getByRole("button", { name: /^Orders/ }).click();
    const row = page.getByTestId(`order-${order.key}`);
    await expect(row).toContainText(/2,000\.00/);
    const { calls } = await inspectRejectedOrder(
      row.getByRole("button", { name: "", exact: true }).last(),
      walletReviews
    );
    const mutations = calls.filter((call) => call.functionName !== "sendWnt");
    expect(mutations.map((call) => [call.functionName, call.args])).toEqual([["cancelOrder", [order.key]]]);
    await expect(row).toBeVisible();
  });

  test("26.07 the Orders row of a frozen order shows a frozen or failed status", async ({ page, accountState }) => {
    await accountState.connect(page);
    await page
      .getByTestId("exchange-list-tabs")
      .getByRole("button", { name: /^Orders/ })
      .click();
    const row = page.getByTestId(`order-${accountState.orders[0].key}`);
    await expect(row).toContainText(/2,000\.00/);
    await expect(row).toContainText(/frozen|failed/i, { timeout: 5_000 });
  });
});
