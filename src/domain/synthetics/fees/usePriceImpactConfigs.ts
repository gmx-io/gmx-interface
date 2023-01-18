import { useMemo } from "react";
import DataStore from "abis/DataStore.json";
import { PriceImpactConfigsData } from "./types";
import { useMarketsData } from "../markets";
import { useMulticall } from "lib/multicall";
import { getContract } from "config/contracts";
import { swapImpactExponentFactorKey, swapImpactFactorKey } from "config/dataStore";

// TODO
/**
 * 
 * @param chainId 
 * @returns 
 * // @dev get the position impact pool amount
    // @param dataStore DataStore
    // @param market the market to check
    // @return the position impact pool amount
    function getPositionImpactPoolAmount(DataStore dataStore, address market) internal view returns (uint256) {
        return dataStore.getUint(Keys.positionImpactPoolAmountKey(market));
    }

    // @dev get the swap impact pool amount
    // @param dataStore DataStore
    // @param market the market to check
    // @param token the token to check
    // @return the swap impact pool amount
    function getSwapImpactPoolAmount(DataStore dataStore, address market, address token) internal view returns (uint256) {
        return dataStore.getUint(Keys.swapImpactPoolAmountKey(market, token));
    }
 */

export function usePriceImpactConfigs(chainId: number): PriceImpactConfigsData {
  const { marketsData } = useMarketsData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const cacheKey = marketAddresses.length > 0 ? [marketAddresses.join("-")] : null;

  const { data } = useMulticall(chainId, "usePriceImpactConfigs", {
    key: cacheKey,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: marketAddresses.reduce((calls, marketAddress) => {
          return Object.assign(calls, {
            [`${marketAddress}-impactFactor-positive`]: {
              methodName: "getUint",
              params: [swapImpactFactorKey(marketAddress, true)],
            },
            [`${marketAddress}-impactFactor-negative`]: {
              methodName: "getUint",
              params: [swapImpactFactorKey(marketAddress, false)],
            },
            [`${marketAddress}-exponentImpactFactor`]: {
              methodName: "getUint",
              params: [swapImpactExponentFactorKey(marketAddress)],
            },
          });
        }, {}),
      },
    }),
    parseResponse: (res) =>
      marketAddresses.reduce((result: PriceImpactConfigsData, address) => {
        const factorPositive = res.dataStore[`${address}-impactFactor-positive`].returnValues[0];
        const factorNegative = res.dataStore[`${address}-impactFactor-negative`].returnValues[0];
        const exponentFactor = res.dataStore[`${address}-exponentImpactFactor`].returnValues[0];

        if (!factorNegative || !factorPositive || !exponentFactor) {
          return result;
        }

        result[address] = {
          factorPositive,
          factorNegative,
          exponentFactor,
        };

        return result as PriceImpactConfigsData;
      }, {}),
  });

  return useMemo(() => {
    return data || {};
  }, [data]);
}
