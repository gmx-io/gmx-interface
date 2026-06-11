import { describe, expect, it } from "vitest";

import { PositionIncreaseEvent, PendingPositionUpdate } from "context/SyntheticsEvents";
import { OrderType } from "sdk/utils/orders/types";
import { getPositionKey } from "sdk/utils/positions";

import { applyOptimisticUpdates, getPendingMockPosition } from "./useOptimisticPositions";

const account = "0x1111111111111111111111111111111111111111";
const marketAddress = "0x2222222222222222222222222222222222222222";
const collateralAddress = "0x3333333333333333333333333333333333333333";
const positionKey = getPositionKey(account, marketAddress, collateralAddress, true);

function makePendingUpdate(overrides: Partial<PendingPositionUpdate> = {}): PendingPositionUpdate {
  return {
    isIncrease: true,
    positionKey,
    sizeDeltaUsd: 100n,
    sizeDeltaInTokens: 5n,
    collateralDeltaAmount: 10n,
    updatedAtBlock: 100n,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeIncreaseEvent(overrides: Partial<PositionIncreaseEvent> = {}): PositionIncreaseEvent {
  return {
    blockNumber: 101,
    positionKey,
    contractPositionKey: "0xposition",
    account,
    marketAddress,
    collateralTokenAddress: collateralAddress,
    sizeInUsd: 100n,
    sizeInTokens: 5n,
    collateralAmount: 10n,
    borrowingFactor: 0n,
    executionPrice: 1n,
    sizeDeltaUsd: 100n,
    sizeDeltaInTokens: 5n,
    longTokenFundingAmountPerSize: 0n,
    shortTokenFundingAmountPerSize: 0n,
    collateralDeltaAmount: 10n,
    isLong: true,
    orderType: OrderType.MarketIncrease,
    orderKey: "0xorder",
    increasedAtTime: 1_700_000_000n,
    ...overrides,
  };
}

describe("applyOptimisticUpdates", () => {
  it("creates an opening mock while a pending increase has no covering event", () => {
    const pendingUpdate = makePendingUpdate();
    const positions = applyOptimisticUpdates({
      positionsData: undefined,
      allPositionsKeys: [positionKey],
      positionIncreaseEvents: [],
      positionDecreaseEvents: [],
      pendingPositionsUpdates: { [positionKey]: pendingUpdate },
      createMockPosition: getPendingMockPosition,
    });

    expect(positions[positionKey]?.isOpening).toBe(true);
    expect(positions[positionKey]?.pendingUpdate).toBe(pendingUpdate);
  });

  it("does not keep an opening mock after a later position event covers the pending update", () => {
    const pendingUpdate = makePendingUpdate();
    const positions = applyOptimisticUpdates({
      positionsData: undefined,
      allPositionsKeys: [positionKey],
      positionIncreaseEvents: [makeIncreaseEvent()],
      positionDecreaseEvents: [],
      pendingPositionsUpdates: { [positionKey]: pendingUpdate },
      createMockPosition: getPendingMockPosition,
    });

    expect(positions[positionKey]).toBeUndefined();
  });
});
