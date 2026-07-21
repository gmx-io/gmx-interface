import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";
import { TokenData } from "utils/tokens/types";

import {
  GetTradingCapacityParams,
  MarketTickerWithCapacity,
  MarketWithTiers,
  RawMarketConfig,
  RawMarketInfo,
  RawMarketValues,
  TradingCapacity,
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
  return tickers.map((t) => deserializeBigIntsInObject(t, { handleInts: true })) as MarketTickerWithCapacity[];
}

export function parseTradingCapacity(raw: any): TradingCapacity {
  return deserializeBigIntsInObject(raw, { handleInts: true }) as TradingCapacity;
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
    transform: parseTradingCapacity,
  });
}
