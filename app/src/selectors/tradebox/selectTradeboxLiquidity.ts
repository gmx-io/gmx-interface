import { BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectTradeboxIncreasePositionAmounts } from './selectTradeboxIncreasePositionAmounts';
import { selectTradeboxMarketInfo } from './selectTradeboxMarketInfo';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';

export const selectTradeboxLiquidity = createAppStoreSelector(
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxIncreasePositionAmounts,
  (marketInfo, tradeFlags, increaseAmounts) => {
    const { isIncrease, isLong } = tradeFlags;

    if (!marketInfo || !isIncrease) {
      return {
        longLiquidity: BN_ZERO,
        shortLiquidity: BN_ZERO,
        isOutPositionLiquidity: false,
      };
    }

    const longLiquidity = getMarketAvailableLiquidityUsdForPosition(
      marketInfo,
      true
    );
    const shortLiquidity = getMarketAvailableLiquidityUsdForPosition(
      marketInfo,
      false
    );

    const isOutPositionLiquidity = isLong
      ? longLiquidity.lt(increaseAmounts?.sizeDeltaUsd || BN_ZERO)
      : shortLiquidity.lt(increaseAmounts?.sizeDeltaUsd || BN_ZERO);

    return {
      longLiquidity,
      shortLiquidity,
      isOutPositionLiquidity,
    };
  }
);
