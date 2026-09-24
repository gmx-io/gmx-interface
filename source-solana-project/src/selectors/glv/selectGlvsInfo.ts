import { BN_ZERO } from '@/config/constants';
import { selectGlvs } from '@/selectors/glv';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { GlvsInfo } from '@/selectors/glv/types';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { getByKey } from '@/utils/lib/object';
import { selectGlvTokensData } from '../token/selectGlvTokensData';

export const selectGlvsInfo = createAppStoreSelector(
  [selectGlvs, selectTokensData, selectMarketsInfo, selectGlvTokensData],
  (glvs, tokens, marketsInfo, glvTokensData): GlvsInfo => {
    const infos: GlvsInfo = {};

    for (const key in glvs) {
      const glv = glvs[key];
      if (!Array.isArray(glv?.markets)) continue;

      const glvMarkets = glv.markets;
      const glvToken = getByKey(glvTokensData, glv.glvTokenAddress.toBase58());
      const longToken = getByKey(tokens, glv.longTokenAddress.toBase58());
      const shortToken = getByKey(tokens, glv.shortTokenAddress.toBase58());

      if (glvToken && longToken && shortToken) {
        const { poolValueMax, poolValueMin } = glvMarkets.reduce(
          (acc, market) => {
            const marketInfo =
              marketsInfo[market.marketTokenAddress.toBase58()];
            if (!marketInfo) return acc;

            return {
              poolValueMax: acc.poolValueMax.add(marketInfo.poolValueMax),
              poolValueMin: acc.poolValueMin.add(marketInfo.poolValueMin),
            };
          },
          { poolValueMax: BN_ZERO, poolValueMin: BN_ZERO }
        );

        const enhancedGlvToken = {
          ...glvToken,
          contractSymbol: glvToken.symbol,
        };

        infos[key] = {
          ...glv,
          name: `GMX Liquidity Vault`,
          glvToken: enhancedGlvToken,
          longToken,
          shortToken,
          isSpotOnly: false,
          isSingle: longToken.address.equals(shortToken.address),
          isDisabled: false,
          poolValueMax,
          poolValueMin,
          markets: glvMarkets.map((market) => {
            return {
              marketTokenAddress: market.marketTokenAddress,
              isDisabled: market.isDisabled,
              maxMarketTokenBalanceUsd: market.maxMarketTokenBalanceUsd,
              glvMaxMarketTokenBalanceAmount:
                market.glvMaxMarketTokenBalanceAmount,
              gmBalance: market.gmBalance,
            };
          }),
        };
      }
    }

    return infos;
  }
);
