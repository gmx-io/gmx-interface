import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getMarketMaxOpenInterestUsd } from '@/utils/market/getMarketMaxOpenInterestUsd';
import { getMarketMaxReservedUsd } from '@/utils/market/getMarketMaxReservedUsd';
import { getMarketOpenInterestUsd } from '@/utils/market/getMarketOpenInterestUsd';
import { getMarketReservedUsd } from '@/utils/market/getMarketReservedUsd';
import { BN } from '@coral-xyz/anchor';

export function getMarketUsedLiquidityUsd(
  marketInfo: MarketInfo,
  isLong: boolean
): [BN, BN] {
  if (marketInfo.isSpotOnly) {
    return [BN_ZERO, BN_ZERO];
  }

  const reservedUsd = getMarketReservedUsd(marketInfo, isLong);
  const maxReservedUsd = getMarketMaxReservedUsd(marketInfo, isLong);

  const openInterestUsd = getMarketOpenInterestUsd(marketInfo, isLong);
  const maxOpenInterestUsd = getMarketMaxOpenInterestUsd(marketInfo, isLong);

  const isReserveSmaller = maxReservedUsd
    .sub(reservedUsd)
    .lt(maxOpenInterestUsd.sub(openInterestUsd));

  return isReserveSmaller
    ? [reservedUsd, maxReservedUsd]
    : [openInterestUsd, maxOpenInterestUsd];
}
