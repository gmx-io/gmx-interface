import { useMarketsInfo } from "./useMarketsInfo";
import { useMemo } from "react";
import { BigNumber } from "ethers";
import useVolumeInfo from "../stats/useVolumeInfo";
import useFeesInfo from "../stats/useFeesInfo";
import useUsers from "../stats/useUsers";

type MarketOverview = {
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

export default function useMarketsOverview(chains: number[]) {
  const [chainOne, chainTwo] = chains || [];
  const volumeInfo = useVolumeInfo(chains);
  const feesInfo = useFeesInfo(chains);
  const { marketsInfoData: chainOneMarketsInfo } = useMarketsInfo(chainOne);
  const { marketsInfoData: chainTwoMarketsInfo } = useMarketsInfo(chainTwo);
  const usersInfo = useUsers(chains);
  const chainsMarketInfo = useMemo(() => {
    return {
      [chainOne]: chainOneMarketsInfo,
      [chainTwo]: chainTwoMarketsInfo,
    };
  }, [chainOne, chainOneMarketsInfo, chainTwo, chainTwoMarketsInfo]);

  const stats = useMemo(() => {
    return chains.reduce((acc: { [key: string]: MarketOverview }, chain, index) => {
      const currentMarketInfo = chainsMarketInfo[chain];
      const currentVolumeInfo = volumeInfo?.[chain];
      const currentFeesInfo = feesInfo?.[chain];
      const currentUsersInfo = usersInfo?.[chain];

      const allMarkets = Object.values(currentMarketInfo || {}).filter((market) => !market.isDisabled);
      const totalLiquidity = allMarkets.reduce((acc, market) => {
        return acc.add(market.poolValueMax);
      }, BigNumber.from(0));

      const totalLongInterestUsd = allMarkets.reduce((acc, market) => {
        return acc.add(market.longInterestUsd);
      }, BigNumber.from(0));

      const totalShortInterestUsd = allMarkets.reduce((acc, market) => {
        return acc.add(market.shortInterestUsd);
      }, BigNumber.from(0));

      acc[chain] = {
        totalGMLiquidity: totalLiquidity || BigNumber.from(0),
        totalLongPositionSizes: totalLongInterestUsd || BigNumber.from(0),
        totalShortPositionSizes: totalShortInterestUsd || BigNumber.from(0),
        openInterest:
          totalLongInterestUsd && totalShortInterestUsd
            ? totalLongInterestUsd.add(totalShortInterestUsd)
            : BigNumber.from(0),
        dailyVolume: currentVolumeInfo?.dailyVolume || BigNumber.from(0),
        totalVolume: currentVolumeInfo?.totalVolume || BigNumber.from(0),
        weeklyFees: currentFeesInfo?.weeklyFees || BigNumber.from(0),
        totalFees: currentFeesInfo?.totalFees || BigNumber.from(0),
        totalUsers: currentUsersInfo?.totalUsers || BigNumber.from(0),
      };
      return acc;
    }, {});
  }, [chains, chainsMarketInfo, volumeInfo, feesInfo, usersInfo]);

  return stats;
}
