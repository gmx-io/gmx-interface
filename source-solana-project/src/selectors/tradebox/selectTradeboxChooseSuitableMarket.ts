import { getByKey } from '@/utils/lib/object';
import { selectSetTradeboxTradeParams } from './baseSelectors';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeType } from './baseSelectors';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { selectTokensData } from '../token/selectTokensData';
import { PreferredTradeTypePickStrategy } from '@/utils/lib/transaction';
import { chooseSuitableMarket } from '@/utils/market/chooseSuitableMarket';
import { selectIndexTokensStat } from '../stats/selectIndexTokensStat';
import { getUnwrappedTokenAddress } from '@/utils/token/getUnwrappedTokenAddress';
export const selectTradeboxChooseSuitableMarket = createAppStoreSelector(
  [
    selectTradeboxTradeType,
    selectTradeboxTradeFlags,
    selectTokensData,
    selectIndexTokensStat,
    selectSetTradeboxTradeParams,
  ],
  (tradeType, { isSwap }, tokens, indexTokensStats, setTradeParams) => {
    return (
      tokenAddress: string,
      preferredTradeType?: PreferredTradeTypePickStrategy
    ) => {
      const token = getByKey(tokens, tokenAddress);

      if (
        !token ||
        !indexTokensStats[getUnwrappedTokenAddress(token.address.toBase58())]
      )
        return;

      const { maxLongLiquidityPool, maxShortLiquidityPool } =
        indexTokensStats[getUnwrappedTokenAddress(token.address.toBase58())];

      const suitableParams = chooseSuitableMarket({
        indexTokenAddress: tokenAddress,
        maxLongLiquidityPool,
        maxShortLiquidityPool,
        isSwap,
        preferredTradeType: preferredTradeType ?? tradeType,
      });

      if (!suitableParams) return;

      setTradeParams({
        collateralTokenAddress: suitableParams.collateralTokenAddress,
        toTokenAddress: suitableParams.indexTokenAddress,
        marketTokenAddress: suitableParams.marketTokenAddress,
        tradeType: suitableParams.tradeType,
      });

      return suitableParams;
    };
  }
);
