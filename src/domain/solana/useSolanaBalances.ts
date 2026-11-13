import useSWR from "swr";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { isSolanaNetwork, type NetworkId } from "config/chains";
import { useChainId } from "lib/chains";
import type { SolanaBalances } from "lib/solana/balances";

export function getSolanaBalancesKey(networkId: NetworkId, owner: string) {
  return ["solanaBalances", networkId, owner] as const;
}

export function useSolanaBalances(owner: string | undefined) {
  const { networkId } = useChainId();
  const enabled = getIsSolanaNetworkEnabled() && isSolanaNetwork(networkId) && Boolean(owner);

  return useSWR<SolanaBalances, Error>(
    enabled && owner ? getSolanaBalancesKey(networkId, owner) : null,
    async ([, , owner]: ReturnType<typeof getSolanaBalancesKey>) => {
      const { fetchSolanaBalances } = await import("lib/solana/balances");
      return fetchSolanaBalances(owner);
    },
    { keepPreviousData: false }
  );
}
