import { MAX_PNL_FACTOR_FOR_TRADERS_KEY } from "config/dataStore";
import { getByKey } from "lib/objects";

import { MarketsData } from "domain/synthetics/markets/types";
import { MarketValuesMulticallRequestConfig } from "domain/synthetics/markets/useMarketsInfoRequest";
import { getContractMarketPrices } from "domain/synthetics/markets/utils";
import { TokensData } from "domain/synthetics/tokens/types";

import { HASHED_MARKET_VALUES_KEYS } from "prebuilt";

import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";

export async function buildMarketsValuesRequest(
  chainId: number,
  {
    marketsAddresses,
    marketsData,
    tokensData,
    dataStoreAddress,
    syntheticsReaderAddress,
  }: {
    marketsAddresses: string[] | undefined;
    marketsData: MarketsData | undefined;
    tokensData: TokensData | undefined;
    account?: string;
    dataStoreAddress: string;
    syntheticsReaderAddress: string;
  }
) {
  const request: MarketValuesMulticallRequestConfig = {};

  for (const marketAddress of marketsAddresses || []) {
    // eslint-disable-next-line es-x/no-string-prototype-replaceall
    const fixedAddress = marketAddress.replaceAll("1-", "");

    const market = getByKey(marketsData, marketAddress)!;
    const marketPrices = getContractMarketPrices(tokensData!, market)!;

    if (!marketPrices) {
      // eslint-disable-next-line no-console
      console.warn("missed market prices", market);
      continue;
    }

    const marketProps = {
      marketToken: fixedAddress,
      indexToken: market.indexTokenAddress,
      longToken: market.longTokenAddress,
      shortToken: market.shortTokenAddress,
    };

    request[`${marketAddress}-reader`] = {
      contractAddress: syntheticsReaderAddress,
      abi: SyntheticsReader.abi,
      calls: {
        marketInfo: {
          methodName: "getMarketInfo",
          params: [dataStoreAddress, marketPrices, fixedAddress],
        },
        marketTokenPriceMax: {
          methodName: "getMarketTokenPrice",
          params: [
            dataStoreAddress,
            marketProps,
            marketPrices.indexTokenPrice,
            marketPrices.longTokenPrice,
            marketPrices.shortTokenPrice,
            MAX_PNL_FACTOR_FOR_TRADERS_KEY,
            true,
          ],
        },
        marketTokenPriceMin: {
          methodName: "getMarketTokenPrice",
          params: [
            dataStoreAddress,
            marketProps,
            marketPrices.indexTokenPrice,
            marketPrices.longTokenPrice,
            marketPrices.shortTokenPrice,
            MAX_PNL_FACTOR_FOR_TRADERS_KEY,
            false,
          ],
        },
      },
    };

    const prebuiltHashedKeys = HASHED_MARKET_VALUES_KEYS[chainId]?.[fixedAddress];

    if (!prebuiltHashedKeys) {
      throw new Error(
        `No pre-built hashed market keys found for the market ${fixedAddress}. Run \`yarn prebuild\` to generate them.`
      );
    }

    const keys = {
      ...prebuiltHashedKeys,
    };

    request[`${marketAddress}-dataStore`] = {
      contractAddress: dataStoreAddress,
      abi: DataStore.abi,
      calls: {
        longPoolAmount: {
          methodName: "getUint",
          params: [keys.longPoolAmount],
        },
        shortPoolAmount: {
          methodName: "getUint",
          params: [keys.shortPoolAmount],
        },
        positionImpactPoolAmount: {
          methodName: "getUint",
          params: [keys.positionImpactPoolAmount],
        },
        swapImpactPoolAmountLong: {
          methodName: "getUint",
          params: [keys.swapImpactPoolAmountLong],
        },
        swapImpactPoolAmountShort: {
          methodName: "getUint",
          params: [keys.swapImpactPoolAmountShort],
        },
        longInterestUsingLongToken: {
          methodName: "getUint",
          params: [keys.longInterestUsingLongToken],
        },
        longInterestUsingShortToken: {
          methodName: "getUint",
          params: [keys.longInterestUsingShortToken],
        },
        shortInterestUsingLongToken: {
          methodName: "getUint",
          params: [keys.shortInterestUsingLongToken],
        },
        shortInterestUsingShortToken: {
          methodName: "getUint",
          params: [keys.shortInterestUsingShortToken],
        },
        longInterestInTokensUsingLongToken: {
          methodName: "getUint",
          params: [keys.longInterestInTokensUsingLongToken],
        },
        longInterestInTokensUsingShortToken: {
          methodName: "getUint",
          params: [keys.longInterestInTokensUsingShortToken],
        },
        shortInterestInTokensUsingLongToken: {
          methodName: "getUint",
          params: [keys.shortInterestInTokensUsingLongToken],
        },
        shortInterestInTokensUsingShortToken: {
          methodName: "getUint",
          params: [keys.shortInterestInTokensUsingShortToken],
        },
      },
    };
  }

  return request;
}
