import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getMarketMaxOpenInterestUsd } from '@/utils/market/getMarketMaxOpenInterestUsd';
import { getMarketMaxReservedUsd } from '@/utils/market/getMarketMaxReservedUsd';
import { getMarketOpenInterestUsd } from '@/utils/market/getMarketOpenInterestUsd';
import { getMarketReservedUsd } from '@/utils/market/getMarketReservedUsd';
import { BN } from '@coral-xyz/anchor';

export function getMarketAvailableLiquidityUsdForPosition(
  marketInfo: MarketInfo,
  isLong: boolean
) {
  if (!marketInfo || marketInfo.isSpotOnly) {
    return BN_ZERO;
  }

  const maxReservedUsd = getMarketMaxReservedUsd(marketInfo, isLong);
  const reservedUsd = getMarketReservedUsd(marketInfo, isLong);

  const maxOpenInterest = getMarketMaxOpenInterestUsd(marketInfo, isLong);
  const currentOpenInterest = getMarketOpenInterestUsd(marketInfo, isLong);

  const availableLiquidityBasedOnMaxReserved =
    maxReservedUsd && reservedUsd ? maxReservedUsd.sub(reservedUsd) : BN_ZERO;
  const availableLiquidityBasedOnMaxOpenInterest =
    maxOpenInterest && currentOpenInterest
      ? maxOpenInterest.sub(currentOpenInterest)
      : BN_ZERO;

  const result = BN.min(
    availableLiquidityBasedOnMaxReserved,
    availableLiquidityBasedOnMaxOpenInterest
  );

  return BN.max(result, BN_ZERO);
}
