import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";
import { isRecord } from "utils/objects";
import type { TokenPricesData } from "utils/tokens/types";

import { OhlcvCandle, OhlcvParams } from "./types";

export async function fetchApiOhlcv(ctx: { api: IHttp }, params: OhlcvParams): Promise<OhlcvCandle[]> {
  return ctx.api.fetchJson("/v1/prices/ohlcv", {
    query: {
      symbol: params.symbol,
      timeframe: params.timeframe,
      limit: params.limit,
      since: params.since,
    },
  });
}

export function parseApiTokenPrices(raw: unknown): TokenPricesData {
  return deserializeBigIntsInObject(raw as Record<string, unknown>, { handleInts: true }) as TokenPricesData;
}

export async function fetchApiTokenPrices(ctx: { api: IHttp }): Promise<{ prices: TokenPricesData; originTs: number }> {
  const raw = await ctx.api.fetchJson<unknown>("/v1/prices/tickers");
  if (!isRecord(raw) || !isRecord(raw.prices) || typeof raw.originTs !== "number") {
    throw new Error("Invalid /v1/prices/tickers response");
  }
  return { prices: parseApiTokenPrices(raw.prices), originTs: raw.originTs };
}
