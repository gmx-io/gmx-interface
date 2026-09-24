import { BN_ZERO } from '@/config/constants';
import { MarketsInfo } from '@/selectors/market/types';
import { MarketEdge, SwapEstimator } from '@/selectors/trade/types';
import { getSwapStats } from '@/utils/tradebox/getSwapStats';
import { BN } from '@coral-xyz/anchor';

export function getSwapEstimator(marketsInfo: MarketsInfo): SwapEstimator {
  return (e: MarketEdge, usdIn: BN) => {
    const marketInfo = marketsInfo[e.marketAddress];

    const swapStats = getSwapStats({
      marketInfo,
      usdIn,
      tokenInAddress: e.from,
      tokenOutAddress: e.to,
      shouldApplyPriceImpact: true,
    });

    const isOutLiquidity = swapStats?.isOutLiquidity;
    const usdOut = swapStats?.usdOut;

    if (usdOut === undefined || isOutLiquidity) {
      return { usdOut: BN_ZERO };
    }

    return { usdOut };
  };
}
