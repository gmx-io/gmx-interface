import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";
import { TokenData } from "utils/tokens/types";

import { MarketTicker, MarketWithTiers, RawMarketConfig, RawMarketInfo, RawMarketValues } from "./types";

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
): Promise<MarketTicker[]> {
  const tickers: any[] = await ctx.api.fetchJson("/v1/markets/tickers", {
    query: {
      addresses: params?.addresses,
      symbols: params?.symbols,
    },
  });
  return tickers.map((t) => deserializeBigIntsInObject(t, { handleInts: true })) as MarketTicker[];
}
