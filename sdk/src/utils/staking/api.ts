import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers/utils";

import type { StakingPowerResponse } from "./types";

export async function fetchApiStakingPower(
  ctx: { api: IHttp },
  params: { address: string }
): Promise<StakingPowerResponse> {
  const result: any = await ctx.api.fetchJson("/staking/power", {
    query: { address: params.address },
  });
  return deserializeBigIntsInObject(result, { handleInts: true }) as StakingPowerResponse;
}
