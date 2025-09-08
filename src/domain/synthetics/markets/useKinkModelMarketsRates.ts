import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useMarkets } from "domain/synthetics/markets";
import { ContractCallsConfig, useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import type { KinkModelMarketRateMulticallRequestConfig } from "sdk/modules/markets/types";
import { HASHED_KINK_MODEL_MARKET_RATES_KEYS } from "sdk/prebuilt";

export type KinkModelMarketsRatesResult = {
  kinkMarketsBorrowingRatesData: Record<
    string,
    {
      optimalUsageFactorLong: bigint;
      optimalUsageFactorShort: bigint;
      baseBorrowingFactorLong: bigint;
      baseBorrowingFactorShort: bigint;
      aboveOptimalUsageBorrowingFactorLong: bigint;
      aboveOptimalUsageBorrowingFactorShort: bigint;
    }
  >;
  error?: Error;
};

export function useKinkModelMarketsRates(chainId: ContractsChainId): KinkModelMarketsRatesResult {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const { marketsAddresses = [] } = useMarkets(chainId);

  const { data, error } = useMulticall(chainId, "useKinkModelMarketsRates", {
    key: [marketsAddresses],

    refreshInterval: CONFIG_UPDATE_INTERVAL,

    request: () =>
      marketsAddresses.reduce((acc, marketAddress) => {
        const prebuiltHashedKeys = HASHED_KINK_MODEL_MARKET_RATES_KEYS[chainId]?.[marketAddress];

        if (!prebuiltHashedKeys) {
          throw new Error(
            `No pre-built hashed config keys found for the market ${marketAddress}. Run \`yarn prebuild\` to generate them.`
          );
        }

        acc[`${marketAddress}-dataStore`] = {
          contractAddress: dataStoreAddress,
          abiId: "DataStore",
          calls: {
            optimalUsageFactorLong: {
              methodName: "getUint",
              params: [prebuiltHashedKeys.optimalUsageFactorLong],
            },
            optimalUsageFactorShort: {
              methodName: "getUint",
              params: [prebuiltHashedKeys.optimalUsageFactorShort],
            },
            baseBorrowingFactorLong: {
              methodName: "getUint",
              params: [prebuiltHashedKeys.baseBorrowingFactorLong],
            },
            baseBorrowingFactorShort: {
              methodName: "getUint",
              params: [prebuiltHashedKeys.baseBorrowingFactorShort],
            },
            aboveOptimalUsageBorrowingFactorLong: {
              methodName: "getUint",
              params: [prebuiltHashedKeys.aboveOptimalUsageBorrowingFactorLong],
            },
            aboveOptimalUsageBorrowingFactorShort: {
              methodName: "getUint",
              params: [prebuiltHashedKeys.aboveOptimalUsageBorrowingFactorShort],
            },
          },
        } satisfies ContractCallsConfig<any>;

        return acc;
      }, {}) as KinkModelMarketRateMulticallRequestConfig,
    parseResponse: (res) => {
      const result = marketsAddresses!.reduce(
        (acc, marketAddress) => {
          const dataStoreErrors = res.errors[`${marketAddress}-dataStore`];

          const dataStoreValues = res.data[`${marketAddress}-dataStore`];

          // Skip invalid market
          if (!dataStoreValues || dataStoreErrors) {
            // eslint-disable-next-line no-console
            console.log("market info error", marketAddress, dataStoreErrors, dataStoreValues);
            return acc;
          }

          const parsedResult = {
            optimalUsageFactorLong: dataStoreValues.optimalUsageFactorLong.returnValues[0],
            optimalUsageFactorShort: dataStoreValues.optimalUsageFactorShort.returnValues[0],
            baseBorrowingFactorLong: dataStoreValues.baseBorrowingFactorLong.returnValues[0],
            baseBorrowingFactorShort: dataStoreValues.baseBorrowingFactorShort.returnValues[0],
            aboveOptimalUsageBorrowingFactorLong: dataStoreValues.aboveOptimalUsageBorrowingFactorLong.returnValues[0],
            aboveOptimalUsageBorrowingFactorShort:
              dataStoreValues.aboveOptimalUsageBorrowingFactorShort.returnValues[0],
          };

          const isKinkMarket = Object.values(parsedResult).some((value) => value && value !== 0n);

          if (isKinkMarket) {
            acc[marketAddress] = parsedResult;
          }

          return acc;
        },
        {} as KinkModelMarketsRatesResult["kinkMarketsBorrowingRatesData"]
      );

      return result;
    },
  });

  return useMemo(
    () => ({
      kinkMarketsBorrowingRatesData: data || {},
      error,
    }),
    [data, error]
  );
}
