import { Provider } from "ethers";
import { GasPriceData } from "lib/contracts/utils";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { useMemo } from "react";
import useSWR from "swr";
import { getGasPrice } from ".";

export function useGasPriceData(chainId: number, provider?: Provider, opts: { skip?: boolean } = {}) {
  const { skip } = opts;

  const { data } = useSWR<GasPriceData | undefined>(provider && !skip ? ["useGasPriceData", chainId] : null, {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    fetcher: async () => {
      if (!provider) {
        return undefined;
      }

      return getGasPrice(provider, chainId);
    },
  });

  return useMemo(() => {
    return { data };
  }, [data]);
}
