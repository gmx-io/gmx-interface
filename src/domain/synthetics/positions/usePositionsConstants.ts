import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { MIN_COLLATERAL_USD_KEY } from "config/dataStore";
import { BigNumber } from "ethers";
import { useMulticall } from "lib/multicall";

export type PositionsConstantsResult = {
  minCollateralUsd?: BigNumber;
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
        },
      },
    },
    parseResponse: (res) => ({
      minCollateralUsd: res.dataStore.minCollateralUsd.returnValues[0] as BigNumber,
    }),
  });

  return {
    minCollateralUsd: data?.minCollateralUsd,
  };
}
