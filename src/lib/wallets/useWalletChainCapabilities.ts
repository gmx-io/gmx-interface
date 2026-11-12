import useSWR from "swr";
import { useAccount } from "wagmi";

import { fetchWalletChainCapabilities } from "./walletCapabilities";

/** One `wallet_getCapabilities` per connected wallet and chain, asked only once a flow needs it */
export function useWalletChainCapabilities({ chainId, enabled }: { chainId: number | undefined; enabled: boolean }) {
  const { connector, address } = useAccount();

  const { data } = useSWR(
    enabled && connector && address && chainId !== undefined
      ? [connector.uid, address, chainId, "walletChainCapabilities"]
      : null,
    {
      fetcher: () =>
        fetchWalletChainCapabilities({ account: address!, connector: connector!, chainId: chainId! }).then(
          (result) => result.capabilities
        ),
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return data;
}
