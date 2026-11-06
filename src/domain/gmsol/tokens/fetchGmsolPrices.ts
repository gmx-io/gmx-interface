import { getGmsolTokenAddresses } from "config/gmsol/tokenLookup";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";
import type { TokenPricesData } from "sdk/utils/tokens/types";

import { GmsolOracleFetcher } from "../gmsolOracleFetcher";

// Prices come from the Arbitrum oracle keeper, keyed by mint.
export async function fetchGmsolPrices(oracleFetcher: OracleFetcher): Promise<TokenPricesData | undefined> {
  const prices = await new GmsolOracleFetcher(oracleFetcher).fetchPrices(getGmsolTokenAddresses());

  return Object.keys(prices).length > 0 ? prices : undefined;
}
