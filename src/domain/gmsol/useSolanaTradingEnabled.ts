import useSWR from "swr";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { ARBITRUM } from "config/chains";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchSolanaTradingEnabled } from "./fetchSolanaTradingEnabled";

export function useSolanaTradingEnabled({ enabled }: { enabled: boolean }) {
  const shouldFetch = enabled && getIsSolanaNetworkEnabled();
  const { data, error, isLoading } = useSWR<boolean, Error>(
    shouldFetch ? ["solanaTrading", ARBITRUM] : null,
    fetchSolanaTradingEnabled,
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  return {
    isSolanaTradingEnabled: shouldFetch && !isLoading && !error && data === true,
    isLoading: shouldFetch && isLoading,
    error: shouldFetch ? error : undefined,
  };
}
