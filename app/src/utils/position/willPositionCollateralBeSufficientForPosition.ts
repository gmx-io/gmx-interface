import { PositionInfo } from '@/selectors/position/types';
import { willPositionCollateralBeSufficient } from '@/utils/position/willPositionCollateralBeSufficient';
import { BN } from '@coral-xyz/anchor';

export function willPositionCollateralBeSufficientForPosition(
  position: PositionInfo,
  collateralDeltaAmount: BN,
  realizedPnlUsd: BN,
  minCollateralFactor: BN,
  sideDeltaUsd: BN
) {
  return willPositionCollateralBeSufficient(
    position.collateralToken.prices.minPrice,
    position.collateralAmount,
    collateralDeltaAmount,
    position.collateralToken.decimals,
    realizedPnlUsd,
    minCollateralFactor,
    position.sizeInUsd.add(sideDeltaUsd)
  );
}
