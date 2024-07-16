import { getContract } from "config/contracts";
import {
  ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1,
  ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR,
  ESTIMATED_GAS_FEE_PER_ORACLE_PRICE,
  decreaseOrderGasLimitKey,
  depositGasLimitKey,
  increaseOrderGasLimitKey,
  singleSwapGasLimitKey,
  swapOrderGasLimitKey,
  withdrawalGasLimitKey,
} from "config/dataStore";
import { useMulticall } from "lib/multicall";
import type { GasLimitsConfig } from "./types";

import DataStore from "abis/DataStore.json";

export function useGasLimits(chainId: number): GasLimitsConfig | undefined {
  const { data } = useMulticall(chainId, "useGasLimitsConfig", {
    key: [],

    refreshInterval: 60000,

    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          depositSingleToken: {
            methodName: "getUint",
            params: [depositGasLimitKey(true)],
          },
          depositMultiToken: {
            methodName: "getUint",
            params: [depositGasLimitKey(false)],
          },
          withdrawalMultiToken: {
            methodName: "getUint",
            params: [withdrawalGasLimitKey()],
          },
          singleSwap: {
            methodName: "getUint",
            params: [singleSwapGasLimitKey()],
          },
          swapOrder: {
            methodName: "getUint",
            params: [swapOrderGasLimitKey()],
          },
          increaseOrder: {
            methodName: "getUint",
            params: [increaseOrderGasLimitKey()],
          },
          decreaseOrder: {
            methodName: "getUint",
            params: [decreaseOrderGasLimitKey()],
          },
          estimatedGasFeeBaseAmount: {
            methodName: "getUint",
            params: [ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1],
          },
          estimatedGasFeePerOraclePrice: {
            methodName: "getUint",
            params: [ESTIMATED_GAS_FEE_PER_ORACLE_PRICE],
          },
          estimatedFeeMultiplierFactor: {
            methodName: "getUint",
            params: [ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const results = res.data.dataStore;

      function getBigInt(key: keyof typeof results) {
        return BigInt(results[key].returnValues[0]);
      }

      return {
        depositSingleToken: getBigInt("depositSingleToken"),
        depositMultiToken: getBigInt("depositMultiToken"),
        withdrawalMultiToken: getBigInt("withdrawalMultiToken"),
        singleSwap: getBigInt("singleSwap"),
        swapOrder: getBigInt("swapOrder"),
        increaseOrder: getBigInt("increaseOrder"),
        decreaseOrder: getBigInt("decreaseOrder"),
        estimatedGasFeeBaseAmount: getBigInt("estimatedGasFeeBaseAmount"),
        estimatedGasFeePerOraclePrice: getBigInt("estimatedGasFeePerOraclePrice"),
        estimatedFeeMultiplierFactor: getBigInt("estimatedFeeMultiplierFactor"),
      };
    },
  });

  return data;
}
