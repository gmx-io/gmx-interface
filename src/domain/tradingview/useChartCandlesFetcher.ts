import { useEffect, useState } from "react";

import { isSolanaNetwork } from "config/chains";
import { useChainId } from "lib/chains";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";

import type { CandlesFetcher } from "./DataFeed";

// undefined while the Solana adapter loads; it is imported lazily so the Solana folders stay out of the startup chunks.
export function useChartCandlesFetcher(oracleKeeperFetcher: OracleFetcher): CandlesFetcher | undefined {
  const { networkId } = useChainId();
  const isSolana = isSolanaNetwork(networkId);
  const [gmsolCandlesFetcher, setGmsolCandlesFetcher] = useState<CandlesFetcher>();

  useEffect(() => {
    if (!isSolana) {
      setGmsolCandlesFetcher(undefined);
      return;
    }

    let cancelled = false;

    import("domain/gmsol/createGmsolCandlesFetcher").then(({ createGmsolCandlesFetcher }) => {
      if (!cancelled) {
        setGmsolCandlesFetcher(createGmsolCandlesFetcher(oracleKeeperFetcher));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isSolana, oracleKeeperFetcher]);

  return isSolana ? gmsolCandlesFetcher : oracleKeeperFetcher;
}
