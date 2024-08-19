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

import { MarketsData } from "domain/synthetics/markets/types";
import { MarketValuesMulticallRequestConfig } from "domain/synthetics/markets/useMarketsInfoRequest";
import { getContractMarketPrices } from "domain/synthetics/markets/utils";
import { TokensData } from "domain/synthetics/tokens/types";

import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";

export async function buildMarketsValuesRequest({
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
}) {
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

    request[`${marketAddress}-dataStore`] = {
      contractAddress: dataStoreAddress,
      abi: DataStore.abi,
      shouldHashParams: true,
      calls: {
        longPoolAmount: {
          methodName: "getUint",
          params: [unhashedKeys.longPoolAmount],
        },
        shortPoolAmount: {
          methodName: "getUint",
          params: [unhashedKeys.shortPoolAmount],
        },
        positionImpactPoolAmount: {
          methodName: "getUint",
          params: [unhashedKeys.positionImpactPoolAmount],
        },
        swapImpactPoolAmountLong: {
          methodName: "getUint",
          params: [unhashedKeys.swapImpactPoolAmountLong],
        },
        swapImpactPoolAmountShort: {
          methodName: "getUint",
          params: [unhashedKeys.swapImpactPoolAmountShort],
        },
        claimableFundingAmountLong: account
          ? {
              methodName: "getUint",
              params: [unhashedKeys.claimableFundingAmountLong],
            }
          : undefined,
        claimableFundingAmountShort: account
          ? {
              methodName: "getUint",
              params: [unhashedKeys.claimableFundingAmountShort],
            }
          : undefined,
        longInterestUsingLongToken: {
          methodName: "getUint",
          params: [unhashedKeys.longInterestUsingLongToken],
        },
        longInterestUsingShortToken: {
          methodName: "getUint",
          params: [unhashedKeys.longInterestUsingShortToken],
        },
        shortInterestUsingLongToken: {
          methodName: "getUint",
          params: [unhashedKeys.shortInterestUsingLongToken],
        },
        shortInterestUsingShortToken: {
          methodName: "getUint",
          params: [unhashedKeys.shortInterestUsingShortToken],
        },
        longInterestInTokensUsingLongToken: {
          methodName: "getUint",
          params: [unhashedKeys.longInterestInTokensUsingLongToken],
        },
        longInterestInTokensUsingShortToken: {
          methodName: "getUint",
          params: [unhashedKeys.longInterestInTokensUsingShortToken],
        },
        shortInterestInTokensUsingLongToken: {
          methodName: "getUint",
          params: [unhashedKeys.shortInterestInTokensUsingLongToken],
        },
        shortInterestInTokensUsingShortToken: {
          methodName: "getUint",
          params: [unhashedKeys.shortInterestInTokensUsingShortToken],
        },
      },
    };
  }

  return request;
}
