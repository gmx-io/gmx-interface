import { BN } from '@coral-xyz/anchor';

export function getNextOpenInterestParams(p: {
  currentLongUsd: BN;
  currentShortUsd: BN;
  usdDelta: BN;
  isLong: boolean;
}) {
  const { currentLongUsd, currentShortUsd, usdDelta, isLong } = p;

  let nextLongUsd = currentLongUsd;
  let nextShortUsd = currentShortUsd;

  if (isLong) {
    nextLongUsd = currentLongUsd.add(usdDelta);
  } else {
    nextShortUsd = currentShortUsd.add(usdDelta);
  }

  return {
    currentLongUsd,
    currentShortUsd,
    nextLongUsd,
    nextShortUsd,
  };
}
