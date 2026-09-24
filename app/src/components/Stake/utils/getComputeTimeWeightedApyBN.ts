import { BN } from "@coral-xyz/anchor";

/**
 * @param stakeStartTime
 * @param now
 * @param apyGradient
 */
export function getComputeTimeWeightedApyBN(
  stakeStartTime: number,
  now: number,
  apyGradient: BN[],  // length = APY_BUCKETS
) {
  const APY_BUCKETS = 53;
  const SECONDS_PER_WEEK = new BN(7 * 24 * 3600);   // 604800
  const APY_LAST_INDEX = APY_BUCKETS - 1;

  if (now <= stakeStartTime) {
    return apyGradient[0];
  }

  const totalSeconds = new BN(now - stakeStartTime);
  if (totalSeconds.isZero()) {
    return apyGradient[0];
  }

  const fullWeeks = totalSeconds.div(SECONDS_PER_WEEK);
  const remSeconds = totalSeconds.mod(SECONDS_PER_WEEK);

  let acc = new BN(0);

  // 1) full week accumulation
  const cappedFull = BN.min(fullWeeks, new BN(APY_LAST_INDEX));

  for (let i = 0; i < cappedFull.toNumber(); i++) {
    acc = acc.add(apyGradient[i].mul(SECONDS_PER_WEEK));
  }

  // 2) overflow to last bucket
  if (fullWeeks.gt(new BN(APY_LAST_INDEX))) {
    const extra = fullWeeks.sub(new BN(APY_LAST_INDEX));
    acc = acc.add(
      apyGradient[APY_LAST_INDEX].mul(
        SECONDS_PER_WEEK.mul(extra)
      )
    );
  }

  // 3) part of a week
  if (!remSeconds.isZero()) {
    const idxBN = BN.min(fullWeeks, new BN(APY_LAST_INDEX));
    const idx = idxBN.toNumber();
    acc = acc.add(apyGradient[idx].mul(remSeconds));
  }

  // avg_apy = acc / totalSeconds
  const avg_apr = acc.div(totalSeconds);

  return avg_apr;
}