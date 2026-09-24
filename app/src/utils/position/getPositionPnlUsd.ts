import { ONE_USD } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { applyFactor } from '@/utils/legacy/factor';
import { getPoolUsdWithoutPnl } from '@/utils/market/getPoolUsdWithoutPnl';
import { getPositionCappedPoolPnl } from '@/utils/position/getPositionCappedPoolPnl';
import { getPositionValueUsd } from '@/utils/position/getPositionValueUsd';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@solana/spl-governance/lib/tools/numbers';

export function getPositionPnlUsd(p: {
  marketInfo: MarketInfo;
  sizeInUsd: BN;
  sizeInTokens: BN;
  markPrice: BN;
  isLong: boolean;
}) {
  const { marketInfo, sizeInUsd, sizeInTokens, markPrice, isLong } = p;

  if (!marketInfo) {
    return BN_ZERO;
  }

  const positionValueUsd = getPositionValueUsd({
    indexToken: marketInfo.indexToken,
    sizeInTokens,
    markPrice,
  });

  const totalPnl = isLong
    ? positionValueUsd.sub(sizeInUsd)
    : sizeInUsd.sub(positionValueUsd);

  if (totalPnl.lte(BN_ZERO)) {
    return totalPnl;
  }

  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, 'minPrice');
  const poolPnl = isLong
    ? applyFactor(poolUsd, marketInfo.maxPnlFactorForLongAdl)
    : applyFactor(poolUsd, marketInfo.maxPnlFactorForShortAdl);
  const cappedPnl = getPositionCappedPoolPnl({
    marketInfo,
    poolUsd,
    isLong,
    maximize: true,
  });

  if (!poolPnl || !cappedPnl) {
    return BN_ZERO;
  }

  if (cappedPnl.gt(poolPnl) && cappedPnl.gt(BN_ZERO) && poolPnl.gt(BN_ZERO)) {
    const adjustedTotalPnl = totalPnl
      .mul(cappedPnl.div(ONE_USD))
      .div(poolPnl.div(ONE_USD));
    return adjustedTotalPnl;
  }

  return totalPnl;
}
