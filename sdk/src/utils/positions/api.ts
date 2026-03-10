import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

import { ApiPositionInfo } from "./types";

export async function fetchApiPositionsInfo(
  ctx: { api: IHttp },
  params: { address: string; includeRelatedOrders?: boolean }
): Promise<ApiPositionInfo[]> {
  const positions: any[] = await ctx.api.fetchJson("/positions", {
    query: {
      address: params.address,
      includeRelatedOrders: params.includeRelatedOrders || undefined,
    },
  });
  return positions.map((p) => deserializeBigIntsInObject(p, { handleInts: true })) as ApiPositionInfo[];
}
