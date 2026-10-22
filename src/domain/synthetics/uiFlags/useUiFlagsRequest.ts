import { useMemo, useRef } from "react";
import useSWR from "swr";

import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { UiFlags, confirmRelayControlFlags, persistApiFlags, readPersistedUiFlags } from "./uiFlags";

export * from "./uiFlags";

export function useUiFlagsRequest() {
  const { chainId } = useChainId();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const fallbackData = useMemo(() => readPersistedUiFlags(chainId), [chainId]);

  const { data: uiFlags, isValidating } = useSWR<UiFlags>(
    ["uiFlags", chainId],
    async () => {
      const result = await confirmRelayControlFlags(chainId, await oracleKeeperFetcher.fetchUiFlags());
      persistApiFlags(chainId, result);
      return result;
    },
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
      fallbackData,
    }
  );

  // fail-closed flags (permits) are never persisted, so they are unknown until the first request for the chain
  // settles; a failed request settles too and leaves them off
  const settledChainIdRef = useRef<number>();
  if (!isValidating) {
    settledChainIdRef.current = chainId;
  }
  const isUiFlagsSettled = settledChainIdRef.current === chainId;

  return { uiFlags, isUiFlagsSettled };
}
