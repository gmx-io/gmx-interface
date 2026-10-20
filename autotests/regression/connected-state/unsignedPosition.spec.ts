import { expect } from "@playwright/test";
import { getAddress, maxUint256 } from "viem";

import { fundTrading, test } from "../fixtures/accountState";
import {
  configureClassicTrading,
  fillCollateralEdit,
  fillPositionClose,
  fundedPositionRow,
} from "../fixtures/tradingForms";
import { labelledInput, selectMarket } from "../fixtures/trade";
import { inspectRejectedCreateOrder } from "../fixtures/walletReview";

const USD = 10n ** 30n;
test.use({ walletReviewMode: true, unsignedReviewMode: true });
test.beforeEach(async ({ accountState, chainId }) => fundTrading(accountState, chainId));

for (const isLong of [true, false]) {
  for (const operation of ["Deposit", "Withdraw"] as const) {
    test(`8.09 unsigned ${isLong ? "Long" : "Short"} margin ${operation}: amount and direction reach the wallet and rejection keeps the editor open`, async ({
      page,
      accountState,
      walletReviews,
    }) => {
      accountState.positions = [accountState.data.position(isLong)];
      await accountState.connect(page);
      await configureClassicTrading(page);
      const button = await fillCollateralEdit(page, isLong, operation, "0.25");
      const { order } = await inspectRejectedCreateOrder(button, walletReviews);
      expect(order.isLong).toBe(isLong);
      expect(order.orderType).toBe(operation === "Deposit" ? 2 : 4);
      expect(order.numbers.sizeDeltaUsd).toBe(0n);
      expect(order.numbers.initialCollateralDeltaAmount).toBe(250_000n);
      expect(getAddress(order.addresses.receiver)).toBe(accountState.address);
      await expect(page.getByTestId("position-edit-modal")).toBeVisible();
    });
  }
  for (const size of ["250", "max"] as const) {
    test(`8.10 unsigned ${isLong ? "Long" : "Short"} ${size === "max" ? "full" : "partial"} close: requested size reaches the wallet and rejection preserves the position`, async ({
      page,
      accountState,
      walletReviews,
    }) => {
      accountState.positions = [accountState.data.position(isLong)];
      await accountState.connect(page);
      await configureClassicTrading(page);
      const button = await fillPositionClose(page, isLong, size);
      const { order } = await inspectRejectedCreateOrder(button, walletReviews);
      expect(order.isLong).toBe(isLong);
      expect(order.orderType).toBe(4);
      expect(order.numbers.sizeDeltaUsd).toBe(BigInt(size === "max" ? 1000 : size) * USD);
      expect(getAddress(order.addresses.receiver)).toBe(accountState.address);
      await expect(page.getByTestId("position-close-modal")).toBeVisible();
      await expect(fundedPositionRow(page, isLong)).toContainText(/1,000\.00/);
    });
  }
  for (const [kind, type, trigger] of [
    ["TP", 5, isLong ? "3000" : "2000"],
    ["SL", 6, isLong ? "2000" : "3000"],
  ] as const) {
    test(`unsigned ${isLong ? "Long" : "Short"} ${kind}: position form submits the intended exit order`, async ({
      page,
      accountState,
      walletReviews,
    }) => {
      accountState.positions = [accountState.data.position(isLong)];
      await accountState.connect(page);
      await configureClassicTrading(page);
      await selectMarket(page, "ETH");
      await fundedPositionRow(page, isLong).getByRole("button", { name: "Set", exact: true }).click();
      await page.getByRole("button", { name: "Add TP/SL", exact: true }).last().click();
      const modal = page
        .locator(".Modal-content")
        .filter({ has: page.getByText(new RegExp(`^(TP/SL|TP|SL): Close ETH/USD ${isLong ? "Long" : "Short"}$`)) });
      const price = labelledInput(modal, `${kind} price`);
      await price.fill(trigger);
      const button = modal.locator("button.primary-action");
      const { order } = await inspectRejectedCreateOrder(button, walletReviews);
      expect(order.orderType).toBe(type);
      expect(order.isLong).toBe(isLong);
      expect(order.numbers.triggerPrice).toBe(BigInt(trigger) * 10n ** 12n);
      expect(order.numbers.sizeDeltaUsd).toBe(maxUint256);
      expect(getAddress(order.addresses.receiver)).toBe(accountState.address);
      await expect(modal).toBeVisible();
    });
  }
}
