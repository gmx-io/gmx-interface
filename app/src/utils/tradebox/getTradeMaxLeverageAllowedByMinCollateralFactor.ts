import { getTradeMaxLeverageByMinCollateralFactor } from '@/utils/tradebox/getTradeMaxLeverageByMinCollateralFactor';
import { BN } from '@coral-xyz/anchor';

export function getTradeMaxLeverageAllowedByMinCollateralFactor(
  minCollateralFactor: BN | undefined
) {
  return getTradeMaxLeverageByMinCollateralFactor(minCollateralFactor);
}
