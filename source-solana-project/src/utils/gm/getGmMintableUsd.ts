import { TokenData } from '@/selectors/token/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';

export function getGmMintableUsd(marketToken: TokenData) {
  return convertTokenAmountToUsd(
    marketToken.maxMintable,
    marketToken.decimals,
    marketToken.prices.minPrice
  );
}
