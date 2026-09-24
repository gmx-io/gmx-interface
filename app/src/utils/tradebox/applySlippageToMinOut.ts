import { ONE_BPS, ONE_USD } from '@/config/constants';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';
import { toBN } from 'gmsol';

export function applySlippageToMinOut(
  allowedSlippage: number,
  minOutputAmount: BN
) {
  const slippageFactor = ONE_USD.sub(toBN(allowedSlippage).mul(ONE_BPS));
  return applyFactor(minOutputAmount, slippageFactor);
}
