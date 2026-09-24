import { getTokenData } from '@/utils/token/getTokenData';
import { selectTokensData } from '../token/selectTokensData';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';

export const selectTradeboxCollateralToken = createAppStoreSelector(
  [selectTokensData, selectTradeboxCollateralTokenAddress],
  (TokensData, collateralTokenAddress) =>
    getTokenData(TokensData, collateralTokenAddress)
);
