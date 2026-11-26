import { getContract } from "config/contracts";
import { SWAP_FEE_RECEIVER_FACTOR_KEY } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

export function useSwapFeeReceiverFactorRequest(chainId: ContractsChainId): bigint | undefined {
  const { data } = useMulticall(chainId, "useSwapFeeReceiverFactor", {
    key: [],
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          swapFeeReceiverFactor: {
            methodName: "getUint",
            params: [SWAP_FEE_RECEIVER_FACTOR_KEY],
          },
        },
      },
    }),
    parseResponse: (res) => res.data.dataStore.swapFeeReceiverFactor.returnValues[0] as bigint,
  });

  return data;
}
