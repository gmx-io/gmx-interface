import { BN } from '@coral-xyz/anchor';
import { MARKET_LIST_PER_PAGE } from '@/config/ui';

/**
 * @param cumulativeInvCostFactor
 * @param lastUpdateTs
 * @param mintingCost
 * @param now
 */
const MARKET_DECIMALS = MARKET_LIST_PER_PAGE;

export function getCumulativeInvCostFactorNow(
  cumulativeInvCostFactor?: BN,
  lastUpdateTs?: number,
  mintingCost?: BN,
  now?: number
) {
  const currentFactor = cumulativeInvCostFactor || new BN(0);

  if (
    now === undefined ||
    lastUpdateTs === undefined ||
    !mintingCost ||
    mintingCost.isZero()
  ) {
    return currentFactor;
  }

  if (now <= lastUpdateTs) {
    return currentFactor;
  }

  const durationSec = new BN(now - lastUpdateTs);

  const SCALE = new BN(10).pow(new BN(MARKET_DECIMALS));
  const delta = durationSec.mul(SCALE).div(mintingCost);

  return currentFactor.add(delta);
}
