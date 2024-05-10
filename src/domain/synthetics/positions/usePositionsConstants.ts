import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { MIN_COLLATERAL_USD_KEY, MIN_POSITION_SIZE_USD_KEY } from "config/dataStore";
import { useMulticall } from "lib/multicall";

export type PositionsConstantsResult = {
  minCollateralUsd?: bigint;
  minPositionSizeUsd?: bigint;
};

export function usePositionsConstantsRequest(chainId: number): PositionsConstantsResult {
  const { data } = useMulticall(chainId, "usePositionsConstants", {
    key: [],

    refreshInterval: 60000,

    request: {
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          minCollateralUsd: {
            methodName: "getUint",
            params: [MIN_COLLATERAL_USD_KEY],
          },
          minPositionSizeUsd: {
            methodName: "getUint",
            params: [MIN_POSITION_SIZE_USD_KEY],
          },
        },
      },
    },
    parseResponse: (res) => {
      return {
        minCollateralUsd: res.data.dataStore.minCollateralUsd.returnValues[0],
        minPositionSizeUsd: res.data.dataStore.minPositionSizeUsd.returnValues[0],
      };
    },
  });

  return data || {};
}
