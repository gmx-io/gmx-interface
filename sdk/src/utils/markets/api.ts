import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject, isUint256, parseUint256DecimalString } from "utils/numbers";
import { getString, isRecord } from "utils/objects";
import { TokenData } from "utils/tokens/types";

import {
  GetTradingCapacityParams,
  MarketTickerWithCapacity,
  MarketWithTiers,
  RawMarketConfig,
  RawMarketInfo,
  RawMarketValues,
  TradingCapacity,
  type JitDataStatus,
  type MarketDataStatus,
  type TradingCapacityLimitingFactor,
} from "./types";

export async function fetchApiMarketsInfo(ctx: { api: IHttp }): Promise<RawMarketInfo[]> {
  const mInfos: any[] = await ctx.api.fetchJson("/v1/markets/info");
  return mInfos.map((mInfo) => deserializeBigIntsInObject(mInfo, { handleInts: true })) as RawMarketInfo[];
}

export async function fetchApiMarketsConfig(ctx: { api: IHttp }): Promise<RawMarketConfig[]> {
  const configs: any[] = await ctx.api.fetchJson("/v1/markets/config");
  return configs.map((config) => deserializeBigIntsInObject(config, { handleInts: true })) as RawMarketConfig[];
}

export async function fetchApiMarketsValues(ctx: { api: IHttp }): Promise<RawMarketValues[]> {
  const values: any[] = await ctx.api.fetchJson("/v1/markets/values");
  return values.map((value) => deserializeBigIntsInObject(value, { handleInts: true })) as RawMarketValues[];
}

export async function fetchApiTokensData(ctx: { api: IHttp }): Promise<TokenData[]> {
  const tInfos: any[] = await ctx.api.fetchJson("/v1/tokens/info");
  return tInfos.map((tInfo) => deserializeBigIntsInObject(tInfo, { handleInts: true })) as TokenData[];
}

export async function fetchApiMarkets(ctx: { api: IHttp }): Promise<MarketWithTiers[]> {
  const markets: any[] = await ctx.api.fetchJson("/v1/markets");
  return markets.map((m) => deserializeBigIntsInObject(m, { handleInts: true })) as MarketWithTiers[];
}

export async function fetchApiMarketsTickers(
  ctx: { api: IHttp },
  params?: { addresses?: string[]; symbols?: string[] }
): Promise<MarketTickerWithCapacity[]> {
  const tickers: any[] = await ctx.api.fetchJson("/v1/markets/tickers", {
    query: {
      addresses: params?.addresses,
      symbols: params?.symbols,
    },
  });
  return tickers.map((rawTicker) => {
    const { capacityLong: rawCapacityLong, capacityShort: rawCapacityShort, ...rawMarketTicker } = rawTicker;
    const marketTicker = deserializeBigIntsInObject(rawMarketTicker, { handleInts: true });
    const capacityLong = parseTradingCapacity(rawCapacityLong);
    const capacityShort = parseTradingCapacity(rawCapacityShort);

    return {
      ...marketTicker,
      ...(capacityLong ? { capacityLong } : {}),
      ...(capacityShort ? { capacityShort } : {}),
    };
  }) as MarketTickerWithCapacity[];
}

function parseTradingCapacityAmount(value: unknown): bigint | undefined {
  if (typeof value === "string") {
    return parseUint256DecimalString(value);
  }

  if (typeof value === "bigint") {
    return isUint256(value) ? value : undefined;
  }

  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }

  return undefined;
}

function parseTradingCapacityLimitingFactor(value: unknown): TradingCapacityLimitingFactor | undefined {
  const factor = getString(value);

  if (factor === "reserve" || factor === "openInterest" || factor === "both" || factor === "notApplicable") {
    return factor;
  }

  return undefined;
}

function parseJitDataStatus(value: unknown): JitDataStatus | undefined {
  const status = getString(value);

  if (status === "available" || status === "stale" || status === "unavailable") {
    return status;
  }

  return undefined;
}

function parseMarketDataStatus(value: unknown): MarketDataStatus | undefined {
  const status = getString(value);

  if (status === "fresh" || status === "stale") {
    return status;
  }

  return undefined;
}

export function parseTradingCapacity(raw: unknown): TradingCapacity | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const availableLiquidity = parseTradingCapacityAmount(raw.availableLiquidity);
  const baseAvailableLiquidity = parseTradingCapacityAmount(raw.baseAvailableLiquidity);
  const jitAvailableLiquidity = parseTradingCapacityAmount(raw.jitAvailableLiquidity);
  const limitingFactor = parseTradingCapacityLimitingFactor(raw.limitingFactor);
  const jitDataStatus = parseJitDataStatus(raw.jitDataStatus);
  const marketDataStatus = parseMarketDataStatus(raw.marketDataStatus);

  if (
    availableLiquidity === undefined ||
    baseAvailableLiquidity === undefined ||
    jitAvailableLiquidity === undefined ||
    limitingFactor === undefined ||
    jitDataStatus === undefined ||
    marketDataStatus === undefined
  ) {
    return undefined;
  }

  return {
    availableLiquidity,
    baseAvailableLiquidity,
    jitAvailableLiquidity,
    limitingFactor,
    jitDataStatus,
    marketDataStatus,
  };
}

export async function fetchApiTradingCapacity(
  ctx: { api: IHttp },
  params: GetTradingCapacityParams
): Promise<TradingCapacity> {
  return ctx.api.fetchJson<TradingCapacity>("/v1/markets/trading-capacity", {
    query: {
      symbol: params.symbol,
      direction: params.direction,
    },
    transform: (raw) => {
      const capacity = parseTradingCapacity(raw);

      if (!capacity) {
        throw new Error("Invalid trading capacity response");
      }

      return capacity;
    },
  });
}
