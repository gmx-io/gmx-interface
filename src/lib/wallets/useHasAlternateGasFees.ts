import { getCapabilities, type GetCapabilitiesReturnType } from "@wagmi/core";
import useSWR from "swr";
import { useAccount } from "wagmi";

import { getWagmiConfig } from "./walletConfig";

const NO_CAPABILITIES: GetCapabilitiesReturnType = {};

export function useHasAlternateGasFees({ chainId, enabled }: { chainId: number; enabled: boolean }): boolean {
  const { connector, address } = useAccount();

  const { data: capabilities } = useSWR(
    enabled && connector && address ? [connector.uid, address, "capabilities"] : null,
    {
      fetcher: () => getCapabilities(getWagmiConfig(), { account: address, connector }).catch(() => NO_CAPABILITIES),
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return capabilities?.[chainId]?.alternateGasFees?.supported === true;
}
