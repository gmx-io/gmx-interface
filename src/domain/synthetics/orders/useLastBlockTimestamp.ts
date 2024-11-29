import Multicall from "abis/Multicall.json";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { useMulticall } from "lib/multicall";
import { getContract } from "config/contracts";

export function useLastBlockTimestamp(chainId: number) {
  const { data } = useMulticall(chainId, "useLastBlockTimestamp", {
    key: [],
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: () => ({
      multicall: {
        contractAddress: getContract(chainId, "Multicall"),
        abi: Multicall.abi,
        calls: {
          getCurrentBlockTimestamp: {
            methodName: "getCurrentBlockTimestamp",
            params: [],
          },
        },
      },
    }),

    parseResponse: (res) => {
      const blockTimestamp: number = res.data.multicall.getCurrentBlockTimestamp.returnValues[0];

      return {
        blockTimestamp,
        localTimestamp: Date.now(),
      };
    },
  });

  return data;
}
