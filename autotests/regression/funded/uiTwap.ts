import assert from "node:assert/strict";
import type { Page } from "@playwright/test";
import { formatUnits } from "viem";
import { fillPositionOrder } from "../fixtures/tradingForms";
import { labelledInput } from "../fixtures/trade";
import { affordablePosition, ceilDiv, economy, USD } from "./economy";
import type { FundedSession } from "./session";
import { eventually, ownPlannedPosition } from "./trading";
import { assertUiInventory, submitUiOrderAction } from "./uiOrders";
import { waitForUiExecution } from "./uiSettlement";
import type { UiWallet } from "./uiWallet";

export async function createUiTwap(session: FundedSession, wallet: UiWallet, page: Page) {
  const state = await session.snapshot();
  const plan = await session.remember("ui-twap", async () => {
    assertUiInventory(session, state, []);
    const sizing = affordablePosition({ ...state.market, openingCostsUsd: USD / 2n, remainingParts: 2 });
    return {
      sizeUsd: sizing.sizeUsd + USD / 50n,
      collateralAmount: ceilDiv(sizing.collateralUsd * 10n ** 6n, state.usdc.prices.minPrice * 2n) * 2n,
    };
  });
  await ownPlannedPosition(session, true);
  const start = Math.floor(Date.now() / 1000);
  const action = await submitUiOrderAction(
    session,
    wallet,
    "twap",
    {
      kind: "increase",
      isLong: true,
      orderType: 3,
      ...plan,
      sizeToleranceUsd: plan.sizeUsd / 1_000n,
      twap: { start, end: start + 750 },
    },
    async () => {
      const button = await fillPositionOrder(page, {
        isLong: true,
        mode: "TWAP",
        collateral: formatUnits(plan.collateralAmount, 6),
        size: formatUnits(plan.sizeUsd, 30),
      });
      const box = page.getByTestId("tradebox");
      await labelledInput(box, "Hours").fill("0");
      await labelledInput(box, "Minutes").fill("10");
      await labelledInput(box, "Number of parts").fill("2");
      return button;
    },
    (fresh) => {
      assertUiInventory(session, fresh, []);
      assert.ok(
        fresh.stableUsd - (plan.collateralAmount * fresh.usdc.prices.maxPrice) / 10n ** 6n >= economy.stableReserveUsd
      );
    },
    { approval: { token: state.usdc.address, amount: plan.collateralAmount } }
  );
  assert.equal(action.orderKeys?.length, 2);
  const after = await eventually(
    () => session.snapshot(),
    (fresh) =>
      fresh.positions.length === 1 &&
      fresh.orders.length === 1 &&
      fresh.onchainOrderCount === 1 &&
      fresh.onchainPositionCount === 1
  );
  const pending = after.orders[0];
  assert.ok(action.orderKeys!.includes(pending.key));
  assert.ok(
    pending.validFromTime > BigInt(Math.floor(Date.now() / 1000) + 60),
    "TWAP remainder is too close to execution"
  );
  const executed = action.orderKeys!.find((key) => key !== pending.key)!;
  await waitForUiExecution(session, action, executed);
  assert.equal(after.positions[0].sizeInUsd + pending.sizeDeltaUsd, BigInt(action.uiOrder!.sizeDeltaUsd!));
  assert.ok(after.positions[0].sizeInUsd >= state.market.minPositionSizeUsd);
  return { key: pending.key, size: after.positions[0].sizeInUsd };
}
