import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

import { StakingPowerResponse } from "./types";

export async function fetchApiStakingPower(
  ctx: { api: IHttp },
  params: { address: string }
): Promise<StakingPowerResponse> {
  const data = await ctx.api.fetchJson<Record<string, unknown>>("/staking/power", {
    query: { address: params.address },
  });
  return deserializeBigIntsInObject(data, { handleInts: true }) as StakingPowerResponse;
}
