import useSWR from "swr";

import type { ContractsChainId } from "config/chains";
import { getOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import type { ClosedMarkets } from "./types";

export function useClosedMarketsRequest(
  chainId: ContractsChainId,
  { enabled }: { enabled: boolean }
): ClosedMarkets | undefined {
  const { data } = useSWR<ClosedMarkets>(
    enabled ? ["closedMarkets", chainId] : null,
    async () => {
      const marketsState = await getOracleKeeperFetcher(chainId).fetchMarketsState();
      const closedMarkets: ClosedMarkets = {};

      for (const marketState of marketsState) {
        if (marketState.isMarketClosed) {
          closedMarkets[marketState.marketToken] = true;
        }
      }

      return closedMarkets;
    },
    { refreshInterval: FREQUENT_UPDATE_INTERVAL }
  );

  return data;
}
