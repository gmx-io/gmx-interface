import { useMemo } from "react";
import { BigNumber } from "ethers";
import useVolumeInfo from "../stats/useVolumeInfo";
import useFeesInfo from "../stats/useFeesInfo";
import useUsers from "../stats/useUsers";
import { useMarketsInfo } from "../markets";

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

export default function useDashboardOverview(chainId: number): DashboardOverview {
  const volumeInfo = useVolumeInfo(chainId);
  const feesInfo = useFeesInfo(chainId);
  const { marketsInfoData } = useMarketsInfo(chainId);
  const usersInfo = useUsers(chainId);

  const stats = useMemo(() => {
    const allMarkets = Object.values(marketsInfoData || {}).filter((market) => !market.isDisabled);
    const totalLiquidity = allMarkets.reduce((acc, market) => {
      return acc.add(market.poolValueMax);
    }, BigNumber.from(0));

    const totalLongInterestUsd = allMarkets.reduce((acc, market) => {
      return acc.add(market.longInterestUsd);
    }, BigNumber.from(0));

    const totalShortInterestUsd = allMarkets.reduce((acc, market) => {
      return acc.add(market.shortInterestUsd);
    }, BigNumber.from(0));

    return {
      totalGMLiquidity: totalLiquidity || BigNumber.from(0),
      totalLongPositionSizes: totalLongInterestUsd || BigNumber.from(0),
      totalShortPositionSizes: totalShortInterestUsd || BigNumber.from(0),
      openInterest:
        totalLongInterestUsd && totalShortInterestUsd
          ? totalLongInterestUsd.add(totalShortInterestUsd)
          : BigNumber.from(0),
      dailyVolume: volumeInfo?.dailyVolume || BigNumber.from(0),
      totalVolume: volumeInfo?.totalVolume || BigNumber.from(0),
      weeklyFees: feesInfo?.weeklyFees || BigNumber.from(0),
      totalFees: feesInfo?.totalFees || BigNumber.from(0),
      totalUsers: usersInfo?.totalUsers || BigNumber.from(0),
    };
  }, [marketsInfoData, volumeInfo, feesInfo, usersInfo]);

  return stats;
}
