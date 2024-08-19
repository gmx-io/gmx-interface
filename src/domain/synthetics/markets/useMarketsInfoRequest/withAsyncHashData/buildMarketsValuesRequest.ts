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

import type { MarketValuesMulticallRequestConfig } from "..";
import { TokensData } from "../../../tokens";
import type { MarketsData } from "../../types";
import { getContractMarketPrices } from "../../utils";

import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { hashDataMapAsync } from "lib/multicall/hashData/hashDataMapAsync";

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

  const promises = (marketsAddresses || []).map(async (marketAddress) => {
    const market = getByKey(marketsData, marketAddress)!;
    const marketPrices = getContractMarketPrices(tokensData!, market)!;

    if (!marketPrices) {
      // eslint-disable-next-line no-console
      console.warn("missed market prices", market);
      return;
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

    const hashedKeys = await hashDataMapAsync({
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
    });

    request[`${marketAddress}-dataStore`] = {
      contractAddress: dataStoreAddress,
      abi: DataStore.abi,
      calls: {
        longPoolAmount: {
          methodName: "getUint",
          params: [hashedKeys.longPoolAmount],
        },
        shortPoolAmount: {
          methodName: "getUint",
          params: [hashedKeys.shortPoolAmount],
        },
        positionImpactPoolAmount: {
          methodName: "getUint",
          params: [hashedKeys.positionImpactPoolAmount],
        },
        swapImpactPoolAmountLong: {
          methodName: "getUint",
          params: [hashedKeys.swapImpactPoolAmountLong],
        },
        swapImpactPoolAmountShort: {
          methodName: "getUint",
          params: [hashedKeys.swapImpactPoolAmountShort],
        },
        claimableFundingAmountLong: account
          ? {
              methodName: "getUint",
              params: [hashedKeys.claimableFundingAmountLong],
            }
          : undefined,
        claimableFundingAmountShort: account
          ? {
              methodName: "getUint",
              params: [hashedKeys.claimableFundingAmountShort],
            }
          : undefined,
        longInterestUsingLongToken: {
          methodName: "getUint",
          params: [hashedKeys.longInterestUsingLongToken],
        },
        longInterestUsingShortToken: {
          methodName: "getUint",
          params: [hashedKeys.longInterestUsingShortToken],
        },
        shortInterestUsingLongToken: {
          methodName: "getUint",
          params: [hashedKeys.shortInterestUsingLongToken],
        },
        shortInterestUsingShortToken: {
          methodName: "getUint",
          params: [hashedKeys.shortInterestUsingShortToken],
        },
        longInterestInTokensUsingLongToken: {
          methodName: "getUint",
          params: [hashedKeys.longInterestInTokensUsingLongToken],
        },
        longInterestInTokensUsingShortToken: {
          methodName: "getUint",
          params: [hashedKeys.longInterestInTokensUsingShortToken],
        },
        shortInterestInTokensUsingLongToken: {
          methodName: "getUint",
          params: [hashedKeys.shortInterestInTokensUsingLongToken],
        },
        shortInterestInTokensUsingShortToken: {
          methodName: "getUint",
          params: [hashedKeys.shortInterestInTokensUsingShortToken],
        },
      },
    };
  });

  await Promise.all(promises);

  return request;
}
