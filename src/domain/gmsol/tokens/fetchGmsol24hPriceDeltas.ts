import { getGmsolTokenAddresses } from "config/gmsol/tokenLookup";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";

import { GmsolOracleFetcher, type GmsolPriceDeltaMap } from "../gmsolOracleFetcher";

// 24h change for every Solana token, keyed by mint, from the Arbitrum keeper via each token's arbitrumTokenAddress.
export function fetchGmsol24hPriceDeltas(oracleFetcher: OracleFetcher): Promise<GmsolPriceDeltaMap> {
  return new GmsolOracleFetcher(oracleFetcher).fetch24hPriceDeltas(getGmsolTokenAddresses());
}
