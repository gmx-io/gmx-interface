// @see https://github.com/gmx-io/gmx-synthetics/blob/6ed9be061d8fcc0dc7bc5d34dee3bf091408a1bf/contracts/gas/GasUtils.sol#L218-L234
export function estimateDepositOraclePriceCount(swapsCount: number): bigint {
  return 3n + BigInt(swapsCount);
}

export function estimateWithdrawalOraclePriceCount(swapsCount: number): bigint {
  return 3n + BigInt(swapsCount);
}

export function estimateOrderOraclePriceCount(swapsCount: number): bigint {
  return 3n + BigInt(swapsCount);
}

export function estimateShiftOraclePriceCount(): bigint {
  return 4n;
}

export function estimateGlvDepositOraclePriceCount(marketCount: bigint, swapsCount = 0n) {
  return 2n + marketCount + swapsCount;
}

export function estimateGlvWithdrawalOraclePriceCount(marketCount: bigint, swapsCount = 0n) {
  return 2n + marketCount + swapsCount;
}
