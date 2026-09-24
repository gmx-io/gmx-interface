import { BN } from '@coral-xyz/anchor';
import { toBN } from 'gmsol';

export function substractMaxLeverageSlippage(number: BN): BN {
  return number.mul(toBN(99)).div(toBN(100));
}
