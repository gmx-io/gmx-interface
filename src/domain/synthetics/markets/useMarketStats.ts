import { useChainId } from "lib/chains";
import { useMarketsInfo } from "./useMarketsInfo";
import { useMemo } from "react";
import { BigNumber } from "ethers";

export default function useMarketStats() {
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);
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
      totalGMLiquidity: totalLiquidity,
      totalLongPositions: totalLongInterestUsd,
      totalShortPositions: totalShortInterestUsd,
      openInterest: totalLongInterestUsd.add(totalShortInterestUsd),
    };
  }, [marketsInfoData]);

  return stats;
}
