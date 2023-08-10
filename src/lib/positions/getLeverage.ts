import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { formatAmount } from "lib/numbers";

type GetLeverageParams = {
  size: BigNumber;
  collateral: BigNumber;
  fundingFee?: BigNumber;
  hasProfit?: boolean;
  delta?: BigNumber;
  includeDelta?: boolean;
};

export function getLeverage({ size, collateral, fundingFee, hasProfit, delta, includeDelta }: GetLeverageParams) {
  if (!size || !collateral) {
    return;
  }

  let remainingCollateral = collateral;

  if (fundingFee && fundingFee.gt(0)) {
    remainingCollateral = remainingCollateral.sub(fundingFee);
  }

  if (delta && includeDelta) {
    if (hasProfit) {
      remainingCollateral = remainingCollateral.add(delta);
    } else {
      if (delta.gt(remainingCollateral)) {
        return;
      }

      remainingCollateral = remainingCollateral.sub(delta);
    }
  }

  if (remainingCollateral.eq(0)) {
    return;
  }
  return size.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral);
}

export function getLeverageStr(leverage: BigNumber) {
  if (leverage && BigNumber.isBigNumber(leverage)) {
    if (leverage.lt(0)) {
      return "> 100x";
    }
    return `${formatAmount(leverage, 4, 2, true)}x`;
  }
}
