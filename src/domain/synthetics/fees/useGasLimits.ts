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
      const results = res.data.dataStore;

      return {
        depositSingleToken: BigInt(results.depositSingleToken.returnValues[0]),
        depositMultiToken: BigInt(results.depositMultiToken.returnValues[0]),
        withdrawalMultiToken: BigInt(results.withdrawalMultiToken.returnValues[0]),
        singleSwap: BigInt(results.singleSwap.returnValues[0]),
        swapOrder: BigInt(results.swapOrder.returnValues[0]),
        increaseOrder: BigInt(results.increaseOrder.returnValues[0]),
        decreaseOrder: BigInt(results.decreaseOrder.returnValues[0]),
        estimatedFeeBaseGasLimit: BigInt(results.estimatedFeeBaseGasLimit.returnValues[0]),
        estimatedFeeMultiplierFactor: BigInt(results.estimatedFeeMultiplierFactor.returnValues[0]),
      };
    },
  });

  return data;
}
