import type { LeaderboardPosition } from "domain/synthetics/leaderboard";

import type { MarketFilterLongShortItemData } from "components/TableMarketFilter/MarketFilterLongShort";

type FilterableLeaderboardPosition = Pick<LeaderboardPosition, "isLong" | "market">;

export function filterLeaderboardPositions<T extends FilterableLeaderboardPosition>(
  positions: readonly T[],
  filters: MarketFilterLongShortItemData[]
): T[] {
  const selectedMarkets = new Set(
    filters.filter((filter) => filter.marketAddress !== "any").map((filter) => filter.marketAddress)
  );
  const selectedDirections = new Set(
    filters.filter((filter) => filter.marketAddress === "any").map((filter) => filter.direction)
  );

  return positions.filter((position) => {
    if (selectedMarkets.size && !selectedMarkets.has(position.market)) {
      return false;
    }

    const direction = position.isLong ? "long" : "short";
    if (selectedDirections.size && !selectedDirections.has(direction)) {
      return false;
    }

    return true;
  });
}
