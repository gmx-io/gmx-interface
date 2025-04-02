import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { DecreasePositionSwapType } from "types/orders";
import {
  DecreasePositionAmounts,
  IncreasePositionAmounts,
  SwapAmounts,
  TradeFlags,
  TradeMode,
  TradeType,
} from "types/trade";

import { bigMath } from "../bigmath";
import { getShouldUseMaxPrice } from "../prices";

export function applySlippageToPrice(allowedSlippage: number, price: bigint, isIncrease: boolean, isLong: boolean) {
  const shouldIncreasePrice = getShouldUseMaxPrice(isIncrease, isLong);

  const slippageBasisPoints = shouldIncreasePrice
    ? BASIS_POINTS_DIVISOR + allowedSlippage
    : BASIS_POINTS_DIVISOR - allowedSlippage;

  return bigMath.mulDiv(price, BigInt(slippageBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
}

export function applySlippageToMinOut(allowedSlippage: number, minOutputAmount: bigint) {
  const slippageBasisPoints = BASIS_POINTS_DIVISOR - allowedSlippage;

  return bigMath.mulDiv(minOutputAmount, BigInt(slippageBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
}

export function getSwapCount({
  isSwap,
  isIncrease,
  increaseAmounts,
  decreaseAmounts,
  swapAmounts,
}: {
  isSwap: boolean;
  isIncrease: boolean;
  swapAmounts?: SwapAmounts;
  increaseAmounts?: IncreasePositionAmounts;
  decreaseAmounts?: DecreasePositionAmounts;
}) {
  if (isSwap) {
    if (!swapAmounts) return undefined;
    return swapAmounts.swapPathStats?.swapPath.length ?? 0;
  } else if (isIncrease) {
    if (!increaseAmounts) return undefined;
    return increaseAmounts.swapPathStats?.swapPath.length ?? 0;
  } else {
    if (decreaseAmounts?.decreaseSwapType === undefined) return undefined;
    return decreaseAmounts.decreaseSwapType !== DecreasePositionSwapType.NoSwap ? 1 : 0;
  }
}

export const createTradeFlags = (tradeType: TradeType, tradeMode: TradeMode): TradeFlags => {
  const isLong = tradeType === TradeType.Long;
  const isShort = tradeType === TradeType.Short;
  const isSwap = tradeType === TradeType.Swap;
  const isPosition = isLong || isShort;
  const isMarket = tradeMode === TradeMode.Market;
  const isLimit = tradeMode === TradeMode.Limit || tradeMode === TradeMode.StopMarket;
  const isTrigger = tradeMode === TradeMode.Trigger;
  const isTWAP = tradeMode === TradeMode.TWAP;
  const isIncrease = isPosition && (isMarket || isLimit || isTWAP);

  const tradeFlags: TradeFlags = {
    isLong,
    isShort,
    isSwap,
    isPosition,
    isIncrease,
    isMarket,
    isLimit,
    isTrigger,
    isTWAP,
  };

  return tradeFlags;
};
