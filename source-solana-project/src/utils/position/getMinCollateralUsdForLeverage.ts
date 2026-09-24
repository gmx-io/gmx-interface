import { ONE_USD } from '@/config/constants';
import { DEFAULT_MAX_LEVERAGE } from '@/config/factors';
import { PositionInfo } from '@/selectors/position/types';
import { applyFactor } from '@/utils/legacy/factor';
import { getPositionMinCollateralFactor } from '@/utils/position/getPositionMinCollateralFactor';
import { BN } from '@coral-xyz/anchor';

export function getMinCollateralUsdForLeverage(position: PositionInfo) {
  const minCollateralFactor = getPositionMinCollateralFactor(position);
  const minCollateralUsdForLeverage = applyFactor(
    position.sizeInUsd,
    minCollateralFactor
  );

  const minCollateralUsdForMaxAllowedLeverage = position.sizeInUsd
    .mul(ONE_USD)
    .div(DEFAULT_MAX_LEVERAGE);

  const minCollateralUsd = BN.max(
    minCollateralUsdForLeverage,
    minCollateralUsdForMaxAllowedLeverage
  );
  return minCollateralUsd;
}
