import { openInterestInTokensKey, openInterestKey } from "config/dataStore";
import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { getMarket } from "./utils";
import { useMarketsData } from "./useMarketsData";
import { MarketsOpenInterestData } from "./types";

type OpenInterestDataResult = {
  openInterestData: MarketsOpenInterestData;
  isLoading: boolean;
};

export function useOpenInterestData(chainId: number): OpenInterestDataResult {
  const { marketsData } = useMarketsData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const cacheKey = marketAddresses.length > 0 ? [marketAddresses.join("-")] : null;

  const { data, isLoading } = useMulticall(chainId, "useOpenInterestData", {
    key: cacheKey,
    request: () =>
      marketAddresses.reduce((request, marketAddress) => {
        const market = getMarket(marketsData, marketAddress);

        if (!market) return request;

        return Object.assign(request, {
          [`${marketAddress}-dataStore`]: {
            contractAddress: getContract(chainId, "DataStore"),
            abi: DataStore.abi,
            calls: {
              longInterestUsingLongToken: {
                methodName: "getUint",
                params: [openInterestKey(marketAddress, market.longTokenAddress, true)],
              },
              longInterestUsingShortToken: {
                methodName: "getUint",
                params: [openInterestKey(marketAddress, market.shortTokenAddress, true)],
              },
              shortInterestUsingLongToken: {
                methodName: "getUint",
                params: [openInterestKey(marketAddress, market.longTokenAddress, false)],
              },
              shortInterestUsingShortToken: {
                methodName: "getUint",
                params: [openInterestKey(marketAddress, market.shortTokenAddress, false)],
              },
              longInterestInTokensUsingLongToken: {
                methodName: "getUint",
                params: [openInterestInTokensKey(marketAddress, market.longTokenAddress, true)],
              },
              longInterestInTokensUsingShortToken: {
                methodName: "getUint",
                params: [openInterestInTokensKey(marketAddress, market.shortTokenAddress, true)],
              },
              shortInterestInTokensUsingLongToken: {
                methodName: "getUint",
                params: [openInterestInTokensKey(marketAddress, market.longTokenAddress, false)],
              },
              shortInterestInTokensUsingShortToken: {
                methodName: "getUint",
                params: [openInterestInTokensKey(marketAddress, market.shortTokenAddress, false)],
              },
            },
          },
        });
      }, {}),
    parseResponse: (res) =>
      marketAddresses.reduce((acc: MarketsOpenInterestData, address) => {
        const dataStore = res[`${address}-dataStore`];

        const longInterestUsingLongToken = dataStore.longInterestUsingLongToken.returnValues[0];
        const longInterestUsingShortToken = dataStore.longInterestUsingShortToken.returnValues[0];

        const longInterestUsd = longInterestUsingLongToken.add(longInterestUsingShortToken);

        const shortInterestUsingLongToken = dataStore.shortInterestUsingLongToken.returnValues[0];
        const shortInterestUsingShortToken = dataStore.shortInterestUsingShortToken.returnValues[0];

        const shortInterestUsd = shortInterestUsingLongToken.add(shortInterestUsingShortToken);

        const longInterestInTokensUsingLongToken = dataStore.longInterestInTokensUsingLongToken.returnValues[0];
        const longInterestInTokensUsingShortToken = dataStore.longInterestInTokensUsingShortToken.returnValues[0];

        const longInterestInTokens = longInterestInTokensUsingLongToken.add(longInterestInTokensUsingShortToken);

        const shortInterestInTokensUsingLongToken = dataStore.shortInterestInTokensUsingLongToken.returnValues[0];
        const shortInterestInTokensUsingShortToken = dataStore.shortInterestInTokensUsingShortToken.returnValues[0];

        const shortInterestInTokens = shortInterestInTokensUsingLongToken.add(shortInterestInTokensUsingShortToken);

        acc[address] = {
          longInterestUsd,
          shortInterestUsd,
          longInterestInTokens,
          shortInterestInTokens,
        };

        return acc;
      }, {} as MarketsOpenInterestData),
  });

  return useMemo(() => {
    return {
      openInterestData: data || {},
      isLoading,
    };
  }, [data, isLoading]);
}
