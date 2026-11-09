import useSWR from "swr";

import { ARBITRUM, isSolanaNetwork } from "config/chains";
import { useChainId } from "lib/chains";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import type { UiFlags } from "./uiFlags";

export function getSolanaUiFlagsKey() {
  return ["solanaUiFlags", ARBITRUM] as const;
}

// The Solana counterpart of useUiFlagsRequest; the key is null unless Solana is selected, which needs solanaNetwork on
export function useSolanaUiFlagsRequest() {
  const { networkId } = useChainId();

  const { data: uiFlags } = useSWR<UiFlags>(
    isSolanaNetwork(networkId) ? getSolanaUiFlagsKey() : null,
    async () => {
      const { fetchSolanaUiFlags } = await import("domain/gmsol/fetchSolanaUiFlags");
      return fetchSolanaUiFlags();
    },
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  return { uiFlags };
}
