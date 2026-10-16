import { expect } from "@playwright/test";
import { getAddress, maxUint256, zeroAddress } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { test } from "../fixtures/accountState";
import {
  configureClassicTrading,
  fillCollateralEdit,
  fillPositionClose,
  fundedPositionRow,
} from "../fixtures/tradingForms";
import { labelledInput, selectMarket } from "../fixtures/trade";
import { inspectRejectedOrder } from "../fixtures/walletReview";

const USD = 10n ** 30n;
test.use({ walletReviewMode: true, unsignedReviewMode: true });
test.beforeEach(async ({ accountState, chainId }) => {
  accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
  accountState.balances.set(zeroAddress, 10n ** 18n);
  accountState.allowances.set(
    getAddress(accountState.data.collateral.address),
    new Map([[getAddress(getContract(chainId as ContractsChainId, "SyntheticsRouter")), 1000n * 10n ** 6n]])
  );
});

for (const isLong of [true, false]) {
  for (const operation of ["Deposit", "Withdraw"] as const) {
    test(`unsigned ${isLong ? "Long" : "Short"} margin ${operation}: amount and direction reach the wallet and rejection keeps the editor open`, async ({
      page,
      accountState,
      walletReviews,
    }) => {
      accountState.positions = [accountState.data.position(isLong)];
      await accountState.connect(page);
      await configureClassicTrading(page);
      const button = await fillCollateralEdit(page, isLong, operation, "0.25");
      const { calls } = await inspectRejectedOrder(button, walletReviews);
      const creates = calls.filter((call) => call.functionName === "createOrder");
      expect(creates).toHaveLength(1);
      const call = creates[0];
      if (call.functionName !== "createOrder") throw new Error("Expected createOrder");
      expect(call.args[0].isLong).toBe(isLong);
      expect(call.args[0].orderType).toBe(operation === "Deposit" ? 2 : 4);
      expect(call.args[0].numbers.sizeDeltaUsd).toBe(0n);
      expect(call.args[0].numbers.initialCollateralDeltaAmount).toBe(250_000n);
      expect(getAddress(call.args[0].addresses.receiver)).toBe(accountState.address);
      await expect(page.getByTestId("position-edit-modal")).toBeVisible();
    });
  }
  for (const size of ["250", "max"] as const) {
    test(`unsigned ${isLong ? "Long" : "Short"} ${size === "max" ? "full" : "partial"} close: requested size reaches the wallet and rejection preserves the position`, async ({
      page,
      accountState,
      walletReviews,
    }) => {
      accountState.positions = [accountState.data.position(isLong)];
      await accountState.connect(page);
      await configureClassicTrading(page);
      const button = await fillPositionClose(page, isLong, size);
      const { calls } = await inspectRejectedOrder(button, walletReviews);
      const creates = calls.filter((call) => call.functionName === "createOrder");
      expect(creates).toHaveLength(1);
      const call = creates[0];
      if (call.functionName !== "createOrder") throw new Error("Expected createOrder");
      expect(call.args[0].isLong).toBe(isLong);
      expect(call.args[0].orderType).toBe(4);
      expect(call.args[0].numbers.sizeDeltaUsd).toBe(BigInt(size === "max" ? 1000 : size) * USD);
      expect(getAddress(call.args[0].addresses.receiver)).toBe(accountState.address);
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
      const { calls } = await inspectRejectedOrder(button, walletReviews);
      const creates = calls.filter((call) => call.functionName === "createOrder");
      expect(creates).toHaveLength(1);
      const call = creates[0];
      if (call.functionName !== "createOrder") throw new Error("Expected createOrder");
      expect(call.args[0].orderType).toBe(type);
      expect(call.args[0].isLong).toBe(isLong);
      expect(call.args[0].numbers.triggerPrice).toBe(BigInt(trigger) * 10n ** 12n);
      expect(call.args[0].numbers.sizeDeltaUsd).toBe(maxUint256);
      expect(getAddress(call.args[0].addresses.receiver)).toBe(accountState.address);
      await expect(modal).toBeVisible();
    });
  }
}
