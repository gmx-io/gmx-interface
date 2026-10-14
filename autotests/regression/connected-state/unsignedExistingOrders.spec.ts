import { expect } from "@playwright/test";
import { maxUint256, zeroAddress } from "viem";

import { test } from "../fixtures/accountState";
import { configureClassicTrading } from "../fixtures/tradingForms";
import { inspectRejectedOrder } from "../fixtures/walletReview";

test.use({ walletReviewMode: true, unsignedReviewMode: true });

for (const type of [3, 8, 5, 6]) {
  for (const operation of ["edit", "cancel"] as const) {
    test(`unsigned order ${type} ${operation}: request targets the selected order and rejection preserves it`, async ({
      page,
      accountState,
      walletReviews,
    }) => {
      const order = accountState.data.order(type);
      order.triggerPrice = BigInt(type === 8 || type === 5 ? 4000 : 1000) * 10n ** 12n;
      accountState.orders = [order];
      accountState.positions = [accountState.data.position(true)];
      accountState.balances.set(zeroAddress, 10n ** 18n);
      await accountState.connect(page);
      await configureClassicTrading(page);
      await page
        .getByTestId("exchange-list-tabs")
        .getByRole("button", { name: /^Orders/ })
        .click();
      const row = page.getByTestId(`order-${order.key}`);
      let button = row.getByRole("button", { name: "", exact: true }).last();
      if (operation === "edit") {
        await row.getByRole("button", { name: "Edit order", exact: true }).click();
        const price = page.getByTestId("trigger-price-input-input");
        await price.fill(type === 8 || type === 5 ? "4100" : "1100");
        button = page.locator(".Modal-content").filter({ has: price }).locator("button.primary-action");
      }
      const { calls } = await inspectRejectedOrder(button, walletReviews);
      const mutations = calls.filter((call) => call.functionName !== "sendWnt");
      expect(mutations).toHaveLength(1);
      const mutation = mutations[0];
      if (operation === "cancel") {
        if (mutation.functionName !== "cancelOrder") throw new Error("Expected cancellation");
        expect(mutation.args).toEqual([order.key]);
      } else {
        if (mutation.functionName !== "updateOrder") throw new Error("Expected order update");
        expect(mutation.args[0]).toBe(order.key);
        expect(mutation.args[1]).toBe(type === 5 || type === 6 ? maxUint256 : order.sizeDeltaUsd);
        expect(mutation.args[3]).toBe(BigInt(type === 8 || type === 5 ? 4100 : 1100) * 10n ** 12n);
        await expect(page.getByTestId("trigger-price-input-input")).toBeVisible();
        await page.keyboard.press("Escape");
      }
      await expect(row).toBeVisible();
      await expect(row).toContainText(type === 8 || type === 5 ? /4,000\.00/ : /1,000\.00/);
    });
  }
}
