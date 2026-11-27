import useSWR from "swr";
import { useAccount } from "wagmi";

import { fetchWalletChainCapabilities, type WalletChainCapabilities } from "./walletCapabilities";

// SWR asks again on every mount while the cached value is undefined, so a wallet without capabilities gets a value too
const NO_CAPABILITIES: WalletChainCapabilities = {
  atomicStatus: undefined,
  hasAlternateGasFees: undefined,
  hasPaymasterService: undefined,
};

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
          (result) => result.capabilities ?? NO_CAPABILITIES
        ),
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return data;
}
