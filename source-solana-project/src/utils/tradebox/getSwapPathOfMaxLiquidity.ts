import { BN_ZERO, MAX_SIGNED_USD, ONE_USD } from '@/config/constants';
import { MarketsInfo } from '@/selectors/market/types';
import { getByKey } from '@/utils/lib/object';
import { getMarketAvailableLiquidityUsdForCollateral } from '@/utils/market/getMarketAvailableLiquidityUsdForCollateral';
import { getMarketOppositeCollateral } from '@/utils/market/getMarketOppositeCollateral';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';

export function getSwapPathOfMaxLiquidity(p: {
  marketsInfo: MarketsInfo;
  swapPath: string[];
  initialCollateralAddress: string;
}) {
  const { marketsInfo, swapPath, initialCollateralAddress } = p;

  if (swapPath.length === 0) {
    return BN_ZERO;
  }

  let minMarketLiquidity = MAX_SIGNED_USD;
  let tokenInAddress = initialCollateralAddress;

  for (const marketAddress of swapPath) {
    const marketInfo = getByKey(marketsInfo, marketAddress);

    if (!marketInfo) {
      return BN_ZERO;
    }

    const tokenOut = getMarketOppositeCollateral(marketInfo, tokenInAddress);

    if (!tokenOut) {
      return BN_ZERO;
    }

    const isTokenOutLong =
      getTokenPoolType(marketInfo, tokenOut.address.toBase58()) === 'long';
    const liquidity = getMarketAvailableLiquidityUsdForCollateral(
      marketInfo,
      isTokenOutLong
    );

    if (liquidity.lt(minMarketLiquidity)) {
      minMarketLiquidity = liquidity;
    }

    tokenInAddress = tokenOut.address.toBase58();
  }

  if (minMarketLiquidity.lt(ONE_USD)) {
    return BN_ZERO;
  }

  return minMarketLiquidity;
}
