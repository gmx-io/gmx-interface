import { getGmsolTokenAddresses } from "config/gmsol/tokenLookup";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";
import type { TokenPricesData } from "sdk/utils/tokens/types";

import { getIsGmsolApiFixturesEnabled } from "../api/getGmsolApiUrl";
import { GmsolOracleFetcher } from "../gmsolOracleFetcher";

async function fetchFixturePrices(): Promise<TokenPricesData> {
  const { default: raw } = await import("../api/__fixtures__/prices.json");

  return Object.fromEntries(
    Object.entries(raw as Record<string, { minPrice: string; maxPrice: string }>).map(([address, prices]) => [
      address,
      { minPrice: BigInt(prices.minPrice), maxPrice: BigInt(prices.maxPrice) },
    ])
  );
}

// Dev fixtures stand in for the samples. Otherwise prices come from the Arbitrum oracle keeper, keyed by mint.
export async function fetchGmsolPrices(oracleFetcher: OracleFetcher): Promise<TokenPricesData | undefined> {
  if (getIsGmsolApiFixturesEnabled()) {
    return fetchFixturePrices();
  }

  const prices = await new GmsolOracleFetcher(oracleFetcher).fetchPrices(getGmsolTokenAddresses());

  return Object.keys(prices).length > 0 ? prices : undefined;
}
