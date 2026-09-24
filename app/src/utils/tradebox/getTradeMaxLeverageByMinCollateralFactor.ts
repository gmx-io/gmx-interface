import { BN_100, ONE_USD } from '@/config/constants';
import { divToFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getTradeMaxLeverageByMinCollateralFactor(
  minCollateralFactor: BN | undefined
) {
  if (!minCollateralFactor || minCollateralFactor.isZero()) {
    return BN_100.mul(ONE_USD);
  }
  return divToFactor(ONE_USD, minCollateralFactor);
}
