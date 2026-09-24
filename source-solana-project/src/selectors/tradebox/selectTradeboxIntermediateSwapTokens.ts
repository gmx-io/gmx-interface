import { getSwapTokensFromSwapStats } from '@/utils/tradebox/getSwapTokensFromSwapStats';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxFindSwapPath } from './selectTradeboxFindSwapPath';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxFromTokenUsd } from './selectTradeboxFromTokenUsd';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTokensData } from '../token/selectTokensData';

export const selectTradeboxIntermediateSwapTokens = createAppStoreSelector(
  [
    selectTradeboxFindSwapPath,
    selectTradeboxFromTokenAddress,
    selectTradeboxFromTokenUsd,
    selectTradeboxToTokenAddress,
    selectTokensData,
  ],
  (findSwapPath, fromTokenAddress, usdIn, toTokenAddress, tokensData) => {
    if (!fromTokenAddress || !toTokenAddress || !usdIn) {
      return { allReady: false, swapTokens: [] };
    }

    const swapPathStats = findSwapPath(usdIn, { byLiquidity: true });
    if (!swapPathStats) {
      return { allReady: false, swapTokens: [] };
    }

    const swapTokens = getSwapTokensFromSwapStats(
      swapPathStats.swapSteps,
      tokensData
    );
    const allReady = swapTokens.every((token) => token);

    return { allReady, swapTokens };
  }
);
