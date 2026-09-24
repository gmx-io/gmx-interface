import { BN } from '@coral-xyz/anchor';

export function getSpread(p: { minPrice: BN; maxPrice: BN }): BN {
  const diff = p.maxPrice.sub(p.minPrice);
  const BN_TWO = new BN(2);
  const ONE_USD = new BN(10).pow(new BN(20)); // 20 decimals for USD
  return diff.mul(ONE_USD).div(p.maxPrice.add(p.minPrice).div(BN_TWO));
}
