import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { MAX_LEVERAGE_KEY, MIN_COLLATERAL_USD_KEY } from "config/dataStore";
import { BigNumber } from "ethers";
import { MAX_ALLOWED_LEVERAGE } from "lib/legacy";
import { useMulticall } from "lib/multicall";

export type PositionsConstantsResult = {
  minCollateralUsd?: BigNumber;
  maxLeverage?: BigNumber;
};

export function usePositionsConstants(chainId: number): PositionsConstantsResult {
  const { data } = useMulticall(chainId, "usePositionsConstants", {
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

  return {
    minCollateralUsd: data?.minCollateralUsd,
    maxLeverage: data?.maxLeverage?.gt(0) ? data.maxLeverage : BigNumber.from(MAX_ALLOWED_LEVERAGE),
  };
}
