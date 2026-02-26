import { useMemo } from "react";

import { hashedPositionKey } from "config/dataStore";
import {
  PendingPositionUpdate,
  PositionDecreaseEvent,
  PositionIncreaseEvent,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { getByKey } from "lib/objects";
import { getPositionKey, parsePositionKey } from "sdk/utils/positions";

import type { MarketsInfoData } from "../markets";
import type { Position, PositionInfo, PositionsData, PositionsInfoData } from "./types";

const MAX_PENDING_UPDATE_AGE = 600 * 1000; // 10 minutes

function applyEventChanges<T extends Position>(position: T, event: PositionIncreaseEvent | PositionDecreaseEvent): T {
  const nextPosition = { ...position };

  nextPosition.sizeInUsd = event.sizeInUsd;
  nextPosition.sizeInTokens = event.sizeInTokens;
  nextPosition.collateralAmount = event.collateralAmount;
  nextPosition.pendingBorrowingFeesUsd = 0n;
  nextPosition.fundingFeeAmount = 0n;
  nextPosition.claimableLongTokenAmount = 0n;
  nextPosition.claimableShortTokenAmount = 0n;
  nextPosition.pendingUpdate = undefined;
  nextPosition.isOpening = false;

  // eslint-disable-next-line local-rules/no-logical-bigint
  if ((event as PositionIncreaseEvent).increasedAtTime) {
    nextPosition.increasedAtTime = (event as PositionIncreaseEvent).increasedAtTime;
  }

  // eslint-disable-next-line local-rules/no-logical-bigint
  if ((event as PositionDecreaseEvent).decreasedAtTime) {
    nextPosition.decreasedAtTime = (event as PositionDecreaseEvent).decreasedAtTime;
  }

  return nextPosition;
}

function applyOptimisticUpdates<T extends Position>({
  positionsData,
  allPositionsKeys,
  positionIncreaseEvents,
  positionDecreaseEvents,
  pendingPositionsUpdates,
  createMockPosition,
}: {
  positionsData: Record<string, T> | undefined;
  allPositionsKeys: string[];
  positionIncreaseEvents: PositionIncreaseEvent[] | undefined;
  positionDecreaseEvents: PositionDecreaseEvent[] | undefined;
  pendingPositionsUpdates: Record<string, PendingPositionUpdate | undefined>;
  createMockPosition: (pendingUpdate: PendingPositionUpdate) => T | null;
}): Record<string, T> {
  return allPositionsKeys.reduce((acc, key) => {
    const now = Date.now();

    const lastIncreaseEvent = positionIncreaseEvents?.filter((e) => e.positionKey === key).pop();
    const lastDecreaseEvent = positionDecreaseEvents?.filter((e) => e.positionKey === key).pop();

    const pendingUpdate =
      pendingPositionsUpdates?.[key] && (pendingPositionsUpdates[key]?.updatedAt ?? 0) + MAX_PENDING_UPDATE_AGE > now
        ? pendingPositionsUpdates[key]
        : undefined;

    let position: T;

    if (getByKey(positionsData, key)) {
      position = { ...getByKey(positionsData, key)! };
    } else if (pendingUpdate && pendingUpdate.isIncrease) {
      const mock = createMockPosition(pendingUpdate);
      if (!mock) return acc;
      position = mock;
    } else {
      return acc;
    }

    if (
      lastIncreaseEvent &&
      lastIncreaseEvent.increasedAtTime > position.increasedAtTime &&
      lastIncreaseEvent.increasedAtTime > (lastDecreaseEvent?.decreasedAtTime || 0)
    ) {
      position = applyEventChanges(position, lastIncreaseEvent);
    } else if (
      lastDecreaseEvent &&
      lastDecreaseEvent.decreasedAtTime > position.decreasedAtTime &&
      lastDecreaseEvent.decreasedAtTime > (lastIncreaseEvent?.increasedAtTime || 0)
    ) {
      position = applyEventChanges(position, lastDecreaseEvent);
    }

    if (
      pendingUpdate &&
      ((pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock > position.increasedAtTime) ||
        (!pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock > position.decreasedAtTime))
    ) {
      position.pendingUpdate = pendingUpdate;
    }

    if (position.sizeInUsd > 0) {
      acc[key] = position;
    }

    return acc;
  }, {} as Record<string, T>);
}

export function getPendingMockPosition(pendingUpdate: PendingPositionUpdate): Position {
  const { account, marketAddress, collateralAddress, isLong } = parsePositionKey(pendingUpdate.positionKey);

  return {
    key: pendingUpdate.positionKey,
    contractKey: hashedPositionKey(account, marketAddress, collateralAddress, isLong),
    account,
    marketAddress,
    collateralTokenAddress: collateralAddress,
    isLong,
    sizeInUsd: pendingUpdate.sizeDeltaUsd ?? 0n,
    collateralAmount: pendingUpdate.collateralDeltaAmount ?? 0n,
    sizeInTokens: pendingUpdate.sizeDeltaInTokens ?? 0n,
    increasedAtTime: pendingUpdate.updatedAtBlock,
    decreasedAtTime: 0n,
    pendingBorrowingFeesUsd: 0n,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    positionFeeAmount: 0n,
    uiFeeAmount: 0n,
    pnl: 0n,
    traderDiscountAmount: 0n,
    pendingImpactAmount: 0n,
    data: "0x",
    isOpening: true,
    pendingUpdate: pendingUpdate,
  };
}

function getPendingMockPositionInfo(
  pendingUpdate: PendingPositionUpdate,
  marketsInfoData: MarketsInfoData | undefined
): PositionInfo | null {
  const { marketAddress, collateralAddress, isLong } = parsePositionKey(pendingUpdate.positionKey);
  const marketInfo = marketsInfoData?.[marketAddress];

  if (!marketInfo) return null;

  const mockPosition = getPendingMockPosition(pendingUpdate);
  const collateralToken =
    collateralAddress === marketInfo.longToken.address ? marketInfo.longToken : marketInfo.shortToken;
  const pnlToken = isLong ? marketInfo.longToken : marketInfo.shortToken;

  return {
    ...mockPosition,
    marketInfo,
    market: marketInfo,
    indexToken: marketInfo.indexToken,
    longToken: marketInfo.longToken,
    shortToken: marketInfo.shortToken,
    collateralToken,
    pnlToken,
    indexName: "",
    poolName: "",
    markPrice: 0n,
    entryPrice: undefined,
    liquidationPrice: undefined,
    collateralUsd: 0n,
    remainingCollateralUsd: 0n,
    remainingCollateralAmount: 0n,
    hasLowCollateral: false,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    netPriceImapctDeltaUsd: 0n,
    priceImpactDiffUsd: 0n,
    pendingImpactUsd: 0n,
    closePriceImpactDeltaUsd: 0n,
    leverage: undefined,
    leverageWithPnl: undefined,
    leverageWithoutPnl: undefined,
    netValue: 0n,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pendingClaimableFundingFeesUsd: 0n,
  };
}

export function getAllPossiblePositionsKeys(
  account: string | null | undefined,
  marketsInfoData: MarketsInfoData | undefined
): string[] {
  if (!account || !marketsInfoData) return [];

  const keys: string[] = [];

  for (const market of Object.values(marketsInfoData)) {
    if (market.isSpotOnly) continue;

    const collaterals = market.isSameCollaterals
      ? [market.longTokenAddress]
      : [market.longTokenAddress, market.shortTokenAddress];

    for (const collateralAddress of collaterals) {
      for (const isLong of [true, false]) {
        keys.push(getPositionKey(account, market.marketTokenAddress, collateralAddress, isLong));
      }
    }
  }

  return keys;
}

export function useOptimisticPositions(p: {
  positionsData: PositionsData | undefined;
  allPositionsKeys: string[] | undefined;
  isLoading: boolean;
}): PositionsData | undefined {
  const { positionsData, allPositionsKeys, isLoading } = p;
  const { positionDecreaseEvents, positionIncreaseEvents, pendingPositionsUpdates } = useSyntheticsEvents();

  return useMemo(() => {
    if (!allPositionsKeys || isLoading) {
      return undefined;
    }

    return applyOptimisticUpdates({
      positionsData,
      allPositionsKeys,
      positionIncreaseEvents,
      positionDecreaseEvents,
      pendingPositionsUpdates,
      createMockPosition: getPendingMockPosition,
    });
  }, [allPositionsKeys, isLoading, pendingPositionsUpdates, positionDecreaseEvents, positionIncreaseEvents, positionsData]);
}

export function useOptimisticPositionsInfo(p: {
  positionsInfoData: PositionsInfoData | undefined;
  allPositionsKeys: string[] | undefined;
  isLoading: boolean;
  marketsInfoData: MarketsInfoData | undefined;
}): PositionsInfoData | undefined {
  const { positionsInfoData, allPositionsKeys, isLoading, marketsInfoData } = p;
  const { positionDecreaseEvents, positionIncreaseEvents, pendingPositionsUpdates } = useSyntheticsEvents();

  return useMemo(() => {
    if (!allPositionsKeys || isLoading) {
      return undefined;
    }

    return applyOptimisticUpdates<PositionInfo>({
      positionsData: positionsInfoData,
      allPositionsKeys,
      positionIncreaseEvents,
      positionDecreaseEvents,
      pendingPositionsUpdates,
      createMockPosition: (pendingUpdate) => getPendingMockPositionInfo(pendingUpdate, marketsInfoData),
    });
  }, [
    allPositionsKeys,
    isLoading,
    marketsInfoData,
    pendingPositionsUpdates,
    positionDecreaseEvents,
    positionIncreaseEvents,
    positionsInfoData,
  ]);
}
