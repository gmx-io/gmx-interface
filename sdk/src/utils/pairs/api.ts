import { IHttp } from "utils/http/types";

import { Pair } from "./types";

export async function fetchApiPairs(ctx: { api: IHttp }): Promise<Pair[]> {
  return ctx.api.fetchJson("/pairs");
}
