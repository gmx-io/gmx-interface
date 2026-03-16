import { IHttp } from "utils/http/types";

import { ApyParams, ApyResponse } from "./types";

export async function fetchApiApy(ctx: { api: IHttp }, params?: ApyParams): Promise<ApyResponse> {
  return ctx.api.fetchJson("/apy", {
    query: {
      period: params?.period,
    },
  });
}
