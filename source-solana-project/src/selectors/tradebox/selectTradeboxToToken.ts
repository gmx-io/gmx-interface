import { createAppStoreSelector } from '@/zustand/useAppStore';
import { getTokenData } from '@/utils/token/getTokenData';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';

export const selectTradeboxToToken = createAppStoreSelector(
  [selectTokensData, selectTradeboxToTokenAddress],
  (TokensData, toTokenAddress) => getTokenData(TokensData, toTokenAddress)
);
