import {
  PendingPositionUpdate,
  PositionDecreaseEvent,
  PositionIncreaseEvent,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { uniq } from "lodash";
import { usePositions } from "./usePositions";
import { Position, PositionsData } from "./types";
import { BigNumber } from "ethers";
import { parsePositionKey } from "./utils";
import { useMemo } from "react";
import { hashedPositionKey } from "config/dataStore";

const MAX_PENDING_UPDATE_AGE = 600 * 1000;

export function useOptimisticPositions(chainId: number) {
  const { positionsData } = usePositions(chainId);
  const { positionDecreaseEvents, positionIncreaseEvents, pendingPositionsUpdates } = useSyntheticsEvents();

  const optimisticPositionsData: PositionsData = useMemo(() => {
    if (!positionDecreaseEvents || !positionIncreaseEvents || !pendingPositionsUpdates) {
      return {};
    }

    const positionsKeys = uniq(
      Object.keys(positionsData)
        .concat(Object.keys(pendingPositionsUpdates))
        .concat(positionIncreaseEvents.map((e) => e.positionKey))
    );

    return positionsKeys.reduce((acc, key) => {
      const now = Date.now();

      const increaseEvents = positionIncreaseEvents.filter((e) => e.positionKey === key);
      const lastIncreaseEvent = increaseEvents[increaseEvents.length - 1];

      const decreaseEvents = positionDecreaseEvents.filter((e) => e.positionKey === key);
      const lastDecreaseEvent = decreaseEvents[decreaseEvents.length - 1];

      const pendingUpdate =
        pendingPositionsUpdates[key] && pendingPositionsUpdates[key]!.updatedAt + MAX_PENDING_UPDATE_AGE > now
          ? pendingPositionsUpdates[key]
          : undefined;

      let position: Position;

      if (positionsData[key]) {
        position = { ...positionsData[key] };
      } else if (pendingUpdate && pendingUpdate.isIncrease) {
        position = getPendingPosition(pendingUpdate);
      } else {
        return acc;
      }

      if (
        lastIncreaseEvent &&
        lastIncreaseEvent.increasedAtBlock.gt(position.increasedAtBlock) &&
        lastIncreaseEvent.increasedAtBlock.gt(lastDecreaseEvent?.decreasedAtBlock || 0)
      ) {
        position = applyEventChanges(position, lastIncreaseEvent);
      } else if (
        lastDecreaseEvent &&
        lastDecreaseEvent.decreasedAtBlock.gt(position.decreasedAtBlock) &&
        lastDecreaseEvent.decreasedAtBlock.gt(lastIncreaseEvent?.increasedAtBlock || 0)
      ) {
        position = applyEventChanges(position, lastDecreaseEvent);
      }

      if (
        pendingUpdate &&
        ((pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock.gt(position.increasedAtBlock)) ||
          (!pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock.gt(position.decreasedAtBlock)))
      ) {
        position.pendingUpdate = pendingUpdate;
      }

      if (position.sizeInUsd.gt(0)) {
        acc[key] = position;
      }

      return acc;
    }, {} as PositionsData);
  }, [pendingPositionsUpdates, positionDecreaseEvents, positionIncreaseEvents, positionsData]);

  return {
    optimisticPositionsData,
  };
}

function applyEventChanges(position: Position, event: PositionIncreaseEvent | PositionDecreaseEvent) {
  const nextPosition = { ...position };

  nextPosition.sizeInUsd = event.sizeInUsd;
  nextPosition.sizeInTokens = event.sizeInTokens;
  nextPosition.collateralAmount = event.collateralAmount;
  nextPosition.borrowingFactor = event.borrowingFactor;
  nextPosition.longTokenFundingAmountPerSize = event.longTokenFundingAmountPerSize;
  nextPosition.shortTokenFundingAmountPerSize = event.shortTokenFundingAmountPerSize;
  nextPosition.pendingUpdate = undefined;
  nextPosition.isOpening = false;

  if ((event as PositionIncreaseEvent).increasedAtBlock) {
    nextPosition.increasedAtBlock = (event as PositionIncreaseEvent).increasedAtBlock;
  }

  if ((event as PositionDecreaseEvent).decreasedAtBlock) {
    nextPosition.decreasedAtBlock = (event as PositionDecreaseEvent).decreasedAtBlock;
  }

  return nextPosition;
}

function getPendingPosition(pendingUpdate: PendingPositionUpdate): Position {
  const { account, marketAddress, collateralAddress, isLong } = parsePositionKey(pendingUpdate.positionKey);

  return {
    key: pendingUpdate.positionKey,
    contractKey: hashedPositionKey(account, marketAddress, collateralAddress, isLong),
    account,
    marketAddress,
    collateralTokenAddress: collateralAddress,
    isLong,
    sizeInUsd: pendingUpdate.sizeDeltaUsd || BigNumber.from(0),
    collateralAmount: pendingUpdate.collateralDeltaAmount || BigNumber.from(0),
    sizeInTokens: pendingUpdate.sizeDeltaInTokens || BigNumber.from(0),
    increasedAtBlock: pendingUpdate.updatedAtBlock,
    decreasedAtBlock: BigNumber.from(0),
    borrowingFactor: BigNumber.from(0),
    pendingBorrowingFeesUsd: BigNumber.from(0),
    longTokenFundingAmountPerSize: BigNumber.from(0),
    shortTokenFundingAmountPerSize: BigNumber.from(0),
    data: "0x",
    fundingFeeAmount: BigNumber.from(0),
    claimableLongTokenAmount: BigNumber.from(0),
    claimableShortTokenAmount: BigNumber.from(0),
    latestLongTokenFundingAmountPerSize: BigNumber.from(0),
    latestShortTokenFundingAmountPerSize: BigNumber.from(0),
    hasPendingLongTokenFundingFee: false,
    hasPendingShortTokenFundingFee: false,

    isOpening: true,
    pendingUpdate: pendingUpdate,
  };
}
