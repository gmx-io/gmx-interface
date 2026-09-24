import { GlvInfo } from '@/selectors/glv/types';
import { MarketsInfo } from '@/selectors/market/types';
import { TokensData } from '@/selectors/token/types';
import { getGmSellableMarketToken } from '@/utils/gm/getGmSellableMarketToken';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { getByKey } from '@/utils/lib/object';
import { BN_ZERO } from '@solana/spl-governance/lib/tools/numbers';
import values from 'lodash/values';

export function getGlvSellableInfo(
  glv: GlvInfo,
  marketsInfo: MarketsInfo | undefined,
  marketTokensData: TokensData | undefined
) {
  const glvPriceUsd = glv.glvToken.prices.minPrice;
  const amountUsd = values(glv.markets).reduce((acc, market) => {
    const marketInfo = getByKey(
      marketsInfo,
      market.marketTokenAddress.toBase58()
    );

    if (!marketInfo) {
      return acc;
    }

    const marketToken = getByKey(
      marketTokensData,
      market.marketTokenAddress.toBase58()
    );

    if (!marketToken) {
      return acc;
    }

    const marketSellableUsd =
      marketInfo && marketInfo.indexToken?.prices
        ? (getGmSellableMarketToken(marketInfo, marketToken)?.totalUsd ??
          BN_ZERO)
        : BN_ZERO;
    const gmBalanceUsd = convertTokenAmountToUsd(
      market.gmBalance,
      marketToken.decimals,
      marketToken.prices.minPrice
    );

    return acc.add(
      marketSellableUsd.lt(gmBalanceUsd) ? marketSellableUsd : gmBalanceUsd
    );
  }, BN_ZERO);

  return {
    totalAmount:
      convertUsdToTokenAmount(
        amountUsd,
        glv.glvToken.decimals,
        glvPriceUsd
      ) ?? BN_ZERO,
    totalUsd: amountUsd,
  };
}
