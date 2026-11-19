import useSWR from "swr";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { isSolanaNetwork, type NetworkId } from "config/chains";
import { GMSOL_TOKENS } from "config/gmsol/tokens";
import { useChainId } from "lib/chains";
import { fetchSolanaBalances, type SolanaBalances } from "lib/solana/balances";
import { retryAtRefreshCadence } from "lib/useSWRWithFreshness";

export function getSolanaBalancesKey(networkId: NetworkId, owner: string) {
  return ["solanaBalances", networkId, owner] as const;
}

export function useGmsolWalletBalances(owner: string | undefined) {
  const { networkId } = useChainId();
  const enabled = getIsSolanaNetworkEnabled() && isSolanaNetwork(networkId) && Boolean(owner);

  return useSWR<SolanaBalances, Error>(
    enabled && owner ? getSolanaBalancesKey(networkId, owner) : null,
    ([, , owner]: ReturnType<typeof getSolanaBalancesKey>) => fetchSolanaBalances({ owner, tokens: GMSOL_TOKENS }),
    { keepPreviousData: false, onErrorRetry: retryAtRefreshCadence }
  );
}
