import { useMarkets } from "./useMarkets";
import { useMemo } from "react";
import { MarketPoolsData } from "./types";
import { getContract } from "config/contracts";
import { getMarket } from "./utils";
import Reader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import { BigNumber } from "ethers";

export function useMarketPools(chainId: number): MarketPoolsData {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const marketsData = useMarkets(chainId);

  const marketKeys = Object.keys(marketsData.markets);

  const { data: marketPools } = useMulticall(chainId, "useMarketPools", {
    key: marketKeys.length > 0 && [marketKeys.join("-")],
    aggregate: true,
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: Reader.abi,
        calls: marketKeys.reduce((calls, marketAddress) => {
          const market = getMarket(marketsData, marketAddress)!;

          calls[`${marketAddress}--${market.longTokenAddress}`] = {
            methodName: "getPoolAmount",
            params: [dataStoreAddress, market.marketTokenAddress, market.longTokenAddress],
          };

          calls[`${marketAddress}--${market.shortTokenAddress}`] = {
            methodName: "getPoolAmount",
            params: [dataStoreAddress, market.marketTokenAddress, market.shortTokenAddress],
          };

          return calls;
        }, {}),
      },
    }),
    parseResponse: (res) => {
      const poolsMap: { [marketAddress: string]: { [tokenAddress: string]: BigNumber } } = {};

      Object.keys(res.reader).forEach((key) => {
        const [marketAddress, tokenAddress] = key.split("--");

        poolsMap[marketAddress] = poolsMap[marketAddress] || {};

        poolsMap[marketAddress][tokenAddress] = res.reader[key].returnValues[0];
      });

      return poolsMap;
    },
  });

  return useMemo(() => {
    return {
      marketPools: marketPools || {},
    };
  }, [marketPools]);
}
