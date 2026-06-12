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

  it("applies the covering event onto the opening mock instead of dropping the position", () => {
    const pendingUpdate = makePendingUpdate();
    const positions = applyOptimisticUpdates({
      positionsData: undefined,
      allPositionsKeys: [positionKey],
      positionIncreaseEvents: [makeIncreaseEvent()],
      positionDecreaseEvents: [],
      pendingPositionsUpdates: { [positionKey]: pendingUpdate },
      createMockPosition: getPendingMockPosition,
    });

    expect(positions[positionKey]?.sizeInUsd).toBe(100n);
    expect(positions[positionKey]?.increasedAtTime).toBe(1_700_000_000n);
    expect(positions[positionKey]?.pendingUpdate).toBeUndefined();
  });

  it("keeps the pending state when block coverage is unknown", () => {
    const pendingUpdate = makePendingUpdate({ updatedAtBlock: 0n });
    const positions = applyOptimisticUpdates({
      positionsData: undefined,
      allPositionsKeys: [positionKey],
      positionIncreaseEvents: [makeIncreaseEvent()],
      positionDecreaseEvents: [],
      pendingPositionsUpdates: { [positionKey]: pendingUpdate },
      createMockPosition: getPendingMockPosition,
    });

    expect(positions[positionKey]?.pendingUpdate).toBe(pendingUpdate);
  });

  it("does not cover a pending update from another order's event", () => {
    const pendingUpdate = makePendingUpdate({ orderKey: "0xanother-order" });
    const positions = applyOptimisticUpdates({
      positionsData: undefined,
      allPositionsKeys: [positionKey],
      positionIncreaseEvents: [makeIncreaseEvent()],
      positionDecreaseEvents: [],
      pendingPositionsUpdates: { [positionKey]: pendingUpdate },
      createMockPosition: getPendingMockPosition,
    });

    expect(positions[positionKey]?.pendingUpdate).toBe(pendingUpdate);
  });

  it("covers a pending update by order key even when the block number is stale", () => {
    const pendingUpdate = makePendingUpdate({ orderKey: "0xorder", updatedAtBlock: 200n });
    const positions = applyOptimisticUpdates({
      positionsData: undefined,
      allPositionsKeys: [positionKey],
      positionIncreaseEvents: [makeIncreaseEvent()],
      positionDecreaseEvents: [],
      pendingPositionsUpdates: { [positionKey]: pendingUpdate },
      createMockPosition: getPendingMockPosition,
    });

    expect(positions[positionKey]?.pendingUpdate).toBeUndefined();
  });

  it("attaches the pending update to an existing position when newer than the last position change", () => {
    const pendingUpdate = makePendingUpdate();
    const existingPosition = {
      ...getPendingMockPosition(makePendingUpdate()),
      isOpening: false,
      pendingUpdate: undefined,
      sizeInUsd: 100n,
      increasedAtTime: 1_700_000_000n,
    };

    const positions = applyOptimisticUpdates({
      positionsData: { [positionKey]: existingPosition },
      allPositionsKeys: [positionKey],
      positionIncreaseEvents: [],
      positionDecreaseEvents: [],
      pendingPositionsUpdates: { [positionKey]: pendingUpdate },
      createMockPosition: getPendingMockPosition,
    });

    expect(positions[positionKey]?.pendingUpdate).toBe(pendingUpdate);
  });
});
