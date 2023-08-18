import { useMarketsInfo } from "./useMarketsInfo";
import { useMemo } from "react";
import { BigNumber } from "ethers";
import use24HVolume from "../stats/use24HVolume";

type MarketOverview = {
  totalGMLiquidity: BigNumber;
  totalLongPositionSizes: BigNumber;
  totalShortPositionSizes: BigNumber;
  openInterest: BigNumber;
};

export default function useMarketsOverview(chains: number[]) {
  const [chainOne, chainTwo] = chains || [];
  use24HVolume(chains);
  const { marketsInfoData: chainOneMarketsInfo } = useMarketsInfo(chainOne);
  const { marketsInfoData: chainTwoMarketsInfo } = useMarketsInfo(chainTwo);
  const stats = useMemo(() => {
    return [chainOneMarketsInfo, chainTwoMarketsInfo].reduce(
      (acc: { [key: string]: MarketOverview }, chainMarketsInfo, index) => {
        const allMarkets = Object.values(chainMarketsInfo || {}).filter((market) => !market.isDisabled);
        const totalLiquidity = allMarkets.reduce((acc, market) => {
          return acc.add(market.poolValueMax);
        }, BigNumber.from(0));

        const totalLongInterestUsd = allMarkets.reduce((acc, market) => {
          return acc.add(market.longInterestUsd);
        }, BigNumber.from(0));

        const totalShortInterestUsd = allMarkets.reduce((acc, market) => {
          return acc.add(market.shortInterestUsd);
        }, BigNumber.from(0));

        acc[chains[index]] = {
          totalGMLiquidity: totalLiquidity,
          totalLongPositionSizes: totalLongInterestUsd,
          totalShortPositionSizes: totalShortInterestUsd,
          openInterest: totalLongInterestUsd.add(totalShortInterestUsd),
        };
        return acc;
      },
      {}
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chains]);

  return stats;
}
