import { useMemo } from "react";

import { useLocalStorageSerializeKey } from "lib/localStorage";
import { OracleFetcher, OracleKeeperFetcher } from "lib/oracleKeeperFetcher";

const oracleKeeperFetchersCached: Record<number, OracleFetcher> = {};

export function useOracleKeeperFetcher(chainId: number): OracleFetcher {
  const [forceIncentivesActive] = useLocalStorageSerializeKey([chainId, "forceIncentivesActive"], false);

  return useMemo(() => {
    if (!oracleKeeperFetchersCached[chainId]) {
      oracleKeeperFetchersCached[chainId] = new OracleKeeperFetcher({
        chainId,
        forceIncentivesActive: Boolean(forceIncentivesActive),
      });
    }

    return oracleKeeperFetchersCached[chainId];
  }, [chainId, forceIncentivesActive]);
}
