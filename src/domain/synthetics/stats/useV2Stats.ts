import { useMemo } from "react";
import useVolumeInfo from "../stats/useVolumeInfo";
import useFeesInfo from "../stats/useFeesInfo";
import useUsers from "../stats/useUsers";
import { useMarketsInfoRequest } from "../markets";

type DashboardOverview = {
  totalGMLiquidity: bigint;
  totalLongPositionSizes: bigint;
  totalShortPositionSizes: bigint;
  openInterest: bigint;
  dailyVolume: bigint;
  totalVolume: bigint;
  weeklyFees: bigint;
  totalFees: bigint;
  totalUsers: bigint;
};

export default function useV2Stats(chainId: number): DashboardOverview {
  const volumeInfo = useVolumeInfo(chainId);
  const feesInfo = useFeesInfo(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  const usersInfo = useUsers(chainId);

  const stats = useMemo(() => {
    const allMarkets = Object.values(marketsInfoData || {}).filter((market) => !market.isDisabled);
    const totalLiquidity = allMarkets.reduce((acc, market) => {
      return acc + BigInt(market.poolValueMax ?? 0);
    }, 0n);

    const totalLongInterestUsd = allMarkets.reduce((acc, market) => {
      return acc + BigInt(market.longInterestUsd ?? 0);
    }, 0n);

    const totalShortInterestUsd = allMarkets.reduce((acc, market) => {
      return acc + BigInt(market.shortInterestUsd ?? 0);
    }, 0n);

    return {
      totalGMLiquidity: totalLiquidity ?? 0n,
      totalLongPositionSizes: totalLongInterestUsd ?? 0n,
      totalShortPositionSizes: totalShortInterestUsd ?? 0n,
      openInterest:
        totalLongInterestUsd !== undefined && totalShortInterestUsd !== undefined
          ? totalLongInterestUsd + totalShortInterestUsd
          : 0n,
      dailyVolume: BigInt(volumeInfo?.dailyVolume ?? 0) || 0n,
      totalVolume: BigInt(volumeInfo?.totalVolume ?? 0) || 0n,
      weeklyFees: BigInt(feesInfo?.weeklyFees ?? 0) || 0n,
      totalFees: BigInt(feesInfo?.totalFees ?? 0) || 0n,
      totalUsers: BigInt(usersInfo?.totalUsers ?? 0) || 0n,
    };
  }, [marketsInfoData, volumeInfo, feesInfo, usersInfo]);

  return stats;
}
