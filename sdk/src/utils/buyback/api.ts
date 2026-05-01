import { IHttp } from "utils/http/types";

import { BuybackWeeklyStatsResponse } from "./types";

export async function fetchApiBuybackWeeklyStats(ctx: { api: IHttp }): Promise<BuybackWeeklyStatsResponse> {
  return ctx.api.fetchJson("/buyback/weekly-stats");
}
