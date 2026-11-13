import { getGmsolTokenAddresses } from "config/gmsol/tokenLookup";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";

import { GmsolOracleFetcher, type GmsolTokenPricesData } from "../gmsolOracleFetcher";

// Prices come from the Arbitrum oracle keeper, keyed by mint.
export async function fetchGmsolPrices(oracleFetcher: OracleFetcher): Promise<GmsolTokenPricesData | undefined> {
  const prices = await new GmsolOracleFetcher(oracleFetcher).fetchPrices(getGmsolTokenAddresses());

  return Object.keys(prices).length > 0 ? prices : undefined;
}
