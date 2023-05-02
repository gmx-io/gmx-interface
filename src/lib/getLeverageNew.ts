import { BASIS_POINTS_DIVISOR } from "./legacy";

export function getLeverageNew({ size, collateral, fundingFee, hasProfit, delta, includeDelta }) {
  if (!size && !collateral && collateral.eq(0)) {
    return;
  }

  let remainingCollateral = collateral;

  if (fundingFee && fundingFee.gt(0) && fundingFee.lt(remainingCollateral)) {
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

  console.log({
    size: size?.toString(),
    collateral: collateral?.toString(),
    fundingFee: fundingFee?.toString(),
    hasProfit,
    delta: delta?.toString(),
    includeDelta,
    remainingCollateral: remainingCollateral?.toString(),
  });

  if (remainingCollateral.eq(0)) {
    return;
  }
  return size.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral);
}
