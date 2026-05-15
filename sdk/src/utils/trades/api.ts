import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

import { ApiTradeAction, FetchTradesParams, SearchTradesParams, TradesListResponse } from "./types";

function parseTradesResponse(raw: any): TradesListResponse {
  const trades = Array.isArray(raw?.trades)
    ? raw.trades.map((t: any) => deserializeBigIntsInObject(t, { handleInts: true }) as ApiTradeAction)
    : [];

  return {
    trades,
    nextCursor: raw?.nextCursor ?? null,
    hasMore: Boolean(raw?.hasMore),
  };
}

export async function fetchApiTrades(ctx: { api: IHttp }, params: FetchTradesParams): Promise<TradesListResponse> {
  return ctx.api.fetchJson<TradesListResponse>("/trades", {
    query: {
      address: params.address,
      symbol: params.symbol,
      marketAddress: params.marketAddress,
      since: params.since,
      until: params.until,
      actions: params.actions,
      limit: params.limit,
      cursor: params.cursor,
    },
    transform: parseTradesResponse,
  });
}

export async function searchApiTrades(ctx: { api: IHttp }, params: SearchTradesParams): Promise<TradesListResponse> {
  return ctx.api.postJson<TradesListResponse>("/trades/search", params, {
    transform: parseTradesResponse,
  });
}
