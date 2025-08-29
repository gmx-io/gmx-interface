import { useMemo } from "react";

import { getContract } from "config/contracts";
import {
  CLAIMABLE_COLLATERAL_DELAY_KEY,
  CLAIMABLE_COLLATERAL_REDUCTION_FACTOR_KEY,
  CLAIMABLE_COLLATERAL_TIME_DIVISOR_KEY,
  MAX_AUTO_CANCEL_ORDERS_KEY,
  MIN_COLLATERAL_USD_KEY,
  MIN_POSITION_SIZE_USD_KEY,
} from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

export type PositionsConstants = {
  minCollateralUsd: bigint;
  minPositionSizeUsd: bigint;
  maxAutoCancelOrders: bigint;
  claimableCollateralDelay: bigint;
  claimableCollateralReductionFactor: bigint;
  claimableCollateralTimeDivisor: bigint;
};

export type PositionsConstantsResult = {
  positionsConstants: PositionsConstants | undefined;
  error?: Error;
};

export function usePositionsConstantsRequest(chainId: ContractsChainId): PositionsConstantsResult {
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
          claimableCollateralDelay: {
            methodName: "getUint",
            params: [CLAIMABLE_COLLATERAL_DELAY_KEY],
          },
          claimableCollateralReductionFactor: {
            methodName: "getUint",
            params: [CLAIMABLE_COLLATERAL_REDUCTION_FACTOR_KEY],
          },
          claimableCollateralTimeDivisor: {
            methodName: "getUint",
            params: [CLAIMABLE_COLLATERAL_TIME_DIVISOR_KEY],
          },
        },
      },
    },
    parseResponse: (res) => {
      return {
        minCollateralUsd: res.data.dataStore.minCollateralUsd.returnValues[0],
        minPositionSizeUsd: res.data.dataStore.minPositionSizeUsd.returnValues[0],
        maxAutoCancelOrders: res.data.dataStore.maxAutoCancelOrders.returnValues[0],
        claimableCollateralDelay: res.data.dataStore.claimableCollateralDelay.returnValues[0],
        claimableCollateralReductionFactor: res.data.dataStore.claimableCollateralReductionFactor.returnValues[0],
        claimableCollateralTimeDivisor: res.data.dataStore.claimableCollateralTimeDivisor.returnValues[0],
      };
    },
  });

  return useMemo(
    () => ({
      positionsConstants: data || undefined,
      error,
    }),
    [data, error]
  );
}
