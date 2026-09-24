import { getTokenData } from '@/utils/token/getTokenData';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';

export const selectTradeboxMarketToken = createAppStoreSelector(
  [selectTokensData, selectTradeboxMarketTokenAddress],
  (TokensData, marketTokenAddress) =>
    getTokenData(TokensData, marketTokenAddress)
);
