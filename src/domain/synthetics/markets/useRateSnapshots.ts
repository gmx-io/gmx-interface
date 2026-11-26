import useSWR from "swr";

import { getUiApiCacheKey } from "config/api";
import { isSolanaNetwork } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { isSameAddress } from "sdk/utils/address";
import { ApiParameterPeriod, MarketRates, RatesSnapshot } from "sdk/utils/rates/types";

export type RateTimeframe = "1d" | "7d" | "30d";

const TIMEFRAME_TO_PERIOD: Record<RateTimeframe, ApiParameterPeriod> = {
  "1d": "1d",
  "7d": "7d",
  "30d": "30d",
};

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useRateSnapshots({
  marketAddress,
  timeframe,
}: {
  marketAddress: string | undefined;
  timeframe: RateTimeframe;
}) {
  const chainId = useSelector(selectChainId);
  const { networkId } = useChainId();
  // Solana's shared trade state retains an EVM chainId. EVM pages may override it (e.g. leaderboard).
  const ratesNetworkId = isSolanaNetwork(networkId) ? networkId : chainId;
  const sdk = useGmxSdk(ratesNetworkId);
  const apiCacheKey = getUiApiCacheKey(ratesNetworkId);

  const swrKey =
    sdk && marketAddress
      ? (["useRateSnapshots", ratesNetworkId, apiCacheKey, marketAddress, timeframe] as const)
      : null;

  const { data, isLoading, error } = useSWR<RatesSnapshot[] | undefined>(swrKey, {
    fetcher: async ([, , , address, selectedTimeframe]: NonNullable<typeof swrKey>) => {
      const result: MarketRates[] = await sdk!.fetchRates({
        period: TIMEFRAME_TO_PERIOD[selectedTimeframe],
        address,
      });

      const marketData = result.find((r) => isSameAddress(r.marketAddress, address));

      if (!marketData) {
        return [];
      }

      return [...marketData.ratesSnapshots].sort((a, b) => a.timestamp - b.timestamp);
    },
    refreshInterval: REFRESH_INTERVAL,
    keepPreviousData: false,
  });

  return {
    snapshots: data,
    isLoading: isLoading || (!marketAddress && sdk !== undefined),
    isUnavailable: sdk === undefined,
    error,
  };
}
