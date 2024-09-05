import {
  CLAIMABLE_FUNDING_AMOUNT,
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  OPEN_INTEREST_IN_TOKENS_KEY,
  OPEN_INTEREST_KEY,
  POOL_AMOUNT_KEY,
  POSITION_IMPACT_POOL_AMOUNT_KEY,
  SWAP_IMPACT_POOL_AMOUNT_KEY,
} from "config/dataStore";
import { getByKey } from "lib/objects";
import { hashDataMap } from "lib/multicall/hashDataMap";

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
    account,
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
    const market = getByKey(marketsData, marketAddress)!;
    const marketPrices = getContractMarketPrices(tokensData!, market)!;

    if (!marketPrices) {
      // eslint-disable-next-line no-console
      console.warn("missed market prices", market);
      continue;
    }

    const marketProps = {
      marketToken: market.marketTokenAddress,
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
          params: [dataStoreAddress, marketPrices, marketAddress],
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

    const unhashedKeys = {
      longPoolAmount: [
        ["bytes32", "address", "address"],
        [POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
      ],
      shortPoolAmount: [
        ["bytes32", "address", "address"],
        [POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
      ],
      positionImpactPoolAmount: [
        ["bytes32", "address"],
        [POSITION_IMPACT_POOL_AMOUNT_KEY, marketAddress],
      ],
      swapImpactPoolAmountLong: [
        ["bytes32", "address", "address"],
        [SWAP_IMPACT_POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
      ],
      swapImpactPoolAmountShort: [
        ["bytes32", "address", "address"],
        [SWAP_IMPACT_POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
      ],
      claimableFundingAmountLong: account
        ? [
            ["bytes32", "address", "address", "address"],
            [CLAIMABLE_FUNDING_AMOUNT, marketAddress, market.longTokenAddress, account],
          ]
        : undefined,
      claimableFundingAmountShort: account
        ? [
            ["bytes32", "address", "address", "address"],
            [CLAIMABLE_FUNDING_AMOUNT, marketAddress, market.shortTokenAddress, account],
          ]
        : undefined,
      longInterestUsingLongToken: [
        ["bytes32", "address", "address", "bool"],
        [OPEN_INTEREST_KEY, marketAddress, market.longTokenAddress, true],
      ],
      longInterestUsingShortToken: [
        ["bytes32", "address", "address", "bool"],
        [OPEN_INTEREST_KEY, marketAddress, market.shortTokenAddress, true],
      ],
      shortInterestUsingLongToken: [
        ["bytes32", "address", "address", "bool"],
        [OPEN_INTEREST_KEY, marketAddress, market.longTokenAddress, false],
      ],
      shortInterestUsingShortToken: [
        ["bytes32", "address", "address", "bool"],
        [OPEN_INTEREST_KEY, marketAddress, market.shortTokenAddress, false],
      ],
      longInterestInTokensUsingLongToken: [
        ["bytes32", "address", "address", "bool"],
        [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.longTokenAddress, true],
      ],
      longInterestInTokensUsingShortToken: [
        ["bytes32", "address", "address", "bool"],
        [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.shortTokenAddress, true],
      ],
      shortInterestInTokensUsingLongToken: [
        ["bytes32", "address", "address", "bool"],
        [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.longTokenAddress, false],
      ],
      shortInterestInTokensUsingShortToken: [
        ["bytes32", "address", "address", "bool"],
        [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.shortTokenAddress, false],
      ],
    };

    const prebuiltHashedKeys = HASHED_MARKET_VALUES_KEYS[chainId]?.[marketAddress];

    if (!prebuiltHashedKeys) {
      // eslint-disable-next-line no-console
      console.warn(`No prebuilt hashed market keys found for market ${marketAddress}`);
    }

    const shouldUsePrebuiltHashedKeys = prebuiltHashedKeys !== undefined;
    const keys = shouldUsePrebuiltHashedKeys
      ? {
          ...prebuiltHashedKeys,
          ...(account
            ? hashDataMap({
                claimableFundingAmountLong: [
                  ["bytes32", "address", "address", "address"],
                  [CLAIMABLE_FUNDING_AMOUNT, marketAddress, market.longTokenAddress, account],
                ],
                claimableFundingAmountShort: [
                  ["bytes32", "address", "address", "address"],
                  [CLAIMABLE_FUNDING_AMOUNT, marketAddress, market.shortTokenAddress, account],
                ],
              })
            : {}),
        }
      : unhashedKeys;

    request[`${marketAddress}-dataStore`] = {
      contractAddress: dataStoreAddress,
      abi: DataStore.abi,
      shouldHashParams: !shouldUsePrebuiltHashedKeys,
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
        claimableFundingAmountLong: account
          ? {
              methodName: "getUint",
              params: [keys.claimableFundingAmountLong],
            }
          : undefined,
        claimableFundingAmountShort: account
          ? {
              methodName: "getUint",
              params: [keys.claimableFundingAmountShort],
            }
          : undefined,
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
