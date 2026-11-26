import { useMemo } from "react";

import type { ContractsChainId } from "config/chains";
import { getOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { useSWRWithFreshness } from "lib/useSWRWithFreshness";

import type { ClosedMarkets } from "./types";

const CLOSED_MARKETS_MAX_AGE_MS = 60_000;

export function useClosedMarketsRequest(
  chainId: ContractsChainId,
  { enabled }: { enabled: boolean }
): ClosedMarkets | undefined {
  const { data: closedMarketTokens, freshness } = useSWRWithFreshness<string[]>(
    enabled ? ["closedMarkets", chainId] : null,
    async () => {
      const marketsState = await getOracleKeeperFetcher(chainId).fetchMarketsState();

      return marketsState
        .filter((marketState) => marketState.isMarketClosed)
        .map((marketState) => marketState.marketToken)
        .sort();
    },
    { refreshInterval: FREQUENT_UPDATE_INTERVAL, maxAgeMs: CLOSED_MARKETS_MAX_AGE_MS }
  );

  const isExpired = freshness.asOf !== undefined && Date.now() - freshness.asOf > CLOSED_MARKETS_MAX_AGE_MS;
  const closedMarketsKey = closedMarketTokens === undefined || isExpired ? undefined : closedMarketTokens.join(",");

  return useMemo(() => getClosedMarketsFromKey(closedMarketsKey), [closedMarketsKey]);
}

function getClosedMarketsFromKey(closedMarketsKey: string | undefined): ClosedMarkets | undefined {
  if (closedMarketsKey === undefined) {
    return undefined;
  }

  const closedMarkets: ClosedMarkets = {};

  for (const marketToken of closedMarketsKey.split(",")) {
    if (marketToken) {
      closedMarkets[marketToken] = true;
    }
  }

  return closedMarkets;
}
