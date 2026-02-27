import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

import { ApiPositionInfo } from "./types";

export async function fetchApiPositionsInfo(
  ctx: { api: IHttp },
  params: { account: string; includeRelatedOrders?: boolean }
): Promise<ApiPositionInfo[]> {
  const positions: any[] = await ctx.api.fetchJson("/positions", {
    query: {
      account: params.account,
      includeRelatedOrders: params.includeRelatedOrders || undefined,
    },
  });
  return positions.map((p) => deserializeBigIntsInObject(p, { handleInts: true })) as ApiPositionInfo[];
}
