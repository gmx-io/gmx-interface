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
      return acc + market.poolValueMax;
    }, 0n);

    const totalLongInterestUsd = allMarkets.reduce((acc, market) => {
      return acc + market.longInterestUsd;
    }, 0n);

    const totalShortInterestUsd = allMarkets.reduce((acc, market) => {
      return acc + market.shortInterestUsd;
    }, 0n);

    return {
      totalGMLiquidity: totalLiquidity || 0n,
      totalLongPositionSizes: totalLongInterestUsd || 0n,
      totalShortPositionSizes: totalShortInterestUsd || 0n,
      openInterest: totalLongInterestUsd && totalShortInterestUsd ? totalLongInterestUsd + totalShortInterestUsd : 0n,
      dailyVolume: volumeInfo?.dailyVolume || 0n,
      totalVolume: volumeInfo?.totalVolume || 0n,
      weeklyFees: feesInfo?.weeklyFees || 0n,
      totalFees: feesInfo?.totalFees || 0n,
      totalUsers: usersInfo?.totalUsers || 0n,
    };
  }, [marketsInfoData, volumeInfo, feesInfo, usersInfo]);

  return stats;
}
