import { getRecord, getString, isRecord } from "utils/objects";

import { GlvShiftParam, JitLiquidityInfo, JitLiquidityMap } from "./types";

export function getJitLiquidityInfo(
  jitLiquidityMap: JitLiquidityMap | undefined,
  marketTokenAddress: string
): JitLiquidityInfo | undefined {
  return jitLiquidityMap?.[marketTokenAddress];
}

export function getJitMaxReservedUsd(
  jitLiquidityMap: JitLiquidityMap | undefined,
  marketTokenAddress: string,
  isLong: boolean
): bigint | undefined {
  const info = getJitLiquidityInfo(jitLiquidityMap, marketTokenAddress);
  return isLong ? info?.maxReservedUsdWithJitLong : info?.maxReservedUsdWithJitShort;
}

export function getJitGlvShiftParams(
  jitLiquidityMap: JitLiquidityMap | undefined,
  marketTokenAddress: string,
  isLong: boolean
): GlvShiftParam[] | undefined {
  const info = getJitLiquidityInfo(jitLiquidityMap, marketTokenAddress);

  if (!info) {
    return undefined;
  }

  return isLong ? info.glvShiftParamsLong : info.glvShiftParamsShort;
}

export function parseJitLiquidityResponse(response: unknown, isV2JitLiquidityInfoEnabled?: boolean): JitLiquidityMap {
  const liquidityInfos = getLiquidityInfos(response);
  const result: JitLiquidityMap = {};

  for (const rawInfo of liquidityInfos) {
    if (!isRecord(rawInfo)) {
      continue;
    }

    const market = getString(rawInfo.market);

    if (!market) {
      continue;
    }

    const hasV2Shape = Boolean(getRecord(rawInfo.long) || getRecord(rawInfo.short));
    const shouldParseV2 = isV2JitLiquidityInfoEnabled ?? hasV2Shape;

    result[market] = shouldParseV2 ? parseV2JitLiquidityInfo(rawInfo) : parseV1JitLiquidityInfo(rawInfo);
  }

  return result;
}

function parseV1JitLiquidityInfo(rawInfo: Record<string, unknown>): JitLiquidityInfo {
  const glvShiftParams = parseGlvShiftParams(rawInfo.glvShiftParams);

  return {
    maxReservedUsdWithJitLong: parseJitAmount(rawInfo.maxReservedUsdWithJitLong),
    maxReservedUsdWithJitShort: parseJitAmount(rawInfo.maxReservedUsdWithJitShort),
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
    maxReservedUsdWithJitLong: parseJitAmount(longInfo?.maxReservedUsd ?? rawInfo.maxReservedUsdWithJitLong),
    maxReservedUsdWithJitShort: parseJitAmount(shortInfo?.maxReservedUsd ?? rawInfo.maxReservedUsdWithJitShort),
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
    marketTokenAmount: parseJitAmount(value.marketTokenAmount),
    minMarketTokens: parseJitAmount(value.minMarketTokens),
  };
}

function parseJitAmount(value: unknown): bigint {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    return 0n;
  }

  try {
    const amount = BigInt(value);
    return amount < 0n ? 0n : amount;
  } catch {
    return 0n;
  }
}
