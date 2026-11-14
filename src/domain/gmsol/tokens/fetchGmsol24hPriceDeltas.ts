import { getIsSolanaNetworkEnabled } from "config/ab";
import { getGmsolTokenAddresses } from "config/gmsol/tokenLookup";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";

import { buildGmsolPriceDeltas, type GmsolPriceDeltaMap } from "../gmsolOracleUtils";

// 24h change for every Solana token, keyed by mint, from the Arbitrum keeper via each token's arbitrumTokenAddress.
export async function fetchGmsol24hPriceDeltas(oracleFetcher: OracleFetcher): Promise<GmsolPriceDeltaMap> {
  if (!getIsSolanaNetworkEnabled()) {
    throw new Error("Solana network is disabled");
  }

  const candles = await oracleFetcher.fetch24hPrices();
  return buildGmsolPriceDeltas(candles, getGmsolTokenAddresses());
}
