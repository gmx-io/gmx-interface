import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getPositionCappedPoolPnl(p: {
  marketInfo: MarketInfo;
  poolUsd: BN;
  isLong: boolean;
  maximize: boolean;
}) {
  const { marketInfo, poolUsd, isLong, maximize } = p;

  let poolPnl = BN_ZERO;

  if (isLong) {
    poolPnl = maximize
      ? applyFactor(poolUsd, marketInfo.maxPnlFactorForLongAdl)
      : applyFactor(poolUsd, marketInfo.minPnlFactorAfterShortAdl);
  } else {
    poolPnl = maximize
      ? applyFactor(poolUsd, marketInfo.maxPnlFactorForShortAdl)
      : applyFactor(poolUsd, marketInfo.minPnlFactorAfterShortAdl);
  }

  if (!poolPnl) {
    return BN_ZERO;
  }

  if (poolPnl.lt(BN_ZERO)) {
    return poolPnl;
  }

  const maxPnlFactor: BN = isLong
    ? marketInfo.maxPnlFactorForLongTrader
    : marketInfo.maxPnlFactorForShortTrader;
  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return poolPnl.gt(maxPnl) ? maxPnl : poolPnl;
}
