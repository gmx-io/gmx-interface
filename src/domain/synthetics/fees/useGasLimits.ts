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
import { BigNumber } from "ethers";

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
        depositSingleToken: BigNumber.from(results.depositSingleToken.returnValues[0]),
        depositMultiToken: BigNumber.from(results.depositMultiToken.returnValues[0]),
        withdrawalMultiToken: BigNumber.from(results.withdrawalMultiToken.returnValues[0]),
        singleSwap: BigNumber.from(results.singleSwap.returnValues[0]),
        swapOrder: BigNumber.from(results.swapOrder.returnValues[0]),
        increaseOrder: BigNumber.from(results.increaseOrder.returnValues[0]),
        decreaseOrder: BigNumber.from(results.decreaseOrder.returnValues[0]),
        estimatedFeeBaseGasLimit: BigNumber.from(results.estimatedFeeBaseGasLimit.returnValues[0]),
        estimatedFeeMultiplierFactor: BigNumber.from(results.estimatedFeeMultiplierFactor.returnValues[0]),
      };
    },
  });

  return data;
}
