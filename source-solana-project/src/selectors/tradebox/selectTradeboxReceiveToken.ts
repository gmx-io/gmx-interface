import { getTokenData } from '@/utils/token/getTokenData';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxReceiveTokenAddress } from './selectTradeboxReceiveTokenAddress';

export const selectTradeboxReceiveToken = createAppStoreSelector(
  [selectTokensData, selectTradeboxReceiveTokenAddress],
  (TokensData, receiveTokenAddress) =>
    getTokenData(TokensData, receiveTokenAddress)
);
