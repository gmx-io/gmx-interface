import { IHttp } from "utils/http/types";
import { assertApiFields, assertApiRecords } from "utils/http/validation";
import { deserializeBigIntsInObject } from "utils/numbers";

import { ApiPositionInfo } from "./types";

export async function fetchApiPositionsInfo(
  ctx: { api: IHttp },
  params: { address: string; includeRelatedOrders?: boolean }
): Promise<ApiPositionInfo[]> {
  const positions: unknown = await ctx.api.fetchJson("/v1/positions", {
    query: {
      address: params.address,
      includeRelatedOrders: params.includeRelatedOrders || undefined,
    },
  });
  assertApiRecords(positions, "/v1/positions");

  return positions.map((position, index) => {
    const parsed = deserializeBigIntsInObject(position, { handleInts: true });
    assertApiFields(parsed, [{ name: "positionValueInUsd", type: "bigint" }], "/v1/positions", index);
    return parsed as ApiPositionInfo;
  });
}
