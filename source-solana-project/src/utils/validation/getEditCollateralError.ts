import { BN_ZERO, MAX_SIGNED_USD } from '@/config/constants';
import { PositionInfo } from '@/selectors/position/types';
import { TokenData } from '@/selectors/token/types';
import { formatLeverage } from '@/utils/legacy/format';
import { willPositionCollateralBeSufficientForPosition } from '@/utils/position/willPositionCollateralBeSufficientForPosition';
import { getTradeMaxLeverageAllowedByMinCollateralFactor } from '@/utils/tradebox/getTradeMaxLeverageAllowedByMinCollateralFactor';
import { ValidationResult } from '@/utils/validation/types';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';

export function getEditCollateralError(p: {
  collateralDeltaAmount: BN | undefined;
  collateralDeltaUsd: BN | undefined;
  nextLiqPrice: BN | undefined;
  nextLeverage: BN | undefined;
  position: PositionInfo | undefined;
  isDeposit: boolean;
  depositToken: TokenData | undefined;
  depositAmount: BN | undefined;
  minCollateralFactor: BN | undefined;
}): ValidationResult {
  const {
    collateralDeltaAmount,
    collateralDeltaUsd,
    nextLeverage,
    nextLiqPrice,
    position,
    isDeposit,
    depositToken,
    depositAmount,
    minCollateralFactor,
  } = p;

  if (
    collateralDeltaAmount === undefined ||
    collateralDeltaUsd === undefined ||
    collateralDeltaAmount.isZero() ||
    collateralDeltaUsd.isZero()
  ) {
    return [t`Enter an amount`];
  }

  if (
    isDeposit &&
    depositToken &&
    depositAmount !== undefined &&
    depositAmount.gt(depositToken.balance ?? BN_ZERO)
  ) {
    return [t`Insufficient ${depositToken.symbol} balance`];
  }

  if (nextLiqPrice !== undefined && position?.markPrice !== undefined) {
    if (
      position?.isLong &&
      nextLiqPrice.lt(MAX_SIGNED_USD) &&
      position?.markPrice.lt(nextLiqPrice)
    ) {
      return [t`Invalid liq. price`];
    }

    if (!position.isLong && position.markPrice.gt(nextLiqPrice)) {
      return [t`Invalid liq. price`];
    }
  }

  const maxAllowedLeverage =
    getTradeMaxLeverageAllowedByMinCollateralFactor(minCollateralFactor);

  if (nextLeverage !== undefined && nextLeverage.gt(maxAllowedLeverage)) {
    return [t`Max leverage: ${formatLeverage(maxAllowedLeverage)}`];
  }

  if (position && minCollateralFactor !== undefined && !isDeposit) {
    const isPositionCollateralSufficient =
      willPositionCollateralBeSufficientForPosition(
        position,
        collateralDeltaAmount,
        BN_ZERO,
        minCollateralFactor,
        BN_ZERO
      );

    if (!isPositionCollateralSufficient) {
      return [t`Max. Leverage exceeded`, 'maxLeverage'];
    }
  }

  return [undefined];
}
