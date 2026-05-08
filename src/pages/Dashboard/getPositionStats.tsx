import { ACTIVE_CHAIN_IDS } from "./DashboardV2";

type PositionStatsResponse = {
  totalActivePositions: number;
  totalLongPositionSizes: string;
  totalLongPositionCollaterals: string;
  totalShortPositionCollaterals: string;
  totalShortPositionSizes: string;
};

type PositionStatsPerChain = {
  totalActivePositions: number;
  totalLongPositionSizes: bigint;
  totalLongPositionCollaterals: bigint;
  totalShortPositionCollaterals: bigint;
  totalShortPositionSizes: bigint;
  openInterest: bigint;
};

type PositionStatsAggregate = {
  totalLongPositionSizes: bigint;
  totalShortPositionSizes: bigint;
  totalOpenInterest: bigint;
} & Partial<Record<number, PositionStatsPerChain>>;

export function getPositionStats(positionStats?: PositionStatsResponse[]) {
  if (!positionStats || positionStats.length === 0) {
    return null;
  }

  return positionStats.reduce<PositionStatsAggregate>(
    (acc, cv, i) => {
      const longPositionSizes = BigInt(cv.totalLongPositionSizes);
      const shortPositionSizes = BigInt(cv.totalShortPositionSizes);
      const openInterest = longPositionSizes + shortPositionSizes;

      acc.totalLongPositionSizes += longPositionSizes;
      acc.totalShortPositionSizes += shortPositionSizes;
      acc.totalOpenInterest += openInterest;

      acc[ACTIVE_CHAIN_IDS[i]] = {
        totalActivePositions: cv.totalActivePositions,
        totalLongPositionSizes: longPositionSizes,
        totalLongPositionCollaterals: BigInt(cv.totalLongPositionCollaterals),
        totalShortPositionCollaterals: BigInt(cv.totalShortPositionCollaterals),
        totalShortPositionSizes: shortPositionSizes,
        openInterest,
      };
      return acc;
    },
    {
      totalLongPositionSizes: 0n,
      totalShortPositionSizes: 0n,
      totalOpenInterest: 0n,
    }
  );
}
