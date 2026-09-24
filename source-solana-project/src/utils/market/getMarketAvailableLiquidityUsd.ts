import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { applyFactor } from '@/utils/legacy/factor';
import { getMarketMaxOpenInterestUsd } from '@/utils/market/getMarketMaxOpenInterestUsd';
import { getMarketOpenInterestUsd } from '@/utils/market/getMarketOpenInterestUsd';
import { BN } from '@coral-xyz/anchor';

export function getMarketAvailableLiquidityUsd(marketInfo: MarketInfo) {
  const chosenReserveFactor = BN.min(
    marketInfo.reserveFactor,
    marketInfo.openInterestReserveFactor
  );

  const longLiquidity = applyFactor(
    marketInfo.poolValueWithoutPnlForLong ?? BN_ZERO,
    chosenReserveFactor
  ).sub(marketInfo.reserveValueForLong ?? BN_ZERO);

  // console.log('longLiquidity', longLiquidity?.toString(), 'marketInfo.reserveValueForLong', marketInfo.reserveValueForLong?.toString());
  const shortLiquidity = applyFactor(
    marketInfo.poolValueWithoutPnlForShort ?? BN_ZERO,
    chosenReserveFactor
  ).sub(marketInfo.reserveValueForShort ?? BN_ZERO);

  const longOpenInterestAvailable = getMarketMaxOpenInterestUsd(
    marketInfo,
    true
  ).sub(getMarketOpenInterestUsd(marketInfo, true));

  // console.log('longOpenInterestAvailable', longOpenInterestAvailable?.toString());

  const shortOpenInterestAvailable = getMarketMaxOpenInterestUsd(
    marketInfo,
    false
  ).sub(getMarketOpenInterestUsd(marketInfo, false));
  
  // if (marketInfo.indexToken.symbol === 'BTC') {
  //   console.log('marketInfo:', marketInfo.name, 'test long:', BN.max(
  //     BN.min(longLiquidity, longOpenInterestAvailable),
  //     BN_ZERO
  //   ).toString());
  //   console.log('marketInfo:', marketInfo.indexToken.address.toBase58(), 'test short:', BN.max(
  //     BN.min(shortLiquidity, shortOpenInterestAvailable),
  //     BN_ZERO
  //   ).toString());
  // }
  

  return {
    longMarketAvailableLiquidity: BN.max(
      BN.min(longLiquidity, longOpenInterestAvailable),
      BN_ZERO
    ),
    shortMarketAvailableLiquidity: BN.max(
      BN.min(shortLiquidity, shortOpenInterestAvailable),
      BN_ZERO
    ),
  };
}
