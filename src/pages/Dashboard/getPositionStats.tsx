import { ACTIVE_CHAIN_IDS } from "./DashboardV2";

export function getPositionStats(positionStats) {
  if (!positionStats || positionStats.length === 0) {
    return null;
  }
  return positionStats.reduce(
    (acc, cv, i) => {
      cv.openInterest = BigInt(cv.totalLongPositionSizes) + BigInt(cv.totalShortPositionSizes);
      acc.totalLongPositionSizes += BigInt(cv.totalLongPositionSizes);
      acc.totalShortPositionSizes += BigInt(cv.totalShortPositionSizes);
      acc.totalOpenInterest += cv.openInterest;

      acc[ACTIVE_CHAIN_IDS[i]] = cv;
      return acc;
    },
    {
      totalLongPositionSizes: 0n,
      totalShortPositionSizes: 0n,
      totalOpenInterest: 0n,
    }
  );
}
