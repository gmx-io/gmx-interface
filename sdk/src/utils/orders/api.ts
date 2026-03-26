import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

import { ApiOrderInfo } from "./types";

export async function fetchApiOrders(ctx: { api: IHttp }, params: { address: string }): Promise<ApiOrderInfo[]> {
  const orders: any[] = await ctx.api.fetchJson("/orders", {
    query: {
      address: params.address,
    },
  });
  return orders.map((o) => deserializeBigIntsInObject(o, { handleInts: true })) as ApiOrderInfo[];
}
