import { getIsFlagEnabled } from "config/ab";
import { getGasPrice } from ".";
import { Provider } from "ethers";
import { GasPriceData } from "lib/contracts/utils";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { useMemo } from "react";
import useSWR from "swr";

export function useGasPriceData(chainId: number, provider?: Provider) {
  const { data } = useSWR<GasPriceData | undefined>(
    provider && getIsFlagEnabled("testRemoveGasRequests") ? ["useGasPriceData", chainId] : null,
    {
      refreshInterval: FREQUENT_UPDATE_INTERVAL,
      fetcher: async () => {
        if (!provider) {
          return undefined;
        }

        return getGasPrice(provider, chainId);
      },
    }
  );

  return useMemo(() => {
    return { data };
  }, [data]);
}
