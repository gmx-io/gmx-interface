import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

import { BASIS_POINTS_DIVISOR, PRECISION, adjustForDecimals } from "lib/legacy";

const LEVERAGE_PRECISION = BigNumber.from(BASIS_POINTS_DIVISOR);

export function getNextTokenAmount(p: {
  fromTokenAmount: BigNumber;
  fromTokenPrice: BigNumber;
  fromToken: Token;
  toToken: Token;
  toTokenPrice: BigNumber;
  triggerPrice?: BigNumber;
  isInvertedTriggerPrice?: boolean;
  swapTriggerRatio?: BigNumber;
  isInvertedTriggerRatio?: boolean;
  leverageMultiplier?: BigNumber;
  isInvertedLeverage?: boolean;
  positionFeeFactor?: BigNumber;
}) {
  const fromUsd = convertToUsd(p.fromTokenAmount, p.fromToken.decimals, p.fromTokenPrice);

  let toAmount = convertToTokenAmount(fromUsd, p.toToken.decimals, p.toTokenPrice);

  if (!toAmount || !fromUsd) return undefined;

  if (p.swapTriggerRatio?.gt(0)) {
    const ratio = p.isInvertedTriggerRatio ? PRECISION.mul(PRECISION).div(p.swapTriggerRatio) : p.swapTriggerRatio;

    const adjustedDecimalsRatio = adjustForDecimals(ratio, p.fromToken.decimals, p.toToken.decimals);

    toAmount = p.fromTokenAmount.mul(adjustedDecimalsRatio).div(PRECISION);
  } else if (p.triggerPrice?.gt(0)) {
    if (p.isInvertedTriggerPrice) {
      const toTriggerUsd = convertToUsd(p.fromTokenAmount, p.fromToken.decimals, p.triggerPrice);

      toAmount = convertToTokenAmount(toTriggerUsd, p.toToken.decimals, p.toTokenPrice);
    } else {
      toAmount = convertToTokenAmount(fromUsd, p.toToken.decimals, p.triggerPrice);
    }
  }

  if (p.leverageMultiplier && p.positionFeeFactor) {
    // let newLeverage = p.leverageMultiplier.sub(applyFactor(p.leverageMultiplier, p.positionFeeFactor));
    let newLeverage = p.leverageMultiplier;

    if (p.isInvertedLeverage) {
      newLeverage = LEVERAGE_PRECISION.mul(LEVERAGE_PRECISION).div(newLeverage);
    }

    toAmount = toAmount?.mul(newLeverage).div(LEVERAGE_PRECISION);
  }

  return toAmount;
}
