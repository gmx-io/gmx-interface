import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { DecreasePositionSwapType } from "types/orders";
import { DecreasePositionAmounts, IncreasePositionAmounts, SwapAmounts } from "types/trade";
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
