import { BN_ZERO } from '@/config/constants';
import { TokensData } from '@/selectors/token/types';
import { getGlvMarketMaxBuyableUsd } from '@/utils/glv/getGlvMarketMaxBuyableUsd';
import { GlvInfo } from '@/selectors/glv/types';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { getTokenData } from '@/utils/token/getTokenData';
import values from 'lodash/values';

export function getGlvMintableInfo(
  glv: GlvInfo,
  marketTokensData: TokensData | undefined
) {
  const glvPriceUsd = glv.glvToken.prices.maxPrice;

  const amountUsd = values(glv.markets).reduce((acc, market) => {
    const result = acc.add(
      marketTokensData
        ? getGlvMarketMaxBuyableUsd(
            market,
            getTokenData(marketTokensData, market.marketTokenAddress)
          )
        : BN_ZERO
    );

    return result.gt(BN_ZERO) ? result : BN_ZERO;
  }, BN_ZERO);

  return {
    mintableAmount:
      convertUsdToTokenAmount(amountUsd, glv.glvToken.decimals, glvPriceUsd) ??
      BN_ZERO,
    mintableUsd: amountUsd,
  };
}
