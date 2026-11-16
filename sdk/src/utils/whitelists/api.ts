import { IHttp } from "utils/http/types";

import { AccountWhitelists } from "./types";

export async function fetchApiWhitelists(ctx: { api: IHttp }, params: { address: string }): Promise<AccountWhitelists> {
  return ctx.api.fetchJson<AccountWhitelists>("/v1/whitelists", {
    query: { address: params.address },
  });
}
