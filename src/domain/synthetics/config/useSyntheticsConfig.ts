import { getContract } from "config/contracts";
import DataStore from "abis/DataStore.json";
import { useMulticall } from "lib/multicall";
import { SyntheticsConfig } from "./types";
import {
  MAX_LEVERAGE_KEY,
  MIN_COLLATERAL_USD_KEY,
  decreaseOrderGasLimitKey,
  depositGasLimitKey,
  increaseOrderGasLimitKey,
  singleSwapGasLimitKey,
  swapOrderGasLimitKey,
  withdrawalGasLimitKey,
} from "config/dataStore";
import { BigNumber } from "ethers";
import { useMemo } from "react";

export type SyntheticsConfigResult = {
  syntheticsConfig: SyntheticsConfig | undefined;
  isLoading: boolean;
};

export function useSyntheticsConfig(chainId: number): SyntheticsConfigResult {
  const { data, isLoading } = useMulticall(chainId, "useSyntheticsConfig", {
    key: [],
    request: {
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          minCollateralUsd: {
            methodName: "getUint",
            params: [MIN_COLLATERAL_USD_KEY],
          },
          maxLeverage: {
            methodName: "getUint",
            params: [MAX_LEVERAGE_KEY],
          },
          depositGasLimitForSingleToken: {
            methodName: "getUint",
            params: [depositGasLimitKey(true)],
          },
          depositGasLimitForMultiToken: {
            methodName: "getUint",
            params: [depositGasLimitKey(false)],
          },
          withdrawalGasLimitForSingleToken: {
            methodName: "getUint",
            params: [withdrawalGasLimitKey(true)],
          },
          withdrawalGasLimitForMultiToken: {
            methodName: "getUint",
            params: [withdrawalGasLimitKey(false)],
          },
          singleSwapGasLimit: {
            methodName: "getUint",
            params: [singleSwapGasLimitKey()],
          },
          swapOrderGasLimit: {
            methodName: "getUint",
            params: [swapOrderGasLimitKey()],
          },
          increaseOrderGasLimit: {
            methodName: "getUint",
            params: [increaseOrderGasLimitKey()],
          },
          decreaseOrderGasLimit: {
            methodName: "getUint",
            params: [decreaseOrderGasLimitKey()],
          },
        },
      },
    },
    parseResponse: (res) => ({
      minCollateralUsd: res.dataStore.minCollateralUsd.returnValues[0] as BigNumber,
      maxLeverage: res.dataStore.maxLeverage.returnValues[0] as BigNumber,
    }),
  });

  return useMemo(() => {
    return {
      syntheticsConfig: data,
      isLoading,
    };
  }, [data, isLoading]);
}
