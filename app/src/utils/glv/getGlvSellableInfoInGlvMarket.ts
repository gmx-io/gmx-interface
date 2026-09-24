import { TokenData } from '@/selectors/token/types';
import { GlvInfo } from '@/selectors/glv/types';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { BN_ZERO } from '@solana/spl-governance/lib/tools/numbers';

export function getGlvSellableInfoInMarket(
  glvInfo: GlvInfo,
  marketToken: TokenData
) {
  const market = glvInfo.markets.find((market) =>
    market.marketTokenAddress.equals(marketToken.address)
  );

  if (!market) {
    return {
      sellableUsd: BN_ZERO,
      sellableAmount: BN_ZERO,
    };
  }

  const sellableUsd =
    convertTokenAmountToUsd(
      market.gmBalance,
      marketToken.decimals,
      marketToken.prices.minPrice
    ) ?? BN_ZERO;
  const sellableAmount =
    convertUsdToTokenAmount(
      sellableUsd,
      glvInfo.glvToken.decimals,
      glvInfo.glvToken.prices.minPrice
    ) ?? BN_ZERO;

  return {
    sellableAmount,
    sellableUsd,
  };
}
