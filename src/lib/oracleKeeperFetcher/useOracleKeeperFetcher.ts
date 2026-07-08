import { useMemo } from "react";

import { ContractsChainId } from "config/chains";
import { OracleFetcher, OracleKeeperFetcher } from "lib/oracleKeeperFetcher";

const oracleKeeperFetchersCached: Record<number, OracleFetcher> = {};

export function getOracleKeeperFetcher(chainId: ContractsChainId): OracleFetcher {
  if (!oracleKeeperFetchersCached[chainId]) {
    oracleKeeperFetchersCached[chainId] = new OracleKeeperFetcher({
      chainId,
    });
  }

  return oracleKeeperFetchersCached[chainId];
}

export function useOracleKeeperFetcher(chainId: ContractsChainId): OracleFetcher {
  return useMemo(() => getOracleKeeperFetcher(chainId), [chainId]);
}
