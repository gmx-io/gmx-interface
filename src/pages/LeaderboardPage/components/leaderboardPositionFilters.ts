import type { LeaderboardPosition } from "domain/synthetics/leaderboard";

export type LeaderboardPositionSide = "long" | "short";

type FilterableLeaderboardPosition = Pick<LeaderboardPosition, "isLong" | "market">;

export function filterLeaderboardPositions<T extends FilterableLeaderboardPosition>(
  positions: readonly T[],
  marketAddresses: string[],
  side: LeaderboardPositionSide | undefined
): T[] {
  const selectedMarkets = marketAddresses.length ? new Set(marketAddresses) : undefined;

  return positions.filter((position) => {
    if (selectedMarkets && !selectedMarkets.has(position.market)) {
      return false;
    }

    if (side && position.isLong !== (side === "long")) {
      return false;
    }

    return true;
  });
}
