import { IHttp } from "utils/http/types";
import { assertApiFields, assertApiRecords } from "utils/http/validation";
import type { ApiFieldSpec } from "utils/http/validation";
import { deserializeBigIntsInObject } from "utils/numbers";
import { TokenData } from "utils/tokens/types";

import { MarketTicker, MarketWithTiers, RawMarketConfig, RawMarketInfo, RawMarketValues } from "./types";

const MARKET_CONFIG_V22C_FIELDS = [
  { name: "marketTokenAddress", type: "string" },
  { name: "useOpenInterestInTokensForBalance", type: "boolean" },
  { name: "maxCollateralSumLongTokenLong", type: "bigint" },
  { name: "maxCollateralSumLongTokenShort", type: "bigint" },
  { name: "maxCollateralSumShortTokenLong", type: "bigint" },
  { name: "maxCollateralSumShortTokenShort", type: "bigint" },
  { name: "minFundingIncreaseRatePerSecond", type: "bigint" },
  { name: "minFundingFactorPerSecondLong", type: "bigint" },
  { name: "minFundingFactorPerSecondShort", type: "bigint" },
  { name: "maxFundingFactorPerSecondLong", type: "bigint" },
  { name: "maxFundingFactorPerSecondShort", type: "bigint" },
  { name: "virtualIndexTokenId", type: "string" },
] as const satisfies readonly ApiFieldSpec[];

const MARKET_VALUES_V22C_FIELDS = [
  { name: "marketTokenAddress", type: "string" },
  { name: "virtualInventoryForPositions", type: "bigint" },
  { name: "virtualInventoryForPositionsInTokens", type: "bigint" },
  { name: "updatedAt", type: "numberOrNull" },
] as const satisfies readonly ApiFieldSpec[];

function parseApiRecords<T>(raw: unknown, endpoint: string, fields: readonly ApiFieldSpec[]): T[] {
  assertApiRecords(raw, endpoint);

  return raw.map((record, index) => {
    const parsed = deserializeBigIntsInObject(record, { handleInts: true });
    assertApiFields(parsed, fields, endpoint, index);
    return parsed as T;
  });
}

export async function fetchApiMarketsInfo(ctx: { api: IHttp }): Promise<RawMarketInfo[]> {
  const marketInfos: unknown = await ctx.api.fetchJson("/v1/markets/info");
  return parseApiRecords<RawMarketInfo>(marketInfos, "/v1/markets/info", [
    ...MARKET_CONFIG_V22C_FIELDS,
    ...MARKET_VALUES_V22C_FIELDS.filter((field) => field.name !== "updatedAt"),
  ]);
}

export async function fetchApiMarketsConfig(ctx: { api: IHttp }): Promise<RawMarketConfig[]> {
  const configs: unknown = await ctx.api.fetchJson("/v1/markets/config");
  return parseApiRecords<RawMarketConfig>(configs, "/v1/markets/config", MARKET_CONFIG_V22C_FIELDS);
}

export async function fetchApiMarketsValues(ctx: { api: IHttp }): Promise<RawMarketValues[]> {
  const values: unknown = await ctx.api.fetchJson("/v1/markets/values");
  return parseApiRecords<RawMarketValues>(values, "/v1/markets/values", MARKET_VALUES_V22C_FIELDS);
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
