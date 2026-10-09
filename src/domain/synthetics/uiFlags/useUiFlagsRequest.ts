import { useMemo } from "react";
import useSWR from "swr";

import type { ContractsChainId } from "config/chains";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { UiFlags, confirmRelayControlFlags, persistApiFlags, readPersistedUiFlags } from "./uiFlags";

export * from "./uiFlags";

export function useUiFlagsRequest(overrideChainId?: ContractsChainId) {
  const { chainId: selectedChainId } = useChainId();
  const chainId = overrideChainId ?? selectedChainId;
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const fallbackData = useMemo(() => readPersistedUiFlags(chainId), [chainId]);

  const { data: uiFlags } = useSWR<UiFlags>(
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

  return { uiFlags };
}
