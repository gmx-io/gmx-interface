import { MarketInfo } from '@/selectors/market/types';
import { getGmMaxPoolAmount } from '@/utils/gm/getGmMaxPoolAmount';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';

export function getGmMaxPoolUsd(marketInfo: MarketInfo, isLong: boolean) {
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;
  const maxPoolAmount = getGmMaxPoolAmount(marketInfo, isLong);

  return convertTokenAmountToUsd(
    maxPoolAmount,
    token.decimals,
    getMarketMidPrice(token.prices)
  );
}
