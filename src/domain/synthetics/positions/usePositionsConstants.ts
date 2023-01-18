import { MAX_LEVERAGE_KEY, MIN_COLLATERAL_USD_KEY } from "config/dataStore";
import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { BigNumber } from "ethers";
import { useMemo } from "react";

export type PositionsConstantsResult = {
  minCollateralUsd?: BigNumber;
  maxLeverage?: BigNumber;
  isLoading: boolean;
};

export function useMinCollateralUsd(chainId: number) {
  const { minCollateralUsd } = usePositionsConstants(chainId);
  return minCollateralUsd;
}

export function useMaxLeverage(chainId: number) {
  const { maxLeverage } = usePositionsConstants(chainId);
  return maxLeverage;
}

export function usePositionsConstants(chainId: number): PositionsConstantsResult {
  const { data, isLoading } = useMulticall(chainId, "usePositionsConstants", {
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
      minCollateralUsd: data?.minCollateralUsd,
      maxLeverage: data?.maxLeverage,
      isLoading,
    };
  }, [data, isLoading]);
}
