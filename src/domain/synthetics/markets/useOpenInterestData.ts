import { openInterestKey } from "domain/synthetics/dataStore";
import DataStore from "abis/DataStore.json";
import { OpenInterestData, getMarket, useMarketsData } from "../markets";
import { BigNumber } from "ethers";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";

export function useOpenInterestData(chainId: number): OpenInterestData {
  const marketsData = useMarketsData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const cacheKey = marketAddresses.length > 0 ? [marketAddresses.join("-")] : null;

  const { data } = useMulticall(chainId, "useOpenInterestData", {
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
      marketAddresses.reduce((result: OpenInterestData, address) => {
        const longInterestUsingLongToken = res.dataStore[`${address}-longToken-long`].returnValues[0];
        const longInterestUsingShortToken = res.dataStore[`${address}-shortToken-long`].returnValues[0];

        const shortInterestUsingLongToken = res.dataStore[`${address}-longToken-short`].returnValues[0];
        const shortInterestUsingShortToken = res.dataStore[`${address}-shortToken-short`].returnValues[0];

        if (
          ![
            longInterestUsingLongToken,
            longInterestUsingShortToken,
            shortInterestUsingLongToken,
            shortInterestUsingShortToken,
          ].every(BigNumber.isBigNumber)
        ) {
          return result;
        }

        result[address] = {
          longInterest: BigNumber.from(0).add(longInterestUsingLongToken).add(longInterestUsingShortToken),
          shortInterest: BigNumber.from(0).add(shortInterestUsingLongToken).add(shortInterestUsingShortToken),
        };

        return result;
      }, {} as OpenInterestData),
  });

  return useMemo(() => {
    return data || {};
  }, [data]);
}
