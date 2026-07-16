import { getAddress, isAddress, isAddressEqual, maxUint256, zeroAddress } from "viem";

import { getRecord, getString, isRecord } from "utils/objects";

import {
  GlvShiftParam,
  JitLiquidityInfo,
  JitLiquidityMap,
  JitLiquiditySnapshot,
  JitLiquidityUnavailableSide,
} from "./types";

const JIT_LIQUIDITY_MAX_ENTRIES = 512;
export const JIT_LIQUIDITY_MAX_FRESH_AGE_MS = 6_000;

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

export function parseJitLiquiditySnapshotResponse(response: unknown): JitLiquiditySnapshot {
  if (!isRecord(response)) {
    throw new Error("Invalid JIT liquidity snapshot response");
  }

  const generatedAt = response.generatedAt;
  const status = response.status;
  const unavailableMarkets = response.unavailableMarkets;
  const unavailableSides = response.unavailableSides;
  if (
    typeof generatedAt !== "number" ||
    !Number.isSafeInteger(generatedAt) ||
    generatedAt < 0 ||
    generatedAt > Date.now() + 60_000 ||
    (status !== "available" && status !== "stale") ||
    !Array.isArray(response.liquidityInfos) ||
    response.liquidityInfos.length > JIT_LIQUIDITY_MAX_ENTRIES ||
    !Array.isArray(unavailableMarkets) ||
    unavailableMarkets.length > JIT_LIQUIDITY_MAX_ENTRIES ||
    !Array.isArray(unavailableSides) ||
    unavailableSides.length > JIT_LIQUIDITY_MAX_ENTRIES * 2
  ) {
    throw new Error("Invalid JIT liquidity snapshot response");
  }

  const parsedUnavailableMarkets = unavailableMarkets.map(parseStrictAddress);
  const parsedUnavailableSides: JitLiquidityUnavailableSide[] = unavailableSides.map((side) => {
    if (!isRecord(side) || typeof side.isLong !== "boolean") {
      throw new Error("Invalid JIT liquidity snapshot response");
    }
    return { market: parseStrictAddress(side.market), isLong: side.isLong };
  });

  return {
    jitLiquidityMap: parseStrictV2JitLiquidityResponse(response.liquidityInfos),
    generatedAt,
    status,
    unavailableMarkets: parsedUnavailableMarkets,
    unavailableSides: parsedUnavailableSides,
  };
}

function parseStrictV2JitLiquidityResponse(liquidityInfos: unknown[]): JitLiquidityMap {
  const result: JitLiquidityMap = {};
  const markets = new Set<string>();

  for (const rawInfo of liquidityInfos) {
    if (!isRecord(rawInfo)) {
      throw new Error("Invalid JIT liquidity snapshot response");
    }

    const glv = parseStrictAddress(rawInfo.glv);
    const market = parseStrictAddress(rawInfo.market);
    const marketKey = getAddress(market);
    if (markets.has(marketKey)) {
      throw new Error("Invalid JIT liquidity snapshot response");
    }
    markets.add(marketKey);

    const longInfo = parseStrictV2JitLiquiditySide(rawInfo.long, glv, market);
    const shortInfo = parseStrictV2JitLiquiditySide(rawInfo.short, glv, market);
    const glvShiftParamsLong = longInfo?.glvShiftParams ? [longInfo.glvShiftParams] : [];
    const glvShiftParamsShort = shortInfo?.glvShiftParams ? [shortInfo.glvShiftParams] : [];

    result[market] = {
      maxReservedUsdWithJitLong: longInfo?.maxReservedUsd ?? 0n,
      maxReservedUsdWithJitShort: shortInfo?.maxReservedUsd ?? 0n,
      maxOrderSizeUsdLong: longInfo?.maxOrderSizeUsd,
      maxOrderSizeUsdShort: shortInfo?.maxOrderSizeUsd,
      glvShiftParamsLong,
      glvShiftParamsShort,
      glvShiftParams: [...glvShiftParamsLong, ...glvShiftParamsShort],
      glv,
    };
  }

  return result;
}

function parseStrictV2JitLiquiditySide(
  value: unknown,
  glv: string,
  market: string
): { maxReservedUsd: bigint; maxOrderSizeUsd: bigint; glvShiftParams: GlvShiftParam } | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new Error("Invalid JIT liquidity snapshot response");
  }

  const maxReservedUsd = parseStrictJitAmount(value.maxReservedUsd);
  const maxOrderSizeUsd = parseStrictJitAmount(value.maxOrderSizeUsd);

  return {
    maxReservedUsd,
    maxOrderSizeUsd,
    glvShiftParams: parseStrictGlvShiftParam(value.glvShiftParams, glv, market),
  };
}

function parseStrictGlvShiftParam(value: unknown, expectedGlv: string, expectedMarket: string): GlvShiftParam {
  if (!isRecord(value)) {
    throw new Error("Invalid JIT liquidity snapshot response");
  }

  const glv = parseStrictAddress(value.glv);
  const fromMarket = parseStrictAddress(value.fromMarket);
  const toMarket = parseStrictAddress(value.toMarket);
  const marketTokenAmount = parseStrictJitAmount(value.marketTokenAmount);
  const minMarketTokens = parseStrictJitAmount(value.minMarketTokens);

  if (
    !isAddressEqual(glv, expectedGlv) ||
    isAddressEqual(fromMarket, expectedMarket) ||
    !isAddressEqual(toMarket, expectedMarket) ||
    marketTokenAmount === 0n
  ) {
    throw new Error("Invalid JIT liquidity snapshot response");
  }

  return { glv, fromMarket, toMarket, marketTokenAmount, minMarketTokens };
}

function parseStrictAddress(value: unknown): string {
  if (typeof value !== "string" || !isAddress(value) || isAddressEqual(value, zeroAddress)) {
    throw new Error("Invalid JIT liquidity snapshot response");
  }

  return value;
}

function parseStrictJitAmount(value: unknown): bigint {
  if (typeof value !== "string" || value.length === 0 || value.length > 78 || !/^\d+$/.test(value)) {
    throw new Error("Invalid JIT liquidity snapshot response");
  }

  const amount = BigInt(value);
  if (amount > maxUint256) {
    throw new Error("Invalid JIT liquidity snapshot response");
  }

  return amount;
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
    maxOrderSizeUsdLong: longInfo?.maxOrderSizeUsd === undefined ? undefined : parseJitAmount(longInfo.maxOrderSizeUsd),
    maxOrderSizeUsdShort:
      shortInfo?.maxOrderSizeUsd === undefined ? undefined : parseJitAmount(shortInfo.maxOrderSizeUsd),
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
