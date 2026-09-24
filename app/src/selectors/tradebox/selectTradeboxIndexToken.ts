import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxIndexTokenAddress } from './selectTradeboxIndexTokenAddress';
import { getTokenData } from '@/utils/token/getTokenData';

export const selectTradeboxIndexToken = createAppStoreSelector(
  [selectTokensData, selectTradeboxIndexTokenAddress],
  (TokensData, indexTokenAddress) => getTokenData(TokensData, indexTokenAddress)
);
