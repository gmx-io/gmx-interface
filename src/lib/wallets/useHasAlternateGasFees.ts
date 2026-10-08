import { getCapabilities, type GetCapabilitiesReturnType } from "@wagmi/core";
import useSWR from "swr";
import { useAccount } from "wagmi";

import { getWagmiConfig } from "./walletConfig";

const NO_CAPABILITIES: GetCapabilitiesReturnType = {};
const ALL_CHAINS_ID = 0;

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

  const alternateGasFees = capabilities?.[chainId]?.alternateGasFees ?? capabilities?.[ALL_CHAINS_ID]?.alternateGasFees;

  return alternateGasFees?.supported === true;
}
