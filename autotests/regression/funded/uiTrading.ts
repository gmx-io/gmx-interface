import assert from "node:assert/strict";
import type { Locator, Page } from "@playwright/test";
import { formatUnits, getAddress } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { convertToUsd } from "../../../sdk/src/utils/tokens/utils";
import { fillCollateralEdit, fillPositionClose, fillPositionOrder } from "../fixtures/tradingForms";
import { affordablePosition, ceilDiv, economy, USD } from "./economy";
import type { FundedSession } from "./session";
import { eventually, ownPlannedPosition, position } from "./trading";
import { inspectUiOrder, type UiOrderIntent } from "./uiOrderGuard";
import { waitForUiExecution } from "./uiSettlement";
import { UiWallet } from "./uiWallet";

type Snapshot = Awaited<ReturnType<FundedSession["snapshot"]>>;

async function submitOrder(
  session: FundedSession,
  wallet: UiWallet,
  purpose: string,
  intent: UiOrderIntent,
  fill: () => Promise<Locator>,
  beforeSize: bigint,
  cleanup = false
) {
  const previous = await session.previousAction(`ui:${purpose}`);
  if (previous) {
    await waitForUiExecution(session, previous);
    return previous;
  }
  const state = await session.snapshot();
  const preflight = (fresh: Snapshot) => {
    assert.equal(fresh.orders.length, 0, "Only one funded exposure at a time");
    assert.equal(fresh.onchainOrderCount, 0);
    assert.equal(fresh.positions.length, beforeSize === 0n ? 0 : 1);
    assert.equal(fresh.onchainPositionCount, fresh.positions.length);
    assert.equal(fresh.positions[0]?.sizeInUsd ?? 0n, beforeSize, "Position changed while filling the UI form");
    if (fresh.positions[0]) {
      const existing = fresh.positions[0];
      assert.ok(session.active.ownedPositionKeys.includes(existing.key), "Unowned position");
      assert.ok(intent.kind === "increase" || intent.kind === "close");
      assert.equal(existing.isLong, intent.isLong);
      assert.equal(getAddress(existing.marketAddress), getAddress(fresh.market.marketTokenAddress));
      assert.equal(getAddress(existing.collateralTokenAddress), getAddress(fresh.usdc.address));
    }
    if (intent.kind === "increase") {
      const collateralUsd = convertToUsd(intent.collateralAmount, fresh.usdc.decimals, fresh.usdc.prices.maxPrice)!;
      assert.ok(beforeSize + intent.sizeUsd + (intent.sizeToleranceUsd ?? 0n) <= economy.positionLimitUsd);
      assert.ok((fresh.positions[0]?.collateralUsd ?? 0n) + collateralUsd <= economy.collateralLimitUsd);
      assert.ok(fresh.stableUsd - collateralUsd >= economy.stableReserveUsd, "UI action would consume stable reserves");
    }
  };
  preflight(state);
  const button = await fill();
  const action = await wallet.submit(
    {
      purpose,
      cleanup,
      preflight,
      approval:
        intent.kind === "increase" && intent.collateralAmount > 0n
          ? {
              token: state.usdc.address,
              spender: getContract(42161, "SyntheticsRouter"),
              // One finite allowance covers open, increase and margin deposit in this economy journey.
              amount: (economy.collateralLimitUsd * 10n ** BigInt(state.usdc.decimals)) / USD,
            }
          : undefined,
      inspect: (tx, fresh) => {
        const checked = inspectUiOrder(tx, intent, {
          address: session.address,
          marketAddress: fresh.market.marketTokenAddress,
          usdc: fresh.usdc,
          weth: fresh.weth,
          ownedOrderKeys: session.active.ownedOrderKeys,
        });
        return {
          extraFeeUsd: checked.extraFeeUsd,
          uiOrder: {
            createdCount: checked.createdCount,
            marketAddress: fresh.market.marketTokenAddress,
            sizeDeltaUsd: checked.sizeDeltaUsd.toString(),
          },
        };
      },
    },
    button
  );
  await waitForUiExecution(session, action);
  return action;
}

export async function openUiPosition(
  session: FundedSession,
  wallet: UiWallet,
  page: Page,
  isLong: boolean,
  remainingParts = 1
) {
  const state = await session.snapshot();
  if (!(await session.previousAction("ui:open"))) {
    assert.ok(
      !state.positions.length && !state.onchainPositionCount && !state.orders.length && !state.onchainOrderCount,
      "Opening requires empty inventory before recording position ownership"
    );
  }
  const planned = await session.remember("ui-opening", async () => {
    const sizing = affordablePosition({ ...state.market, openingCostsUsd: USD / 2n, remainingParts });
    return {
      // USD inputs convert through tokens; stay above the minimum after rounding or a small price move.
      sizeUsd: sizing.sizeUsd + USD / 100n,
      collateralAmount: ceilDiv(sizing.collateralUsd * 10n ** BigInt(state.usdc.decimals), state.usdc.prices.minPrice),
    };
  });
  await ownPlannedPosition(session, isLong);
  const action = await submitOrder(
    session,
    wallet,
    "open",
    { kind: "increase", isLong, ...planned, sizeToleranceUsd: planned.sizeUsd / 1_000n },
    () =>
      fillPositionOrder(page, {
        isLong,
        collateral: formatUnits(planned.collateralAmount, state.usdc.decimals),
        size: formatUnits(planned.sizeUsd, 30),
      }),
    0n
  );
  const sizeUsd = BigInt(action.uiOrder!.sizeDeltaUsd!);
  await eventually(
    () => session.snapshot(),
    (fresh) =>
      fresh.positions.length === 1 &&
      fresh.onchainPositionCount === 1 &&
      fresh.positions[0].sizeInUsd === sizeUsd &&
      !fresh.orders.length &&
      !fresh.onchainOrderCount
  );
  return { sizeUsd };
}

export async function changeUiPosition(
  session: FundedSession,
  wallet: UiWallet,
  page: Page,
  operation: "increase" | "deposit" | "withdraw" | "partial" | "close"
) {
  const state = await session.snapshot();
  const before = await session.remember("position", () => position(session));
  const increasing = operation === "increase" || operation === "deposit";
  const sizeUsd =
    operation === "increase"
      ? state.market.minPositionSizeUsd + USD / 100n
      : operation === "partial"
        ? before.sizeInUsd / 2n
        : operation === "close"
          ? before.sizeInUsd
          : 0n;
  if (operation === "partial")
    assert.ok(
      sizeUsd >= state.market.minPositionSizeUsd && before.sizeInUsd - sizeUsd >= state.market.minPositionSizeUsd,
      "Partial close would leave a position below the live minimum"
    );
  const collateralAmount =
    operation === "deposit" || operation === "withdraw"
      ? 250_000n
      : increasing
        ? ceilDiv(sizeUsd * 10n ** BigInt(state.usdc.decimals), 2n * state.usdc.prices.minPrice)
        : before.collateralAmount;
  const intent: UiOrderIntent = {
    kind: increasing ? "increase" : "close",
    isLong: before.isLong,
    sizeUsd,
    collateralAmount,
    ...(operation === "increase" ? { sizeToleranceUsd: sizeUsd / 1_000n } : {}),
    ...(operation === "withdraw"
      ? {
          minimumOutputUsd:
            (convertToUsd(collateralAmount, state.usdc.decimals, state.usdc.prices.minPrice)! * 99n) / 100n,
        }
      : {}),
  };
  const action = await submitOrder(
    session,
    wallet,
    operation,
    intent,
    async () => {
      if (operation === "deposit" || operation === "withdraw")
        return fillCollateralEdit(page, before.isLong, operation === "deposit" ? "Deposit" : "Withdraw", "0.25");
      if (operation === "increase")
        return fillPositionOrder(page, {
          isLong: before.isLong,
          collateral: formatUnits(collateralAmount, state.usdc.decimals),
          size: formatUnits(sizeUsd, 30),
        });
      return fillPositionClose(page, before.isLong, operation === "close" ? "max" : formatUnits(sizeUsd, 30));
    },
    before.sizeInUsd,
    operation === "close"
  );
  const delta = BigInt(action.uiOrder!.sizeDeltaUsd!);
  const expected = before.sizeInUsd + (increasing ? delta : -delta);
  await eventually(
    () => session.snapshot(),
    (fresh) => {
      if (fresh.orders.length || fresh.onchainOrderCount) return false;
      if (expected === 0n) return !fresh.positions.length && !fresh.onchainPositionCount;
      if (fresh.positions.length !== 1 || fresh.onchainPositionCount !== 1) return false;
      const after = fresh.positions[0];
      return (
        after.sizeInUsd === expected &&
        (operation === "deposit"
          ? after.collateralAmount > before.collateralAmount
          : operation === "withdraw"
            ? after.collateralAmount < before.collateralAmount
            : true)
      );
    }
  );
  return expected;
}
