import useSWR from "swr";

import { ARBITRUM, isSolanaNetwork } from "config/chains";
import { useChainId } from "lib/chains";
import { getOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import type { UiFlags } from "./uiFlags";

export function getSolanaUiFlagsKey() {
  return ["solanaUiFlags", ARBITRUM] as const;
}

// Solana has no oracle keeper of its own: its UI flags (solanaTrading, the Solana banners) live on the Arbitrum keeper.
// One key, so the banners and solanaTrading share a request. The fetcher is created lazily and, while Solana is
// selected, untracked: no endpoint probes start, and requests still fall back between keeper hosts.
export function useSolanaUiFlagsRequest({ enabled }: { enabled: boolean }) {
  const { networkId } = useChainId();
  const track = !isSolanaNetwork(networkId);

  const { data: uiFlags, error, isLoading } = useSWR<UiFlags, Error>(
    enabled ? getSolanaUiFlagsKey() : null,
    () => getOracleKeeperFetcher(ARBITRUM, { track }).fetchUiFlags(),
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  return { uiFlags, error, isLoading };
}
