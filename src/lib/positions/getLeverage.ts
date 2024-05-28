import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { bigMath } from "lib/bigmath";
import { formatAmount } from "lib/numbers";

type GetLeverageParams = {
  size: bigint;
  collateral: bigint;
  fundingFee?: bigint;
  hasProfit?: boolean;
  delta?: bigint;
  includeDelta?: boolean;
};

export function getLeverage({ size, collateral, fundingFee, hasProfit, delta, includeDelta }: GetLeverageParams) {
  if (size == undefined || collateral === undefined) {
    return;
  }

  let remainingCollateral = collateral;

  if (fundingFee !== undefined && fundingFee > 0) {
    remainingCollateral = remainingCollateral - fundingFee;
  }

  if (delta !== undefined && includeDelta) {
    if (hasProfit) {
      remainingCollateral = remainingCollateral + delta;
    } else {
      if (delta > remainingCollateral) {
        return;
      }

      remainingCollateral = remainingCollateral - delta;
    }
  }

  if (remainingCollateral == 0n) {
    return;
  }
  return bigMath.mulDiv(size, BASIS_POINTS_DIVISOR_BIGINT, remainingCollateral);
}

export function getLeverageStr(leverage: bigint | undefined) {
  if (leverage !== undefined) {
    if (leverage < 0) {
      return "> 100x";
    }
    return `${formatAmount(leverage, 4, 2, true)}x`;
  }

  return "";
}
