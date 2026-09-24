import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';

export function getGmMaxPoolAmount(marketInfo: MarketInfo, isLong: boolean) {
  const maxPoolUsdForDeposit = isLong
    ? marketInfo.maxPoolValueForDepositForLongToken
    : marketInfo.maxPoolValueForDepositForShortToken;
  const maxPoolAmount = isLong
    ? marketInfo.maxPoolAmountForLongToken
    : marketInfo.maxPoolAmountForShortToken;
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;
  const maxPoolAmountForDeposit =
    convertUsdToTokenAmount(
      maxPoolUsdForDeposit,
      token.decimals,
      getMarketMidPrice(token.prices)
    ) ?? BN_ZERO;

  if (maxPoolAmountForDeposit === undefined) return maxPoolAmount;

  return maxPoolAmount.lt(maxPoolAmountForDeposit)
    ? maxPoolAmount
    : maxPoolAmountForDeposit;
}
