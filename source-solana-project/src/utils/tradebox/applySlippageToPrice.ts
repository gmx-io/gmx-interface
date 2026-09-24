import { ONE_BPS, ONE_USD } from '@/config/constants';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';
import { toBN } from 'gmsol';

export function applySlippageToPrice(
  allowedSlippage: number,
  price: BN,
  isIncrease: boolean,
  isLong: boolean
) {
  const shouldIncreasePrice = getShouldUseMaxPrice(isIncrease, isLong);

  const slippageBasisPoints = shouldIncreasePrice
    ? ONE_USD.add(toBN(allowedSlippage).mul(ONE_BPS))
    : ONE_USD.sub(toBN(allowedSlippage).mul(ONE_BPS));

  return applyFactor(price, slippageBasisPoints);
}

function getShouldUseMaxPrice(isIncrease: boolean, isLong: boolean) {
  return isIncrease ? isLong : !isLong;
}
