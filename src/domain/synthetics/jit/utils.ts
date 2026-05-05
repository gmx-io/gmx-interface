export type GlvShiftParam = {
  glv: string;
  fromMarket: string;
  toMarket: string;
  marketTokenAmount: bigint;
  minMarketTokens: bigint;
};

export type JitLiquidityInfo = {
  maxReservedUsdWithJitLong: bigint;
  maxReservedUsdWithJitShort: bigint;
  glvShiftParams: GlvShiftParam[];
  glv: string;
};

export type JitLiquidityData = {
  jitLiquidityMap: Record<string, JitLiquidityInfo> | undefined;
};

export function getJitLiquidityInfo(
  jitLiquidityMap: Record<string, JitLiquidityInfo> | undefined,
  marketTokenAddress: string
): JitLiquidityInfo | undefined {
  return jitLiquidityMap?.[marketTokenAddress.toLowerCase()];
}

export function getJitMaxReservedUsd(
  jitLiquidityMap: Record<string, JitLiquidityInfo> | undefined,
  marketTokenAddress: string,
  isLong: boolean
): bigint | undefined {
  const info = getJitLiquidityInfo(jitLiquidityMap, marketTokenAddress);
  return isLong ? info?.maxReservedUsdWithJitLong : info?.maxReservedUsdWithJitShort;
}

export function safeParseBigInt(value: string): bigint {
  const parsed = BigInt(value);
  return parsed < 0n ? 0n : parsed;
}
