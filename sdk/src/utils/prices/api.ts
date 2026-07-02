import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";
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

export async function fetchApiTokenPrices(ctx: { api: IHttp }): Promise<TokenPricesData> {
  const raw = await ctx.api.fetchJson("/v1/prices/tickers");
  return deserializeBigIntsInObject(raw as Record<string, unknown>, { handleInts: true }) as unknown as TokenPricesData;
}
