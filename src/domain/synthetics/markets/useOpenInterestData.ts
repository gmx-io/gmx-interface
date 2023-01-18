import { openInterestKey } from "config/dataStore";
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
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: marketAddresses.reduce((calls, marketAddress) => {
          const market = getMarket(marketsData, marketAddress);

          return Object.assign(calls, {
            [`${marketAddress}-longToken-long`]: {
              methodName: "getUint",
              params: [openInterestKey(marketAddress, market!.longTokenAddress, true)],
            },
            [`${marketAddress}-shortToken-long`]: {
              methodName: "getUint",
              params: [openInterestKey(marketAddress, market!.shortTokenAddress, true)],
            },
            [`${marketAddress}-longToken-short`]: {
              methodName: "getUint",
              params: [openInterestKey(marketAddress, market!.longTokenAddress, false)],
            },
            [`${marketAddress}-shortToken-short`]: {
              methodName: "getUint",
              params: [openInterestKey(marketAddress, market!.shortTokenAddress, false)],
            },
          });
        }, {}),
      },
    }),
    parseResponse: (res) =>
      marketAddresses.reduce((result: MarketsOpenInterestData, address) => {
        const longInterestUsingLongToken = res.dataStore[`${address}-longToken-long`].returnValues[0];
        const longInterestUsingShortToken = res.dataStore[`${address}-shortToken-long`].returnValues[0];

        const shortInterestUsingLongToken = res.dataStore[`${address}-longToken-short`].returnValues[0];
        const shortInterestUsingShortToken = res.dataStore[`${address}-shortToken-short`].returnValues[0];

        if (
          !longInterestUsingLongToken ||
          !longInterestUsingShortToken ||
          !shortInterestUsingLongToken ||
          !shortInterestUsingShortToken
        ) {
          return result;
        }

        result[address] = {
          longInterest: longInterestUsingLongToken.add(longInterestUsingShortToken),
          shortInterest: shortInterestUsingLongToken.add(shortInterestUsingShortToken),
        };

        return result;
      }, {} as MarketsOpenInterestData),
  });

  return useMemo(() => {
    return {
      openInterestData: data || {},
      isLoading,
    };
  }, [data, isLoading]);
}
