import { getContract } from "config/contracts";
import DataStore from "abis/DataStore.json";
import { useMulticall } from "lib/multicall";
import {
  ESTIMATED_GAS_FEE_BASE_AMOUNT,
  ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR,
  decreaseOrderGasLimitKey,
  depositGasLimitKey,
  increaseOrderGasLimitKey,
  singleSwapGasLimitKey,
  swapOrderGasLimitKey,
  withdrawalGasLimitKey,
} from "config/dataStore";
import { GasLimitsConfig } from "./types";

type GasLimitsResult = {
  gasLimits?: GasLimitsConfig;
};

export function useGasLimits(chainId: number): GasLimitsResult {
  const { data } = useMulticall(chainId, "useGasLimitsConfig", {
    key: [],
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
          withdrawalSingleToken: {
            methodName: "getUint",
            params: [withdrawalGasLimitKey(true)],
          },
          withdrawalMultiToken: {
            methodName: "getUint",
            params: [withdrawalGasLimitKey(false)],
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
          estimatedFeeBaseGasLimit: {
            methodName: "getUint",
            params: [ESTIMATED_GAS_FEE_BASE_AMOUNT],
          },
          estimatedFeeMultiplierFactor: {
            methodName: "getUint",
            params: [ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const results = res.dataStore;

      return {
        depositSingleToken: results.depositSingleToken.returnValues[0],
        depositMultiToken: results.depositMultiToken.returnValues[0],
        withdrawalSingleToken: results.withdrawalSingleToken.returnValues[0],
        withdrawalMultiToken: results.withdrawalMultiToken.returnValues[0],
        singleSwap: results.singleSwap.returnValues[0],
        swapOrder: results.swapOrder.returnValues[0],
        increaseOrder: results.increaseOrder.returnValues[0],
        decreaseOrder: results.decreaseOrder.returnValues[0],
        estimatedFeeBaseGasLimit: results.estimatedFeeBaseGasLimit.returnValues[0],
        estimatedFeeMultiplierFactor: results.estimatedFeeMultiplierFactor.returnValues[0],
      };
    },
  });

  return {
    gasLimits: data,
  };
}
