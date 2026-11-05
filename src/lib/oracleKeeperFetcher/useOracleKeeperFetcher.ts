import { useEffect, useMemo } from "react";

import { ContractsChainId, isSolanaNetwork } from "config/chains";
import { useChainId } from "lib/chains";
import { OracleFetcher, OracleKeeperFetcher } from "lib/oracleKeeperFetcher";

const oracleKeeperFetchersCached: Partial<Record<number, OracleKeeperFetcher>> = {};

function getOrCreateOracleKeeperFetcher(chainId: ContractsChainId, track: boolean): OracleKeeperFetcher {
  let fetcher = oracleKeeperFetchersCached[chainId];

  if (!fetcher) {
    fetcher = new OracleKeeperFetcher({ chainId, track });
    oracleKeeperFetchersCached[chainId] = fetcher;
  }

  return fetcher;
}

// track: false skips the endpoint probes for a fetcher created while Solana is selected; it still falls back between hosts
export function getOracleKeeperFetcher(chainId: ContractsChainId, { track = true }: { track?: boolean } = {}): OracleFetcher {
  return getOrCreateOracleKeeperFetcher(chainId, track);
}

export function useOracleKeeperFetcher(chainId: ContractsChainId): OracleFetcher {
  const { networkId } = useChainId();
  const track = !isSolanaNetwork(networkId);

  const fetcher = useMemo(() => getOrCreateOracleKeeperFetcher(chainId, track), [chainId, track]);

  useEffect(() => {
    // chainId: this render may have just created that chain's fetcher. Solana pauses every cached one.
    for (const cachedChainId of Object.keys(oracleKeeperFetchersCached)) {
      const cached = oracleKeeperFetchersCached[Number(cachedChainId)];

      if (!cached) {
        continue;
      }

      if (track) {
        cached.ensureTracking();
      } else {
        cached.pauseTracking();
      }
    }
  }, [chainId, track]);

  return fetcher;
}
