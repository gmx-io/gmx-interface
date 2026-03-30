import type { SortDirection } from "context/SorterContext/types";
import { PositionInfo } from "domain/synthetics/positions";

export type PositionSortField = "symbol" | "size" | "netValue" | "collateral" | "entryPrice" | "markPrice" | "liqPrice";

export function sortPositionsByField(
  positions: PositionInfo[],
  orderBy: PositionSortField | "unspecified",
  direction: SortDirection
): PositionInfo[] {
  if (orderBy === "unspecified" || direction === "unspecified") {
    return positions;
  }

  const sorted = [...positions];
  const directionMultiplier = direction === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    switch (orderBy) {
      case "symbol": {
        const nameA = a.indexName ?? "";
        const nameB = b.indexName ?? "";
        return nameA.localeCompare(nameB) * directionMultiplier;
      }
      case "size": {
        return compareBigInt(a.sizeInUsd, b.sizeInUsd, directionMultiplier);
      }
      case "netValue": {
        return compareBigInt(a.netValue, b.netValue, directionMultiplier);
      }
      case "collateral": {
        return compareBigInt(a.remainingCollateralUsd, b.remainingCollateralUsd, directionMultiplier);
      }
      case "entryPrice": {
        return compareBigIntOptional(a.entryPrice, b.entryPrice, directionMultiplier);
      }
      case "markPrice": {
        return compareBigInt(a.markPrice, b.markPrice, directionMultiplier);
      }
      case "liqPrice": {
        return compareBigIntOptional(a.liquidationPrice, b.liquidationPrice, directionMultiplier);
      }
      default:
        return 0;
    }
  });

  return sorted;
}

function compareBigInt(a: bigint, b: bigint, directionMultiplier: number): number {
  if (a === b) return 0;
  return a > b ? directionMultiplier : -directionMultiplier;
}

function compareBigIntOptional(a: bigint | undefined, b: bigint | undefined, directionMultiplier: number): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return compareBigInt(a, b, directionMultiplier);
}
