import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

import { ApiTradeAction, FetchTradesParams, SearchTradesParams, TradesListResponse } from "./types";

function parseTradesResponse(raw: any): TradesListResponse {
  return {
    trades: raw.trades.map((t: any) => deserializeBigIntsInObject(t, { handleInts: true }) as ApiTradeAction),
    nextCursor: raw.nextCursor,
    hasMore: raw.hasMore,
  };
}

export async function fetchApiTrades(ctx: { api: IHttp }, params: FetchTradesParams): Promise<TradesListResponse> {
  return ctx.api.fetchJson<TradesListResponse>("/v1/trades", {
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
  return ctx.api.postJson<TradesListResponse>("/v1/trades/search", params, {
    transform: parseTradesResponse,
  });
}
