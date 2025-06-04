import useSWR from "swr";

import { useJsonRpcProvider } from "./rpc";
import { FREQUENT_UPDATE_INTERVAL } from "./timeConstants";

export function useBlockNumber(chainId: number) {
  const { provider } = useJsonRpcProvider(chainId);

  const { data } = useSWR(provider ? ["useBlockNumber", chainId] : null, {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    fetcher: async () => {
      const blockNumber = await provider?.getBlockNumber();

      if (!blockNumber) {
        return undefined;
      }

      return BigInt(blockNumber);
    },
  });

  return data;
}
