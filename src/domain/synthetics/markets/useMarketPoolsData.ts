import { useMemo } from "react";
import { getContract } from "config/contracts";
import { getMarket } from "./utils";
import Reader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import { useMarketsData } from "./useMarketsData";
import { MarketsPoolsData } from "./types";

export function useMarketsPoolsData(chainId: number): MarketsPoolsData {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const marketsData = useMarketsData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const { data: marketPools } = useMulticall(chainId, "useMarketPools", {
    key: marketAddresses.length > 0 && [marketAddresses.join("-")],
    request: () => ({
      pools: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: Reader.abi,
        calls: marketAddresses.reduce((calls, marketAddress) => {
          const market = getMarket(marketsData, marketAddress)!;

          calls[`${marketAddress}-long`] = {
            methodName: "getPoolAmount",
            params: [dataStoreAddress, market.marketTokenAddress, market.longTokenAddress],
          };

          calls[`${marketAddress}-short`] = {
            methodName: "getPoolAmount",
            params: [dataStoreAddress, market.marketTokenAddress, market.shortTokenAddress],
          };

          return calls;
        }, {}),
      },
    }),
    parseResponse: (res) =>
      marketAddresses.reduce((acc: MarketsPoolsData, marketAddress: string) => {
        acc[marketAddress] = {
          longPoolAmount: res.pools[`${marketAddress}-long`].returnValues[0],
          shortPoolAmount: res.pools[`${marketAddress}-short`].returnValues[0],
        };

        return acc;
      }, {} as MarketsPoolsData),
  });

  return useMemo(() => {
    return marketPools || {};
  }, [marketPools]);
}
