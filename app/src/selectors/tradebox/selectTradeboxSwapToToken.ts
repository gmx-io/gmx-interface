import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxSwapToTokenAddress } from './selectTradeboxSwapToTokenAddress';
import { getTokenData } from '@/utils/token/getTokenData';

export const selectTradeboxSwapToToken = createAppStoreSelector(
  [selectTokensData, selectTradeboxSwapToTokenAddress],
  (TokensData, toTokenAddress) => getTokenData(TokensData, toTokenAddress)
);
