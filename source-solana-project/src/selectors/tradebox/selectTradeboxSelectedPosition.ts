import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxSelectedPosition = createAppStoreSelector(
  [
    selectPositionsInfo,
    selectTradeboxMarketTokenAddress,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxTradeFlags,
  ],
  (PositionsInfo, marketTokenAddress, collateralTokenAddress, tradeFlags) => {
    if (!marketTokenAddress || !collateralTokenAddress) {
      return undefined;
    }

    for (const positionInfo of Object.values(PositionsInfo)) {
      if (
        isSameTokenAddress(
          positionInfo.marketTokenAddress,
          marketTokenAddress
        ) &&
        isSameTokenAddress(
          positionInfo.collateralTokenAddress,
          collateralTokenAddress
        ) &&
        positionInfo.isLong === tradeFlags.isLong
      ) {
        return positionInfo;
      }
    }

    return undefined;
  }
);
