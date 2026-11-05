import { getIsSolanaNetworkEnabled } from "config/ab";
import { useSolanaUiFlagsRequest } from "domain/synthetics/uiFlags/useSolanaUiFlagsRequest";

export function useSolanaTradingEnabled({ enabled }: { enabled: boolean }) {
  const shouldFetch = enabled && getIsSolanaNetworkEnabled();
  const { uiFlags, error, isLoading } = useSolanaUiFlagsRequest({ enabled: shouldFetch });

  return {
    isSolanaTradingEnabled: shouldFetch && !isLoading && !error && uiFlags?.solanaTrading?.enabled === true,
    isLoading: shouldFetch && isLoading,
    error: shouldFetch ? error : undefined,
  };
}
