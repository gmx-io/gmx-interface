import { IHttp } from "utils/http/types";

import { MarketRates, RatesParams } from "./types";

export async function fetchApiRates(ctx: { api: IHttp }, params?: RatesParams): Promise<MarketRates[]> {
  return ctx.api.fetchJson("/rates", {
    query: {
      period: params?.period,
      averageBy: params?.averageBy,
      address: params?.address,
    },
  });
}
