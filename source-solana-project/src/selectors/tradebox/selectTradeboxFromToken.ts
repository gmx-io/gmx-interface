import { createAppStoreSelector } from '@/zustand/useAppStore';
import { getTokenData } from '@/utils/token/getTokenData';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';

export const selectTradeboxFromToken = createAppStoreSelector(
  [selectTokensData, selectTradeboxFromTokenAddress],
  (TokensData, fromTokenAddress) => getTokenData(TokensData, fromTokenAddress)
);
