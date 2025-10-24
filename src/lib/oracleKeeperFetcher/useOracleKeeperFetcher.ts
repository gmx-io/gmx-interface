import { useMemo } from "react";

import { OracleKeeperMetricMethodId } from "lib/metrics";
import { OracleFetcher, OracleKeeperFetcher } from "lib/oracleKeeperFetcher";

const oracleKeeperFetchersCached: Record<number, OracleFetcher> = {};

export function registerOracleKeeperFailure(chainId: number, method: OracleKeeperMetricMethodId) {
  const fetcher = oracleKeeperFetchersCached[chainId];

  if (!fetcher) {
    return;
  }

  fetcher.handleFailure(method);
}

export function useOracleKeeperFetcher(chainId: number): OracleFetcher {
  return useMemo(() => {
    if (!oracleKeeperFetchersCached[chainId]) {
      oracleKeeperFetchersCached[chainId] = new OracleKeeperFetcher({
        chainId,
      });
    }

    return oracleKeeperFetchersCached[chainId];
  }, [chainId]);
}
