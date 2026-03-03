import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

import { ApiOrderInfo } from "./types";

export async function fetchApiOrders(ctx: { api: IHttp }, params: { account: string }): Promise<ApiOrderInfo[]> {
  const orders: any[] = await ctx.api.fetchJson("/orders", {
    query: {
      account: params.account,
    },
  });
  return orders.map((o) => deserializeBigIntsInObject(o, { handleInts: true })) as ApiOrderInfo[];
}
