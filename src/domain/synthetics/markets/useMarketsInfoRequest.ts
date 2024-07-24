import { useMemo } from "react";
import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import {
  BORROWING_EXPONENT_FACTOR_KEY,
  BORROWING_FACTOR_KEY,
  CLAIMABLE_FUNDING_AMOUNT,
  FUNDING_DECREASE_FACTOR_PER_SECOND,
  FUNDING_EXPONENT_FACTOR_KEY,
  FUNDING_FACTOR_KEY,
  FUNDING_INCREASE_FACTOR_PER_SECOND,
  IS_MARKET_DISABLED_KEY,
  MAX_FUNDING_FACTOR_PER_SECOND,
  MAX_OPEN_INTEREST_KEY,
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  MAX_PNL_FACTOR_KEY,
  MAX_POOL_USD_FOR_DEPOSIT_KEY,
  MAX_POOL_AMOUNT_KEY,
  MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY,
  MAX_POSITION_IMPACT_FACTOR_KEY,
  MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY,
  MIN_COLLATERAL_FACTOR_KEY,
  MIN_FUNDING_FACTOR_PER_SECOND,
  MIN_POSITION_IMPACT_POOL_AMOUNT_KEY,
  OPEN_INTEREST_IN_TOKENS_KEY,
  OPEN_INTEREST_KEY,
  OPEN_INTEREST_RESERVE_FACTOR_KEY,
  POOL_AMOUNT_ADJUSTMENT_KEY,
  POOL_AMOUNT_KEY,
  POSITION_FEE_FACTOR_KEY,
  POSITION_IMPACT_EXPONENT_FACTOR_KEY,
  POSITION_IMPACT_FACTOR_KEY,
  POSITION_IMPACT_POOL_AMOUNT_KEY,
  POSITION_IMPACT_POOL_DISTRIBUTION_RATE_KEY,
  RESERVE_FACTOR_KEY,
  SWAP_FEE_FACTOR_KEY,
  SWAP_IMPACT_EXPONENT_FACTOR_KEY,
  SWAP_IMPACT_FACTOR_KEY,
  SWAP_IMPACT_POOL_AMOUNT_KEY,
  THRESHOLD_FOR_DECREASE_FUNDING,
  THRESHOLD_FOR_STABLE_FUNDING,
  VIRTUAL_MARKET_ID_KEY,
  VIRTUAL_TOKEN_ID_KEY,
} from "config/dataStore";
import { convertTokenAddress } from "config/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { hashDataMapAsync } from "lib/multicall/hashData/hashDataAsync";
import { getByKey } from "lib/objects";
import { TokensData, useTokensDataRequest } from "../tokens";
import type { MarketInfo, MarketsData, MarketsInfoData } from "./types";
import { useMarkets } from "./useMarkets";
import { getContractMarketPrices } from "./utils";

import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";

export type MarketsInfoResult = {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
};

/**
 * Updates frequently
 */
type MarketValues = Pick<
  MarketInfo,
  | "longInterestUsd"
  | "shortInterestUsd"
  | "longInterestInTokens"
  | "shortInterestInTokens"
  | "longPoolAmount"
  | "shortPoolAmount"
  | "poolValueMin"
  | "poolValueMax"
  | "totalBorrowingFees"
  | "positionImpactPoolAmount"
  | "swapImpactPoolAmountLong"
  | "swapImpactPoolAmountShort"
  | "pnlLongMax"
  | "pnlLongMin"
  | "pnlShortMax"
  | "pnlShortMin"
  | "netPnlMax"
  | "netPnlMin"
  | "claimableFundingAmountLong"
  | "claimableFundingAmountShort"
  | "borrowingFactorPerSecondForLongs"
  | "borrowingFactorPerSecondForShorts"
  | "fundingFactorPerSecond"
  | "longsPayShorts"
  | "virtualPoolAmountForLongToken"
  | "virtualPoolAmountForShortToken"
  | "virtualInventoryForPositions"
>;

/**
 * Updates seldom
 */
type MarketConfig = Pick<
  MarketInfo,
  | "isDisabled"
  | "maxLongPoolUsdForDeposit"
  | "maxShortPoolUsdForDeposit"
  | "maxLongPoolAmount"
  | "maxShortPoolAmount"
  | "longPoolAmountAdjustment"
  | "shortPoolAmountAdjustment"
  | "reserveFactorLong"
  | "reserveFactorShort"
  | "openInterestReserveFactorLong"
  | "openInterestReserveFactorShort"
  | "maxOpenInterestLong"
  | "maxOpenInterestShort"
  | "minPositionImpactPoolAmount"
  | "positionImpactPoolDistributionRate"
  | "borrowingFactorLong"
  | "borrowingFactorShort"
  | "borrowingExponentFactorLong"
  | "borrowingExponentFactorShort"
  | "fundingFactor"
  | "fundingExponentFactor"
  | "fundingIncreaseFactorPerSecond"
  | "fundingDecreaseFactorPerSecond"
  | "thresholdForDecreaseFunding"
  | "thresholdForStableFunding"
  | "minFundingFactorPerSecond"
  | "maxFundingFactorPerSecond"
  | "maxPnlFactorForTradersLong"
  | "maxPnlFactorForTradersShort"
  | "minCollateralFactor"
  | "minCollateralFactorForOpenInterestLong"
  | "minCollateralFactorForOpenInterestShort"
  | "positionFeeFactorForPositiveImpact"
  | "positionFeeFactorForNegativeImpact"
  | "positionImpactFactorPositive"
  | "positionImpactFactorNegative"
  | "maxPositionImpactFactorPositive"
  | "maxPositionImpactFactorNegative"
  | "maxPositionImpactFactorForLiquidations"
  | "positionImpactExponentFactor"
  | "swapFeeFactorForPositiveImpact"
  | "swapFeeFactorForNegativeImpact"
  | "swapImpactFactorPositive"
  | "swapImpactFactorNegative"
  | "swapImpactExponentFactor"
  | "virtualMarketId"
  | "virtualLongTokenId"
  | "virtualShortTokenId"
>;

type MarketValuesMulticallRequestConfig = MulticallRequestConfig<{
  [key: `${string}-reader`]: {
    calls: Record<
      "marketInfo" | "marketTokenPriceMax" | "marketTokenPriceMin",
      {
        methodName: string;
        params: any[];
      }
    >;
  };
  [key: `${string}-dataStore`]: {
    calls: Record<
      | "longPoolAmount"
      | "shortPoolAmount"
      | "positionImpactPoolAmount"
      | "swapImpactPoolAmountLong"
      | "swapImpactPoolAmountShort"
      | "claimableFundingAmountLong"
      | "claimableFundingAmountShort"
      | "longInterestUsingLongToken"
      | "longInterestUsingShortToken"
      | "shortInterestUsingLongToken"
      | "shortInterestUsingShortToken"
      | "longInterestInTokensUsingLongToken"
      | "longInterestInTokensUsingShortToken"
      | "shortInterestInTokensUsingLongToken"
      | "shortInterestInTokensUsingShortToken",
      {
        methodName: string;
        params: any[];
      }
    >;
  };
}>;

type MarketConfigMulticallRequestConfig = MulticallRequestConfig<{
  [key: `${string}-dataStore`]: {
    calls: Record<
      | "isDisabled"
      | "maxLongPoolAmount"
      | "maxShortPoolAmount"
      | "maxLongPoolUsdForDeposit"
      | "maxShortPoolUsdForDeposit"
      | "longPoolAmountAdjustment"
      | "shortPoolAmountAdjustment"
      | "reserveFactorLong"
      | "reserveFactorShort"
      | "openInterestReserveFactorLong"
      | "openInterestReserveFactorShort"
      | "maxOpenInterestLong"
      | "maxOpenInterestShort"
      | "minPositionImpactPoolAmount"
      | "positionImpactPoolDistributionRate"
      | "borrowingFactorLong"
      | "borrowingFactorShort"
      | "borrowingExponentFactorLong"
      | "borrowingExponentFactorShort"
      | "fundingFactor"
      | "fundingExponentFactor"
      | "fundingIncreaseFactorPerSecond"
      | "fundingDecreaseFactorPerSecond"
      | "thresholdForStableFunding"
      | "thresholdForDecreaseFunding"
      | "minFundingFactorPerSecond"
      | "maxFundingFactorPerSecond"
      | "maxPnlFactorForTradersLong"
      | "maxPnlFactorForTradersShort"
      | "positionFeeFactorForPositiveImpact"
      | "positionFeeFactorForNegativeImpact"
      | "positionImpactFactorPositive"
      | "positionImpactFactorNegative"
      | "maxPositionImpactFactorPositive"
      | "maxPositionImpactFactorNegative"
      | "maxPositionImpactFactorForLiquidations"
      | "minCollateralFactor"
      | "minCollateralFactorForOpenInterestLong"
      | "minCollateralFactorForOpenInterestShort"
      | "positionImpactExponentFactor"
      | "swapFeeFactorForPositiveImpact"
      | "swapFeeFactorForNegativeImpact"
      | "swapImpactFactorPositive"
      | "swapImpactFactorNegative"
      | "swapImpactExponentFactor"
      | "virtualMarketId"
      | "virtualLongTokenId"
      | "virtualShortTokenId",
      {
        methodName: string;
        params: any[];
      }
    >;
  };
}>;

export function useMarketsInfoRequest(chainId: number): MarketsInfoResult {
  const { address: account } = useAccount();
  const { marketsData, marketsAddresses } = useMarkets(chainId);
  const { tokensData } = useTokensDataRequest(chainId);

  const isDependenciesLoading = !marketsAddresses || !tokensData;

  const marketsValues = useMarketsValuesRequest({
    chainId,
    account,
    isDependenciesLoading,
    marketsAddresses,
    marketsData,
    tokensData,
  });

  const marketsConfigs = useMarketsConfigsRequest({
    chainId,
    isDependenciesLoading,
    marketsAddresses,
    marketsData,
  });

  const mergedData = useMemo(() => {
    if (!marketsValues.data || !marketsConfigs.data || !marketsAddresses) {
      return undefined;
    }

    // Manual merging to avoid cloning tokens as they are sometimes compared by reference
    const data: MarketsInfoData = {};
    for (const marketAddress of marketsAddresses) {
      const market = marketsData?.[marketAddress];
      const marketValues = marketsValues.data[marketAddress];
      const marketConfig = marketsConfigs.data[marketAddress];

      if (!market || !marketValues || !marketConfig) {
        continue;
      }

      const longToken = getByKey(tokensData!, market.longTokenAddress)!;
      const shortToken = getByKey(tokensData!, market.shortTokenAddress)!;
      const indexToken = getByKey(tokensData!, convertTokenAddress(chainId, market.indexTokenAddress, "native"))!;

      const fullMarketInfo: MarketInfo = {
        ...marketValues,
        ...marketConfig,
        ...market,
        longToken,
        shortToken,
        indexToken,
      };

      data[marketAddress] = fullMarketInfo;
    }

    return data as MarketsInfoData;
  }, [marketsValues.data, marketsConfigs.data, marketsAddresses, marketsData, tokensData, chainId]);

  return {
    marketsInfoData: isDependenciesLoading ? undefined : mergedData,
    tokensData,
  };
}

function useMarketsValuesRequest({
  chainId,
  account,
  isDependenciesLoading,
  marketsAddresses,
  marketsData,
  tokensData,
}: {
  chainId: number;
  account: string | undefined;
  isDependenciesLoading: boolean;
  marketsAddresses: string[] | undefined;
  marketsData: MarketsData | undefined;
  tokensData: TokensData | undefined;
}) {
  const dataStoreAddress = getContract(chainId, "DataStore");

  const marketsValuesQuery = useMulticall(chainId, "useMarketsValuesRequest", {
    key: !isDependenciesLoading && marketsAddresses!.length > 0 && [marketsAddresses, account],

    refreshInterval: 5000,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: async () => {
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
          contractAddress: getContract(chainId, "SyntheticsReader"),
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
    },
    parseResponse: (res) => {
      const result = marketsAddresses!.reduce(
        (acc, marketAddress) => {
          const readerErrors = res.errors[`${marketAddress}-reader`];
          const dataStoreErrors = res.errors[`${marketAddress}-dataStore`];

          const readerValues = res.data[`${marketAddress}-reader`];
          const dataStoreValues = res.data[`${marketAddress}-dataStore`];

          // Skip invalid market
          if (!readerValues || !dataStoreValues || readerErrors || dataStoreErrors) {
            // eslint-disable-next-line no-console
            console.log("market info error", marketAddress, readerErrors, dataStoreErrors, readerValues);
            return acc;
          }
          const market = getByKey(marketsData, marketAddress)!;
          const marketDivisor = market.isSameCollaterals ? 2n : 1n;

          const longInterestUsingLongToken =
            BigInt(dataStoreValues.longInterestUsingLongToken.returnValues[0]) / marketDivisor;
          const longInterestUsingShortToken =
            BigInt(dataStoreValues.longInterestUsingShortToken.returnValues[0]) / marketDivisor;
          const shortInterestUsingLongToken =
            BigInt(dataStoreValues.shortInterestUsingLongToken.returnValues[0]) / marketDivisor;
          const shortInterestUsingShortToken =
            BigInt(dataStoreValues.shortInterestUsingShortToken.returnValues[0]) / marketDivisor;

          const longInterestUsd = longInterestUsingLongToken + longInterestUsingShortToken;
          const shortInterestUsd = shortInterestUsingLongToken + shortInterestUsingShortToken;

          const longInterestInTokensUsingLongToken =
            BigInt(dataStoreValues.longInterestInTokensUsingLongToken.returnValues[0]) / marketDivisor;
          const longInterestInTokensUsingShortToken =
            BigInt(dataStoreValues.longInterestInTokensUsingShortToken.returnValues[0]) / marketDivisor;
          const shortInterestInTokensUsingLongToken =
            BigInt(dataStoreValues.shortInterestInTokensUsingLongToken.returnValues[0]) / marketDivisor;
          const shortInterestInTokensUsingShortToken =
            BigInt(dataStoreValues.shortInterestInTokensUsingShortToken.returnValues[0]) / marketDivisor;

          const longInterestInTokens = longInterestInTokensUsingLongToken + longInterestInTokensUsingShortToken;
          const shortInterestInTokens = shortInterestInTokensUsingLongToken + shortInterestInTokensUsingShortToken;

          const { nextFunding, virtualInventory } = readerValues.marketInfo.returnValues;

          const [, poolValueInfoMin] = readerValues.marketTokenPriceMin.returnValues as [
            unknown,
            {
              poolValue: bigint;

              longPnl: bigint;
              shortPnl: bigint;
              netPnl: bigint;
            },
          ];

          const [, poolValueInfoMax] = readerValues.marketTokenPriceMax.returnValues as [
            unknown,
            { poolValue: bigint; totalBorrowingFees: bigint; longPnl: bigint; shortPnl: bigint; netPnl: bigint },
          ];

          acc[marketAddress] = {
            longInterestUsd,
            shortInterestUsd,
            longInterestInTokens,
            shortInterestInTokens,
            longPoolAmount: dataStoreValues.longPoolAmount.returnValues[0] / marketDivisor,
            shortPoolAmount: dataStoreValues.shortPoolAmount.returnValues[0] / marketDivisor,
            poolValueMin: poolValueInfoMin.poolValue,
            poolValueMax: poolValueInfoMax.poolValue,
            totalBorrowingFees: poolValueInfoMax.totalBorrowingFees,
            positionImpactPoolAmount: dataStoreValues.positionImpactPoolAmount.returnValues[0],
            swapImpactPoolAmountLong: dataStoreValues.swapImpactPoolAmountLong.returnValues[0],
            swapImpactPoolAmountShort: dataStoreValues.swapImpactPoolAmountShort.returnValues[0],
            pnlLongMax: poolValueInfoMax.longPnl,
            pnlLongMin: poolValueInfoMin.longPnl,
            pnlShortMax: poolValueInfoMax.shortPnl,
            pnlShortMin: poolValueInfoMin.shortPnl,
            netPnlMax: poolValueInfoMax.netPnl,
            netPnlMin: poolValueInfoMin.netPnl,

            claimableFundingAmountLong: dataStoreValues.claimableFundingAmountLong
              ? dataStoreValues.claimableFundingAmountLong?.returnValues[0] / marketDivisor
              : undefined,

            claimableFundingAmountShort: dataStoreValues.claimableFundingAmountShort
              ? dataStoreValues.claimableFundingAmountShort?.returnValues[0] / marketDivisor
              : undefined,

            borrowingFactorPerSecondForLongs: readerValues.marketInfo.returnValues.borrowingFactorPerSecondForLongs,
            borrowingFactorPerSecondForShorts: readerValues.marketInfo.returnValues.borrowingFactorPerSecondForShorts,

            fundingFactorPerSecond: nextFunding.fundingFactorPerSecond,
            longsPayShorts: nextFunding.longsPayShorts,

            virtualPoolAmountForLongToken: virtualInventory.virtualPoolAmountForLongToken,
            virtualPoolAmountForShortToken: virtualInventory.virtualPoolAmountForShortToken,
            virtualInventoryForPositions: virtualInventory.virtualInventoryForPositions,
          };

          return acc;
        },
        {} as {
          [marketAddress: string]: MarketValues;
        }
      );

      return result;
    },
  });

  return marketsValuesQuery;
}

function useMarketsConfigsRequest({
  chainId,
  isDependenciesLoading,
  marketsAddresses,
  marketsData,
}: {
  chainId: number;
  isDependenciesLoading: boolean;
  marketsAddresses: string[] | undefined;
  marketsData: MarketsData | undefined;
}) {
  const dataStoreAddress = getContract(chainId, "DataStore");

  const marketsConfigsQuery = useMulticall(chainId, "useMarketsConfigsRequest", {
    key: !isDependenciesLoading && marketsAddresses!.length > 0 && [marketsAddresses],

    refreshInterval: 60_000,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: async () => {
      const request: MarketConfigMulticallRequestConfig = {};
      const promises = (marketsAddresses || []).map(async (marketAddress) => {
        const market = getByKey(marketsData, marketAddress)!;

        const hashedKeys = await hashDataMapAsync({
          isDisabled: [
            ["bytes32", "address"],
            [IS_MARKET_DISABLED_KEY, marketAddress],
          ],
          maxLongPoolAmount: [
            ["bytes32", "address", "address"],
            [MAX_POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
          ],
          maxShortPoolAmount: [
            ["bytes32", "address", "address"],
            [MAX_POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
          ],
          maxLongPoolUsdForDeposit: [
            ["bytes32", "address", "address"],
            [MAX_POOL_USD_FOR_DEPOSIT_KEY, marketAddress, market.longTokenAddress],
          ],
          maxShortPoolUsdForDeposit: [
            ["bytes32", "address", "address"],
            [MAX_POOL_USD_FOR_DEPOSIT_KEY, marketAddress, market.shortTokenAddress],
          ],
          longPoolAmountAdjustment: [
            ["bytes32", "address", "address"],
            [POOL_AMOUNT_ADJUSTMENT_KEY, marketAddress, market.longTokenAddress],
          ],
          shortPoolAmountAdjustment: [
            ["bytes32", "address", "address"],
            [POOL_AMOUNT_ADJUSTMENT_KEY, marketAddress, market.shortTokenAddress],
          ],
          reserveFactorLong: [
            ["bytes32", "address", "bool"],
            [RESERVE_FACTOR_KEY, marketAddress, true],
          ],
          reserveFactorShort: [
            ["bytes32", "address", "bool"],
            [RESERVE_FACTOR_KEY, marketAddress, false],
          ],
          openInterestReserveFactorLong: [
            ["bytes32", "address", "bool"],
            [OPEN_INTEREST_RESERVE_FACTOR_KEY, marketAddress, true],
          ],
          openInterestReserveFactorShort: [
            ["bytes32", "address", "bool"],
            [OPEN_INTEREST_RESERVE_FACTOR_KEY, marketAddress, false],
          ],
          maxOpenInterestLong: [
            ["bytes32", "address", "bool"],
            [MAX_OPEN_INTEREST_KEY, marketAddress, true],
          ],
          maxOpenInterestShort: [
            ["bytes32", "address", "bool"],
            [MAX_OPEN_INTEREST_KEY, marketAddress, false],
          ],
          minPositionImpactPoolAmount: [
            ["bytes32", "address"],
            [MIN_POSITION_IMPACT_POOL_AMOUNT_KEY, marketAddress],
          ],
          positionImpactPoolDistributionRate: [
            ["bytes32", "address"],
            [POSITION_IMPACT_POOL_DISTRIBUTION_RATE_KEY, marketAddress],
          ],
          borrowingFactorLong: [
            ["bytes32", "address", "bool"],
            [BORROWING_FACTOR_KEY, marketAddress, true],
          ],
          borrowingFactorShort: [
            ["bytes32", "address", "bool"],
            [BORROWING_FACTOR_KEY, marketAddress, false],
          ],
          borrowingExponentFactorLong: [
            ["bytes32", "address", "bool"],
            [BORROWING_EXPONENT_FACTOR_KEY, marketAddress, true],
          ],
          borrowingExponentFactorShort: [
            ["bytes32", "address", "bool"],
            [BORROWING_EXPONENT_FACTOR_KEY, marketAddress, false],
          ],
          fundingFactor: [
            ["bytes32", "address"],
            [FUNDING_FACTOR_KEY, marketAddress],
          ],
          fundingExponentFactor: [
            ["bytes32", "address"],
            [FUNDING_EXPONENT_FACTOR_KEY, marketAddress],
          ],
          fundingIncreaseFactorPerSecond: [
            ["bytes32", "address"],
            [FUNDING_INCREASE_FACTOR_PER_SECOND, marketAddress],
          ],
          fundingDecreaseFactorPerSecond: [
            ["bytes32", "address"],
            [FUNDING_DECREASE_FACTOR_PER_SECOND, marketAddress],
          ],
          thresholdForStableFunding: [
            ["bytes32", "address"],
            [THRESHOLD_FOR_STABLE_FUNDING, marketAddress],
          ],
          thresholdForDecreaseFunding: [
            ["bytes32", "address"],
            [THRESHOLD_FOR_DECREASE_FUNDING, marketAddress],
          ],
          minFundingFactorPerSecond: [
            ["bytes32", "address"],
            [MIN_FUNDING_FACTOR_PER_SECOND, marketAddress],
          ],
          maxFundingFactorPerSecond: [
            ["bytes32", "address"],
            [MAX_FUNDING_FACTOR_PER_SECOND, marketAddress],
          ],
          maxPnlFactorForTradersLong: [
            ["bytes32", "bytes32", "address", "bool"],
            [MAX_PNL_FACTOR_KEY, MAX_PNL_FACTOR_FOR_TRADERS_KEY, marketAddress, true],
          ],
          maxPnlFactorForTradersShort: [
            ["bytes32", "bytes32", "address", "bool"],
            [MAX_PNL_FACTOR_KEY, MAX_PNL_FACTOR_FOR_TRADERS_KEY, marketAddress, false],
          ],
          positionFeeFactorForPositiveImpact: [
            ["bytes32", "address", "bool"],
            [POSITION_FEE_FACTOR_KEY, marketAddress, true],
          ],
          positionFeeFactorForNegativeImpact: [
            ["bytes32", "address", "bool"],
            [POSITION_FEE_FACTOR_KEY, marketAddress, false],
          ],
          positionImpactFactorPositive: [
            ["bytes32", "address", "bool"],
            [POSITION_IMPACT_FACTOR_KEY, marketAddress, true],
          ],
          positionImpactFactorNegative: [
            ["bytes32", "address", "bool"],
            [POSITION_IMPACT_FACTOR_KEY, marketAddress, false],
          ],
          maxPositionImpactFactorPositive: [
            ["bytes32", "address", "bool"],
            [MAX_POSITION_IMPACT_FACTOR_KEY, marketAddress, true],
          ],
          maxPositionImpactFactorNegative: [
            ["bytes32", "address", "bool"],
            [MAX_POSITION_IMPACT_FACTOR_KEY, marketAddress, false],
          ],
          maxPositionImpactFactorForLiquidations: [
            ["bytes32", "address"],
            [MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY, marketAddress],
          ],
          minCollateralFactor: [
            ["bytes32", "address"],
            [MIN_COLLATERAL_FACTOR_KEY, marketAddress],
          ],
          minCollateralFactorForOpenInterestLong: [
            ["bytes32", "address", "bool"],
            [MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY, marketAddress, true],
          ],
          minCollateralFactorForOpenInterestShort: [
            ["bytes32", "address", "bool"],
            [MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY, marketAddress, false],
          ],
          positionImpactExponentFactor: [
            ["bytes32", "address"],
            [POSITION_IMPACT_EXPONENT_FACTOR_KEY, marketAddress],
          ],
          swapFeeFactorForPositiveImpact: [
            ["bytes32", "address", "bool"],
            [SWAP_FEE_FACTOR_KEY, marketAddress, true],
          ],
          swapFeeFactorForNegativeImpact: [
            ["bytes32", "address", "bool"],
            [SWAP_FEE_FACTOR_KEY, marketAddress, false],
          ],
          swapImpactFactorPositive: [
            ["bytes32", "address", "bool"],
            [SWAP_IMPACT_FACTOR_KEY, marketAddress, true],
          ],
          swapImpactFactorNegative: [
            ["bytes32", "address", "bool"],
            [SWAP_IMPACT_FACTOR_KEY, marketAddress, false],
          ],
          swapImpactExponentFactor: [
            ["bytes32", "address"],
            [SWAP_IMPACT_EXPONENT_FACTOR_KEY, marketAddress],
          ],
          virtualMarketId: [
            ["bytes32", "address"],
            [VIRTUAL_MARKET_ID_KEY, marketAddress],
          ],
          virtualLongTokenId: [
            ["bytes32", "address"],
            [VIRTUAL_TOKEN_ID_KEY, market.longTokenAddress],
          ],
          virtualShortTokenId: [
            ["bytes32", "address"],
            [VIRTUAL_TOKEN_ID_KEY, market.shortTokenAddress],
          ],
        });

        request[`${marketAddress}-dataStore`] = {
          contractAddress: dataStoreAddress,
          abi: DataStore.abi,
          calls: {
            isDisabled: {
              methodName: "getBool",
              params: [hashedKeys.isDisabled],
            },
            maxLongPoolAmount: {
              methodName: "getUint",
              params: [hashedKeys.maxLongPoolAmount],
            },
            maxShortPoolAmount: {
              methodName: "getUint",
              params: [hashedKeys.maxShortPoolAmount],
            },
            maxLongPoolUsdForDeposit: {
              methodName: "getUint",
              params: [hashedKeys.maxLongPoolUsdForDeposit],
            },
            maxShortPoolUsdForDeposit: {
              methodName: "getUint",
              params: [hashedKeys.maxShortPoolUsdForDeposit],
            },
            longPoolAmountAdjustment: {
              methodName: "getUint",
              params: [hashedKeys.longPoolAmountAdjustment],
            },
            shortPoolAmountAdjustment: {
              methodName: "getUint",
              params: [hashedKeys.shortPoolAmountAdjustment],
            },
            reserveFactorLong: {
              methodName: "getUint",
              params: [hashedKeys.reserveFactorLong],
            },
            reserveFactorShort: {
              methodName: "getUint",
              params: [hashedKeys.reserveFactorShort],
            },
            openInterestReserveFactorLong: {
              methodName: "getUint",
              params: [hashedKeys.openInterestReserveFactorLong],
            },
            openInterestReserveFactorShort: {
              methodName: "getUint",
              params: [hashedKeys.openInterestReserveFactorShort],
            },
            maxOpenInterestLong: {
              methodName: "getUint",
              params: [hashedKeys.maxOpenInterestLong],
            },
            maxOpenInterestShort: {
              methodName: "getUint",
              params: [hashedKeys.maxOpenInterestShort],
            },
            minPositionImpactPoolAmount: {
              methodName: "getUint",
              params: [hashedKeys.minPositionImpactPoolAmount],
            },
            positionImpactPoolDistributionRate: {
              methodName: "getUint",
              params: [hashedKeys.positionImpactPoolDistributionRate],
            },
            borrowingFactorLong: {
              methodName: "getUint",
              params: [hashedKeys.borrowingFactorLong],
            },
            borrowingFactorShort: {
              methodName: "getUint",
              params: [hashedKeys.borrowingFactorShort],
            },
            borrowingExponentFactorLong: {
              methodName: "getUint",
              params: [hashedKeys.borrowingExponentFactorLong],
            },
            borrowingExponentFactorShort: {
              methodName: "getUint",
              params: [hashedKeys.borrowingExponentFactorShort],
            },
            fundingFactor: {
              methodName: "getUint",
              params: [hashedKeys.fundingFactor],
            },
            fundingExponentFactor: {
              methodName: "getUint",
              params: [hashedKeys.fundingExponentFactor],
            },
            fundingIncreaseFactorPerSecond: {
              methodName: "getUint",
              params: [hashedKeys.fundingIncreaseFactorPerSecond],
            },
            fundingDecreaseFactorPerSecond: {
              methodName: "getUint",
              params: [hashedKeys.fundingDecreaseFactorPerSecond],
            },
            thresholdForStableFunding: {
              methodName: "getUint",
              params: [hashedKeys.thresholdForStableFunding],
            },
            thresholdForDecreaseFunding: {
              methodName: "getUint",
              params: [hashedKeys.thresholdForDecreaseFunding],
            },
            minFundingFactorPerSecond: {
              methodName: "getUint",
              params: [hashedKeys.minFundingFactorPerSecond],
            },
            maxFundingFactorPerSecond: {
              methodName: "getUint",
              params: [hashedKeys.maxFundingFactorPerSecond],
            },
            maxPnlFactorForTradersLong: {
              methodName: "getUint",
              params: [hashedKeys.maxPnlFactorForTradersLong],
            },
            maxPnlFactorForTradersShort: {
              methodName: "getUint",
              params: [hashedKeys.maxPnlFactorForTradersShort],
            },
            positionFeeFactorForPositiveImpact: {
              methodName: "getUint",
              params: [hashedKeys.positionFeeFactorForPositiveImpact],
            },
            positionFeeFactorForNegativeImpact: {
              methodName: "getUint",
              params: [hashedKeys.positionFeeFactorForNegativeImpact],
            },
            positionImpactFactorPositive: {
              methodName: "getUint",
              params: [hashedKeys.positionImpactFactorPositive],
            },
            positionImpactFactorNegative: {
              methodName: "getUint",
              params: [hashedKeys.positionImpactFactorNegative],
            },
            maxPositionImpactFactorPositive: {
              methodName: "getUint",
              params: [hashedKeys.maxPositionImpactFactorPositive],
            },
            maxPositionImpactFactorNegative: {
              methodName: "getUint",
              params: [hashedKeys.maxPositionImpactFactorNegative],
            },
            maxPositionImpactFactorForLiquidations: {
              methodName: "getUint",
              params: [hashedKeys.maxPositionImpactFactorForLiquidations],
            },
            minCollateralFactor: {
              methodName: "getUint",
              params: [hashedKeys.minCollateralFactor],
            },
            minCollateralFactorForOpenInterestLong: {
              methodName: "getUint",
              params: [hashedKeys.minCollateralFactorForOpenInterestLong],
            },
            minCollateralFactorForOpenInterestShort: {
              methodName: "getUint",
              params: [hashedKeys.minCollateralFactorForOpenInterestShort],
            },
            positionImpactExponentFactor: {
              methodName: "getUint",
              params: [hashedKeys.positionImpactExponentFactor],
            },
            swapFeeFactorForPositiveImpact: {
              methodName: "getUint",
              params: [hashedKeys.swapFeeFactorForPositiveImpact],
            },
            swapFeeFactorForNegativeImpact: {
              methodName: "getUint",
              params: [hashedKeys.swapFeeFactorForNegativeImpact],
            },
            swapImpactFactorPositive: {
              methodName: "getUint",
              params: [hashedKeys.swapImpactFactorPositive],
            },
            swapImpactFactorNegative: {
              methodName: "getUint",
              params: [hashedKeys.swapImpactFactorNegative],
            },
            swapImpactExponentFactor: {
              methodName: "getUint",
              params: [hashedKeys.swapImpactExponentFactor],
            },
            virtualMarketId: {
              methodName: "getBytes32",
              params: [hashedKeys.virtualMarketId],
            },
            virtualShortTokenId: {
              methodName: "getBytes32",
              params: [hashedKeys.virtualShortTokenId],
            },
            virtualLongTokenId: {
              methodName: "getBytes32",
              params: [hashedKeys.virtualLongTokenId],
            },
          },
        };
      });

      await Promise.all(promises);

      return request;
    },
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

          acc[marketAddress] = {
            isDisabled: dataStoreValues.isDisabled.returnValues[0],
            maxLongPoolUsdForDeposit: dataStoreValues.maxLongPoolUsdForDeposit.returnValues[0],
            maxShortPoolUsdForDeposit: dataStoreValues.maxShortPoolUsdForDeposit.returnValues[0],
            maxLongPoolAmount: dataStoreValues.maxLongPoolAmount.returnValues[0],
            maxShortPoolAmount: dataStoreValues.maxShortPoolAmount.returnValues[0],
            longPoolAmountAdjustment: dataStoreValues.longPoolAmountAdjustment.returnValues[0],
            shortPoolAmountAdjustment: dataStoreValues.shortPoolAmountAdjustment.returnValues[0],
            reserveFactorLong: dataStoreValues.reserveFactorLong.returnValues[0],
            reserveFactorShort: dataStoreValues.reserveFactorShort.returnValues[0],
            openInterestReserveFactorLong: dataStoreValues.openInterestReserveFactorLong.returnValues[0],
            openInterestReserveFactorShort: dataStoreValues.openInterestReserveFactorShort.returnValues[0],
            maxOpenInterestLong: dataStoreValues.maxOpenInterestLong.returnValues[0],
            maxOpenInterestShort: dataStoreValues.maxOpenInterestShort.returnValues[0],
            minPositionImpactPoolAmount: dataStoreValues.minPositionImpactPoolAmount.returnValues[0],
            positionImpactPoolDistributionRate: dataStoreValues.positionImpactPoolDistributionRate.returnValues[0],
            borrowingFactorLong: dataStoreValues.borrowingFactorLong.returnValues[0],
            borrowingFactorShort: dataStoreValues.borrowingFactorShort.returnValues[0],
            borrowingExponentFactorLong: dataStoreValues.borrowingExponentFactorLong.returnValues[0],
            borrowingExponentFactorShort: dataStoreValues.borrowingExponentFactorShort.returnValues[0],
            fundingFactor: dataStoreValues.fundingFactor.returnValues[0],
            fundingExponentFactor: dataStoreValues.fundingExponentFactor.returnValues[0],
            fundingIncreaseFactorPerSecond: dataStoreValues.fundingIncreaseFactorPerSecond.returnValues[0],
            fundingDecreaseFactorPerSecond: dataStoreValues.fundingDecreaseFactorPerSecond.returnValues[0],
            thresholdForDecreaseFunding: dataStoreValues.thresholdForDecreaseFunding.returnValues[0],
            thresholdForStableFunding: dataStoreValues.thresholdForStableFunding.returnValues[0],
            minFundingFactorPerSecond: dataStoreValues.minFundingFactorPerSecond.returnValues[0],
            maxFundingFactorPerSecond: dataStoreValues.maxFundingFactorPerSecond.returnValues[0],

            maxPnlFactorForTradersLong: dataStoreValues.maxPnlFactorForTradersLong.returnValues[0],
            maxPnlFactorForTradersShort: dataStoreValues.maxPnlFactorForTradersShort.returnValues[0],

            minCollateralFactor: dataStoreValues.minCollateralFactor.returnValues[0],
            minCollateralFactorForOpenInterestLong:
              dataStoreValues.minCollateralFactorForOpenInterestLong.returnValues[0],

            minCollateralFactorForOpenInterestShort:
              dataStoreValues.minCollateralFactorForOpenInterestShort.returnValues[0],

            positionFeeFactorForPositiveImpact: dataStoreValues.positionFeeFactorForPositiveImpact.returnValues[0],
            positionFeeFactorForNegativeImpact: dataStoreValues.positionFeeFactorForNegativeImpact.returnValues[0],
            positionImpactFactorPositive: dataStoreValues.positionImpactFactorPositive.returnValues[0],
            positionImpactFactorNegative: dataStoreValues.positionImpactFactorNegative.returnValues[0],
            maxPositionImpactFactorPositive: dataStoreValues.maxPositionImpactFactorPositive.returnValues[0],
            maxPositionImpactFactorNegative: dataStoreValues.maxPositionImpactFactorNegative.returnValues[0],
            maxPositionImpactFactorForLiquidations:
              dataStoreValues.maxPositionImpactFactorForLiquidations.returnValues[0],
            positionImpactExponentFactor: dataStoreValues.positionImpactExponentFactor.returnValues[0],
            swapFeeFactorForPositiveImpact: dataStoreValues.swapFeeFactorForPositiveImpact.returnValues[0],
            swapFeeFactorForNegativeImpact: dataStoreValues.swapFeeFactorForNegativeImpact.returnValues[0],
            swapImpactFactorPositive: dataStoreValues.swapImpactFactorPositive.returnValues[0],
            swapImpactFactorNegative: dataStoreValues.swapImpactFactorNegative.returnValues[0],
            swapImpactExponentFactor: dataStoreValues.swapImpactExponentFactor.returnValues[0],

            virtualMarketId: dataStoreValues.virtualMarketId.returnValues[0],
            virtualLongTokenId: dataStoreValues.virtualLongTokenId.returnValues[0],
            virtualShortTokenId: dataStoreValues.virtualShortTokenId.returnValues[0],
          };

          return acc;
        },
        {} as {
          [marketAddress: string]: MarketConfig;
        }
      );

      return result;
    },
  });

  return marketsConfigsQuery;
}
