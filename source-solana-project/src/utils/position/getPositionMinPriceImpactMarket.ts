import { MarketInfo } from '@/selectors/market/types';
import { getPriceImpactForPositionCapped } from '@/utils/fee/getPriceImpactForPositionCapped';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';
import { isMarketIndexToken } from '@/utils/market/isMarketIndexToken';
import { BN } from '@coral-xyz/anchor';

export function getPositionMinPriceImpactMarket(
  marketsInfo: MarketInfo[],
  indexTokenAddress: string,
  isLong: boolean,
  sizeDeltaUsd: BN
) {
  let bestMarket: MarketInfo | undefined;
  // minimize negative impact
  let bestImpactDeltaUsd: BN | undefined;

  for (const marketInfo of marketsInfo) {
    const liquidity = getMarketAvailableLiquidityUsdForPosition(
      marketInfo,
      isLong
    );

    if (
      isMarketIndexToken(marketInfo, indexTokenAddress) &&
      liquidity.gt(sizeDeltaUsd)
    ) {
      const priceImpactDeltaUsd = getPriceImpactForPositionCapped(
        marketInfo,
        sizeDeltaUsd,
        isLong
      );

      if (
        bestImpactDeltaUsd === undefined ||
        priceImpactDeltaUsd.gt(bestImpactDeltaUsd)
      ) {
        bestMarket = marketInfo;
        bestImpactDeltaUsd = priceImpactDeltaUsd;
      }
    }
  }

  return {
    bestMarket,
    bestImpactDeltaUsd,
  };
}
