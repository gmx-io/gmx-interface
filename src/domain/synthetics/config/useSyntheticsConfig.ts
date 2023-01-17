import { getContract } from "config/contracts";
import DataStore from "abis/DataStore.json";
import { useMulticall } from "lib/multicall";
import { SyntheticsConfig } from "./types";
import {
  MAX_LEVERAGE_KEY,
  MIN_COLLATERAL_USD_KEY,
  getDecreaseOrderGasLimitKey,
  getDepositGasLimitKey,
  getIncreaseOrderGasLimitKey,
  getSingleSwapGasLimitKey,
  getSwapOrderGasLimitKey,
  getWithdrawalGasLimitKey,
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
            params: [getDepositGasLimitKey(true)],
          },
          depositGasLimitForMultiToken: {
            methodName: "getUint",
            params: [getDepositGasLimitKey(false)],
          },
          withdrawalGasLimitForSingleToken: {
            methodName: "getUint",
            params: [getWithdrawalGasLimitKey(true)],
          },
          withdrawalGasLimitForMultiToken: {
            methodName: "getUint",
            params: [getWithdrawalGasLimitKey(false)],
          },
          singleSwapGasLimit: {
            methodName: "getUint",
            params: [getSingleSwapGasLimitKey()],
          },
          swapOrderGasLimit: {
            methodName: "getUint",
            params: [getSwapOrderGasLimitKey()],
          },
          increaseOrderGasLimit: {
            methodName: "getUint",
            params: [getIncreaseOrderGasLimitKey()],
          },
          decreaseOrderGasLimit: {
            methodName: "getUint",
            params: [getDecreaseOrderGasLimitKey()],
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
