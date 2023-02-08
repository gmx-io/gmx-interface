import { TokenPrices } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";

export function getMarkPrice(prices: TokenPrices | undefined, isIncrease?: boolean, isLong?: boolean) {
  const shouldUseMaxPrice = isIncrease ? isLong : !isLong;

  return shouldUseMaxPrice ? prices?.maxPrice : prices?.minPrice;
}

export function getTriggerPricePrefix(p: {
  isLong?: boolean;
  isIncrease?: boolean;
  triggerPrice?: BigNumber;
  markPrice?: BigNumber;
}) {
  if (!p.triggerPrice || !p.markPrice) return "";

  if (p.isIncrease) {
    if (p.isLong) {
      return p.triggerPrice.lt(p.markPrice) ? ">" : "<";
    } else {
      return p.triggerPrice.gt(p.markPrice) ? ">" : "<";
    }
  } else {
    if (p.isLong) {
      return p.triggerPrice.gt(p.markPrice) ? ">" : "<";
    } else {
      return p.triggerPrice.lt(p.markPrice) ? ">" : "<";
    }
  }
}

export function applySlippage(allowedSlippage: number, price: BigNumber, isIncrease: boolean, isLong: boolean) {
  let slippageBasisPoints: number;

  if (isIncrease) {
    slippageBasisPoints = isLong ? BASIS_POINTS_DIVISOR + allowedSlippage : BASIS_POINTS_DIVISOR - allowedSlippage;
  } else {
    slippageBasisPoints = isLong ? BASIS_POINTS_DIVISOR - allowedSlippage : BASIS_POINTS_DIVISOR + allowedSlippage;
  }

  return price.mul(slippageBasisPoints).div(BASIS_POINTS_DIVISOR);
}
