import { BigNumber } from "ethers";
import { PositionsUpdates } from "./types";

export function getPositionUpdate(
  positionsUpdates: PositionsUpdates,
  positionKey?: string,
  conditions: {
    maxAge?: number;
    maxIncreasedAtBlock?: BigNumber;
    maxDecreasedAtBlock?: BigNumber;
  } = {}
) {
  if (!positionKey) return undefined;

  const update = positionsUpdates[positionKey];

  if (!update) {
    return undefined;
  }

  if (conditions.maxAge && (!update.updatedAt || Date.now() - update.updatedAt > conditions.maxAge)) {
    return undefined;
  }

  if (
    conditions.maxIncreasedAtBlock &&
    update.isIncrease &&
    (!update.updatedAtBlock || update.updatedAtBlock.gt(conditions.maxIncreasedAtBlock))
  ) {
    return undefined;
  }

  if (
    conditions.maxDecreasedAtBlock &&
    !update.isIncrease &&
    (!update.updatedAtBlock || update.updatedAtBlock.gt(conditions.maxDecreasedAtBlock))
  ) {
    return undefined;
  }

  return update;
}
