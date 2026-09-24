import { BN } from '@coral-xyz/anchor';

export function toBN(value: string | number | BN) {
  return new BN(value);
}
