import { getIsSolanaNetworkEnabled } from "config/ab";
import { getGmsolTokenAddresses } from "config/gmsol/tokenLookup";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";

import { buildGmsolTokenPrices, type GmsolTokenPricesData } from "../gmsolOracleUtils";

// Prices come from the Arbitrum oracle keeper, keyed by mint.
export async function fetchGmsolPrices(oracleFetcher: OracleFetcher): Promise<GmsolTokenPricesData | undefined> {
  if (!getIsSolanaNetworkEnabled()) {
    throw new Error("Solana network is disabled");
  }

  const tickers = await oracleFetcher.fetchTickers();
  const prices = buildGmsolTokenPrices(tickers, getGmsolTokenAddresses());

  return Object.keys(prices).length > 0 ? prices : undefined;
}
