import { IHttp } from "utils/http/types";

import { OhlcvCandle, OhlcvParams } from "./types";

export async function fetchApiOhlcv(ctx: { api: IHttp }, params: OhlcvParams): Promise<OhlcvCandle[]> {
  return ctx.api.fetchJson("/prices/ohlcv", {
    query: {
      symbol: params.symbol,
      timeframe: params.timeframe,
      limit: params.limit,
      since: params.since,
    },
  });
}
