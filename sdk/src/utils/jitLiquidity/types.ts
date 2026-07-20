export type JitLiquidityApiVersion = "v1" | "v2";

export type FetchJitLiquidityInfoParams = {
  apiVersion?: JitLiquidityApiVersion;
};

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
  glvShiftParamsLong: GlvShiftParam[];
  glvShiftParamsShort: GlvShiftParam[];
  glvShiftParams: GlvShiftParam[];
  glv: string;
};

export type JitLiquidityMap = Record<string, JitLiquidityInfo>;

export type JitLiquidityData = {
  jitLiquidityMap: JitLiquidityMap | undefined;
};
