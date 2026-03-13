import { IHttp } from "utils/http/types";

import { Token } from "./types";

export async function fetchApiTokens(ctx: { api: IHttp }): Promise<Token[]> {
  return ctx.api.fetchJson("/tokens");
}
