import assert from "node:assert/strict";
import { expect, type Page } from "@playwright/test";
import { formatUnits, zeroAddress } from "viem";
import type { FundedSession } from "./session";
import type { UiWallet } from "./uiWallet";
import { economy, USD } from "./economy";
import { assertUiInventory, submitUiOrderAction } from "./uiOrders";
import { waitForUiExecution } from "./uiSettlement";
import { eventually } from "./trading";

export async function swapUiTokens(
  session: FundedSession,
  wallet: UiWallet,
  page: Page,
  reverse: boolean,
  amount: bigint
) {
  const state = await session.snapshot();
  const input = reverse ? state.weth : state.usdc;
  const output = reverse ? state.usdc : state.weth;
  const before = await session.remember("ui-swap", async () => {
    assertUiInventory(session, state, []);
    assert.ok(amount > 0n && (amount * input.prices.maxPrice) / 10n ** BigInt(input.decimals) <= 2n * USD);
    if (!reverse) assert.equal(state.wrappedAmount, 0n, "Existing WETH must not be swept");
    return {
      input: reverse ? state.wrappedAmount : state.stableAmount,
      output: reverse ? state.stableAmount : state.wrappedAmount,
      minimum:
        (amount * input.prices.minPrice * 10n ** BigInt(output.decimals) * 9_950n) /
        (10n ** BigInt(input.decimals) * output.prices.maxPrice * 10_000n),
    };
  });
  const action = await submitUiOrderAction(
    session,
    wallet,
    "swap",
    { kind: "swap", tokenIn: input.address, amount, minOutputAmount: before.minimum, unwrapNative: false },
    async () => {
      await page.goto(`/trade/swap?mode=market&from=${input.symbol}&to=${output.symbol}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByTestId("receive-selector")).toContainText(output.symbol);
      await page.getByTestId("pay-input").fill(formatUnits(amount, input.decimals));
      return page.getByTestId("confirm-trade-button");
    },
    (fresh) => {
      assertUiInventory(session, fresh, []);
      assert.equal(reverse ? fresh.wrappedAmount : fresh.stableAmount, before.input);
      if (!reverse) assert.ok(fresh.stableUsd - USD >= economy.stableReserveUsd);
    },
    { cleanup: reverse, marketAddress: zeroAddress, approval: { token: input.address, amount } }
  );
  await waitForUiExecution(session, action);
  const after = await eventually(
    () => session.snapshot(),
    (fresh) =>
      !fresh.orders.length &&
      !fresh.onchainOrderCount &&
      (reverse ? fresh.stableAmount : fresh.wrappedAmount) >= before.output + before.minimum
  );
  assert.equal(reverse ? after.wrappedAmount : after.stableAmount, before.input - amount);
  return (reverse ? after.stableAmount : after.wrappedAmount) - before.output;
}
