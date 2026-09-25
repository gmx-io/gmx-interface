import type { SortDirection } from "context/SorterContext/types";

import type { SolanaPositionViewModel } from "./types";

export type SolanaPositionSortField =
  | "symbol"
  | "size"
  | "netValue"
  | "collateral"
  | "entryPrice"
  | "markPrice"
  | "liqPrice"
  | "unspecified";

function compareBigint(a: bigint | undefined, b: bigint | undefined): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a === b ? 0 : a < b ? -1 : 1;
}

function fieldValue(position: SolanaPositionViewModel, field: SolanaPositionSortField): bigint | undefined {
  switch (field) {
    case "size":
      return position.sizeInUsd;
    case "netValue":
      return position.netValue;
    case "collateral":
      return position.collateralValue;
    case "entryPrice":
      return position.entryPrice;
    case "markPrice":
      return position.markPrice;
    case "liqPrice":
      return position.liquidationPrice;
    default:
      return undefined;
  }
}

/** Default order (unspecified) is newest first by `increasedAt`. Missing values sort last. */
export function sortSolanaPositions(
  positions: readonly SolanaPositionViewModel[],
  orderBy: SolanaPositionSortField,
  direction: SortDirection
): SolanaPositionViewModel[] {
  const sorted = [...positions];
  if (orderBy === "unspecified" || direction === "unspecified") {
    return sorted.sort((a, b) => compareBigint(b.increasedAt, a.increasedAt));
  }
  const sign = direction === "asc" ? 1 : -1;
  return sorted.sort((a, b) => {
    if (orderBy === "symbol") return sign * a.symbol.localeCompare(b.symbol);
    const result = compareBigint(fieldValue(a, orderBy), fieldValue(b, orderBy));
    // Keep undefined values last regardless of direction.
    if (fieldValue(a, orderBy) === undefined || fieldValue(b, orderBy) === undefined) return result;
    return sign * result;
  });
}
