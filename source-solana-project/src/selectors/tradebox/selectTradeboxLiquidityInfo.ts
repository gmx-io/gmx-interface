import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxMaxLiquidityPath } from './selectTradeboxMaxLiquidityPath';
import { BN_ZERO } from '@/config/constants';
import { selectTradeboxToToken } from './selectTradeboxToToken';
import { selectTradeboxLiquidity } from './selectTradeboxLiquidity';
import { selectTradeboxIncreasePositionAmounts } from './selectTradeboxIncreasePositionAmounts';
import { BN } from '@coral-xyz/anchor';
import { selectTradeboxSwapAmounts } from './selectTradeboxSwapAmounts';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { RISK_THRESHOLD_BPS } from '@/config/factors';
import { BASIS_POINTS_DIVISOR_BN } from '@/config/constants';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';

export const selectTradeboxLiquidityInfo = createAppStoreSelector(
  selectTradeboxTradeFlags,
  selectTradeboxSwapAmounts,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxToToken,
  selectTradeboxLiquidity,
  selectTradeboxMaxLiquidityPath,
  (
    tradeFlags,
    swapAmounts,
    increaseAmounts,
    toToken,
    liquidity,
    maxLiquidityPath
  ) => {
    const { isLong, isLimit, isSwap, isIncrease } = tradeFlags;
    const { longLiquidity, shortLiquidity } = liquidity;
    const { maxLiquidity: swapLiquidityUsd } = maxLiquidityPath;

    let isLiquidityRisk = false;
    let availableLiquidityUsd: BN | undefined;
    let availableLiquidityAmount: BN | undefined;

    if (isLimit) {
      if (isSwap && swapAmounts) {
        availableLiquidityUsd = swapLiquidityUsd;
        isLiquidityRisk =
          swapLiquidityUsd
            ?.mul(new BN(RISK_THRESHOLD_BPS))
            .div(BASIS_POINTS_DIVISOR_BN)
            .lt(swapAmounts.usdOut || BN_ZERO) ?? false;
        availableLiquidityAmount =
          convertUsdToTokenAmount(
            availableLiquidityUsd,
            toToken?.decimals,
            toToken?.prices.maxPrice
          ) ?? BN_ZERO;
      }

      if (isIncrease && increaseAmounts) {
        availableLiquidityUsd = isLong ? longLiquidity : shortLiquidity;

        isLiquidityRisk =
          availableLiquidityUsd
            ?.mul(new BN(RISK_THRESHOLD_BPS))
            .div(BASIS_POINTS_DIVISOR_BN)
            .lt(increaseAmounts.sizeDeltaUsd) ?? false;
      }
    }

    return {
      isLiquidityRisk,
      availableLiquidityUsd,
      availableLiquidityAmount,
    };
  }
);
