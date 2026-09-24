import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getMarketCappedPoolPnl(p: {
  marketInfo: MarketInfo;
  poolUsd: BN;
  poolPnl: BN;
  isLong: boolean;
}) {
  const { marketInfo, poolUsd, poolPnl, isLong } = p;

  if (poolPnl.lt(BN_ZERO)) {
    return poolPnl;
  }

  const maxPnlFactor = isLong
    ? marketInfo.maxPnlFactorForLongTrader
    : marketInfo.maxPnlFactorForShortTrader;
  const maxPnl = applyFactor(poolUsd, maxPnlFactor);

  return BN.min(poolPnl, maxPnl);
}
