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

export function getJitGlvShiftParams(
  jitLiquidityMap: Record<string, JitLiquidityInfo> | undefined,
  marketTokenAddress: string,
  isLong: boolean
): GlvShiftParam[] | undefined {
  const info = getJitLiquidityInfo(jitLiquidityMap, marketTokenAddress);

  if (!info) {
    return undefined;
  }

  return isLong ? info.glvShiftParamsLong : info.glvShiftParamsShort;
}

export function safeParseBigInt(value: unknown): bigint {
  if (typeof value !== "string") {
    return 0n;
  }

  const parsed = BigInt(value);
  return parsed < 0n ? 0n : parsed;
}

export function parseJitLiquidityResponse(
  response: unknown,
  isV2JitLiquidityInfoEnabled: boolean
): Record<string, JitLiquidityInfo> {
  const liquidityInfos = getLiquidityInfos(response);
  const result: Record<string, JitLiquidityInfo> = {};

  for (const rawInfo of liquidityInfos) {
    if (!isRecord(rawInfo)) {
      continue;
    }

    const market = getString(rawInfo.market);

    if (!market) {
      continue;
    }

    if (isV2JitLiquidityInfoEnabled) {
      result[market.toLowerCase()] = parseV2JitLiquidityInfo(rawInfo);
      continue;
    }

    result[market.toLowerCase()] = parseV1JitLiquidityInfo(rawInfo);
  }

  return result;
}

function parseV1JitLiquidityInfo(rawInfo: Record<string, unknown>): JitLiquidityInfo {
  const glvShiftParams = parseGlvShiftParams(rawInfo.glvShiftParams);

  return {
    maxReservedUsdWithJitLong: safeParseBigInt(rawInfo.maxReservedUsdWithJitLong),
    maxReservedUsdWithJitShort: safeParseBigInt(rawInfo.maxReservedUsdWithJitShort),
    glvShiftParamsLong: glvShiftParams,
    glvShiftParamsShort: glvShiftParams,
    glvShiftParams,
    glv: getString(rawInfo.glv) ?? "",
  };
}

function parseV2JitLiquidityInfo(rawInfo: Record<string, unknown>): JitLiquidityInfo {
  const longInfo = getRecord(rawInfo.long);
  const shortInfo = getRecord(rawInfo.short);

  if (!longInfo && !shortInfo) {
    return parseV1JitLiquidityInfo(rawInfo);
  }

  const glvShiftParamsLong = parseGlvShiftParams(longInfo?.glvShiftParams ?? rawInfo.glvShiftParams);
  const glvShiftParamsShort = parseGlvShiftParams(shortInfo?.glvShiftParams ?? rawInfo.glvShiftParams);

  return {
    maxReservedUsdWithJitLong: safeParseBigInt(longInfo?.maxReservedUsd ?? rawInfo.maxReservedUsdWithJitLong),
    maxReservedUsdWithJitShort: safeParseBigInt(shortInfo?.maxReservedUsd ?? rawInfo.maxReservedUsdWithJitShort),
    glvShiftParamsLong,
    glvShiftParamsShort,
    glvShiftParams: [...glvShiftParamsLong, ...glvShiftParamsShort],
    glv: getString(rawInfo.glv) ?? "",
  };
}

function getLiquidityInfos(response: unknown): unknown[] {
  if (!isRecord(response)) {
    return [];
  }

  const liquidityInfos = response.liquidityInfos ?? response.v2JitLiquidityInfos ?? response.v2JITLiquidityInfos;

  return Array.isArray(liquidityInfos) ? liquidityInfos : [];
}

function parseGlvShiftParams(value: unknown): GlvShiftParam[] {
  const rawParams = Array.isArray(value) ? value : value ? [value] : [];

  return rawParams.map(parseGlvShiftParam).filter((param): param is GlvShiftParam => param !== undefined);
}

function parseGlvShiftParam(value: unknown): GlvShiftParam | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const glv = getString(value.glv);
  const fromMarket = getString(value.fromMarket);
  const toMarket = getString(value.toMarket);

  if (!glv || !fromMarket || !toMarket) {
    return undefined;
  }

  return {
    glv,
    fromMarket,
    toMarket,
    marketTokenAmount: safeParseBigInt(value.marketTokenAmount),
    minMarketTokens: safeParseBigInt(value.minMarketTokens),
  };
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
