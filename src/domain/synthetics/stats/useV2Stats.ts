import { useMemo } from "react";
import { BigNumber } from "ethers";
import useVolumeInfo from "../stats/useVolumeInfo";
import useFeesInfo from "../stats/useFeesInfo";
import useUsers from "../stats/useUsers";
import { useMarketsInfoRequest } from "../markets";

type DashboardOverview = {
  totalGMLiquidity: BigNumber;
  totalLongPositionSizes: BigNumber;
  totalShortPositionSizes: BigNumber;
  openInterest: BigNumber;
  dailyVolume: BigNumber;
  totalVolume: BigNumber;
  weeklyFees: BigNumber;
  totalFees: BigNumber;
  totalUsers: BigNumber;
};

export default function useV2Stats(chainId: number): DashboardOverview {
  const volumeInfo = useVolumeInfo(chainId);
  const feesInfo = useFeesInfo(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  const usersInfo = useUsers(chainId);

  const stats = useMemo(() => {
    const allMarkets = Object.values(marketsInfoData || {}).filter((market) => !market.isDisabled);
    const totalLiquidity = allMarkets.reduce((acc, market) => {
      return acc.add(market.poolValueMax);
    }, BigInt(0));

    const totalLongInterestUsd = allMarkets.reduce((acc, market) => {
      return acc.add(market.longInterestUsd);
    }, BigInt(0));

    const totalShortInterestUsd = allMarkets.reduce((acc, market) => {
      return acc.add(market.shortInterestUsd);
    }, BigInt(0));

    return {
      totalGMLiquidity: totalLiquidity || BigInt(0),
      totalLongPositionSizes: totalLongInterestUsd || BigInt(0),
      totalShortPositionSizes: totalShortInterestUsd || BigInt(0),
      openInterest:
        totalLongInterestUsd && totalShortInterestUsd ? totalLongInterestUsd.add(totalShortInterestUsd) : BigInt(0),
      dailyVolume: volumeInfo?.dailyVolume || BigInt(0),
      totalVolume: volumeInfo?.totalVolume || BigInt(0),
      weeklyFees: feesInfo?.weeklyFees || BigInt(0),
      totalFees: feesInfo?.totalFees || BigInt(0),
      totalUsers: usersInfo?.totalUsers || BigInt(0),
    };
  }, [marketsInfoData, volumeInfo, feesInfo, usersInfo]);

  return stats;
}
