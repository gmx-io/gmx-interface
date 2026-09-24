import { BN_ONE, BN_ZERO } from '@/config/constants';
import { expandDecimals } from '@/utils/legacy/decimals';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function willPositionCollateralBeSufficient(
  collateralTokenMinPrice: BN,
  collateralAmount: BN,
  collateralDeltaAmount: BN,
  collateralTokenDecimals: number,
  realizedPnlUsd: BN,
  minCollateralFactor: BN,
  sizeInUsd: BN
) {
  let remainingCollateralUsd = collateralAmount
    .sub(collateralDeltaAmount)
    .mul(collateralTokenMinPrice)
    .div(expandDecimals(BN_ONE, collateralTokenDecimals));

  if (realizedPnlUsd.lt(BN_ZERO)) {
    remainingCollateralUsd = remainingCollateralUsd.add(realizedPnlUsd);
  }

  if (remainingCollateralUsd.lt(BN_ZERO)) {
    return false;
  }

  const minCollateralUsdForLeverage = applyFactor(
    sizeInUsd,
    minCollateralFactor
  );

  return remainingCollateralUsd.gte(minCollateralUsdForLeverage);
}
