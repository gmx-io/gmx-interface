import { BigNumber } from "ethers";
import { PositionsUpdates } from "./types";
import { bigNumberify } from "lib/numbers";

export function getPositionUpdate(
  positionsUpdates: PositionsUpdates,
  positionKey?: string,
  conditions: {
    maxAge?: number;
    minIncreasedAtBlock?: BigNumber;
    minDecreasedAtBlock?: BigNumber;
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

  if (conditions.minIncreasedAtBlock && update.isIncrease) {
    const updatedAtBlock = bigNumberify(update.updatedAtBlock!);

    if (!updatedAtBlock || updatedAtBlock.lte(conditions.minIncreasedAtBlock)) {
      return undefined;
    }
  }

  if (conditions.minDecreasedAtBlock && !update.isIncrease) {
    const updatedAtBlock = bigNumberify(update.updatedAtBlock!);

    if (!updatedAtBlock || updatedAtBlock.lte(conditions.minDecreasedAtBlock)) {
      return undefined;
    }
  }

  return update;
}
