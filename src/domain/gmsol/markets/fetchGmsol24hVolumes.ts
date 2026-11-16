import { USD_DECIMALS } from "config/factors";
import type { GmxApiSdk } from "sdk/clients/v2";
import { numberToBigint } from "sdk/utils/numbers";
import type { Pair } from "sdk/utils/pairs/types";

// The Solana host's /v1/pairs carries each market's 24h volume in USD (target_volume), keyed by
// market account (pool_id). Returned in USD ×10^30 like the EVM indexer's volumes.
export function parseGmsol24hVolumes(pairs: Pair[]): Record<string, bigint> {
  const volumes: Record<string, bigint> = {};

  for (const pair of pairs) {
    if (pair.pool_id && Number.isFinite(pair.target_volume)) {
      volumes[pair.pool_id] = numberToBigint(pair.target_volume, USD_DECIMALS);
    }
  }

  return volumes;
}

export async function fetchGmsol24hVolumes(sdk: GmxApiSdk): Promise<Record<string, bigint>> {
  return parseGmsol24hVolumes(await sdk.fetchPairs());
}
