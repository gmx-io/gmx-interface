import { getSolanaResponseHandler } from "utils/http/solana";
import type { IHttp, SolanaReadOptions } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

import { ApiOrderInfo } from "./types";

export async function fetchApiOrders(
  ctx: { api: IHttp },
  params: { address: string } & SolanaReadOptions
): Promise<ApiOrderInfo[]> {
  const orders: any[] = await ctx.api.fetchJson("/v1/orders", {
    query: {
      address: params.address,
      minContextSlot: params.minContextSlot,
    },
    onResponse: getSolanaResponseHandler(params.onResponse),
  });
  return orders.map((o) => deserializeBigIntsInObject(o, { handleInts: true })) as ApiOrderInfo[];
}
