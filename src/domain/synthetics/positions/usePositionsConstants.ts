import { useMemo } from "react";

import { getContract } from "config/contracts";
import { MAX_AUTO_CANCEL_ORDERS_KEY, MIN_COLLATERAL_USD_KEY, MIN_POSITION_SIZE_USD_KEY } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";


export type PositionsConstantsResult = {
  positionsConstants: {
    minCollateralUsd?: bigint;
    minPositionSizeUsd?: bigint;
    maxAutoCancelOrders?: bigint;
  };
  error?: Error;
};

export function usePositionsConstantsRequest(chainId: number): PositionsConstantsResult {
  const { data, error } = useMulticall(chainId, "usePositionsConstants", {
    key: [],

    refreshInterval: CONFIG_UPDATE_INTERVAL,

    request: {
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          minCollateralUsd: {
            methodName: "getUint",
            params: [MIN_COLLATERAL_USD_KEY],
          },
          minPositionSizeUsd: {
            methodName: "getUint",
            params: [MIN_POSITION_SIZE_USD_KEY],
          },
          maxAutoCancelOrders: {
            methodName: "getUint",
            params: [MAX_AUTO_CANCEL_ORDERS_KEY],
          },
        },
      },
    },
    parseResponse: (res) => {
      return {
        minCollateralUsd: res.data.dataStore.minCollateralUsd.returnValues[0],
        minPositionSizeUsd: res.data.dataStore.minPositionSizeUsd.returnValues[0],
        maxAutoCancelOrders: res.data.dataStore.maxAutoCancelOrders.returnValues[0],
      };
    },
  });

  return useMemo(
    () => ({
      positionsConstants: data || {},
      error,
    }),
    [data, error]
  );
}
