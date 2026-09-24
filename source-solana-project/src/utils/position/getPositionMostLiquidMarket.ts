import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';
import { isMarketCollateral } from '@/utils/market/isMarketCollateral';
import { isMarketIndexToken } from '@/utils/market/isMarketIndexToken';
import { BN } from '@coral-xyz/anchor';

export function getPositionMostLiquidMarket(
  marketsInfo: MarketInfo[],
  indexTokenAddress: string,
  collateralTokenAddress: string | undefined,
  isLong: boolean
) {
  let bestMarket: MarketInfo | undefined;
  let bestLiquidity: BN | undefined;

  for (const marketInfo of marketsInfo) {
    if (marketInfo.isSpotOnly) {
      continue;
    }

    let isCandidate = isMarketIndexToken(marketInfo, indexTokenAddress);

    if (collateralTokenAddress) {
      isCandidate = isMarketCollateral(marketInfo, collateralTokenAddress);
    }

    if (isCandidate) {
      const liquidity = getMarketAvailableLiquidityUsdForPosition(
        marketInfo,
        isLong
      );

      if (liquidity !== undefined && liquidity.gt(bestLiquidity ?? BN_ZERO)) {
        bestMarket = marketInfo;
        bestLiquidity = liquidity;
      }
    }
  }

  return bestMarket;
}
