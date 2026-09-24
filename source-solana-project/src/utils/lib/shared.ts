import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';

export type TooltipState = 'success' | 'error' | 'muted' | undefined;

export function numberToState(value: BN | undefined): TooltipState {
  if (value === undefined) {
    return undefined;
  }

  if (value.gt(BN_ZERO)) {
    return 'success';
  }
  if (value.lt(BN_ZERO)) {
    return 'error';
  }

  return undefined;
}
