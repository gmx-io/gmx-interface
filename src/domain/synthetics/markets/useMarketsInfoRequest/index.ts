import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { getByKey } from "lib/objects";
import { CONFIG_UPDATE_INTERVAL, FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import type { UiContractsChain, UiSourceChain } from "sdk/configs/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import { MarketConfig, MarketValues } from "sdk/modules/markets/types";
import type { MarketInfo, MarketsData, MarketsInfoData } from "sdk/types/markets";

import { useGmxAccountTokensDataRequest } from "components/Synthetics/GmxAccountModal/hooks";

import { TokensData, TokensDataResult, useTokensDataRequest } from "../../tokens";
import { useClaimableFundingDataRequest } from "../useClaimableFundingDataRequest";
import { useMarkets } from "../useMarkets";
import { getMarketDivisor } from "../utils";
import { buildMarketsConfigsRequest } from "./buildMarketsConfigsRequest";
import { buildMarketsValuesRequest } from "./buildMarketsValuesRequest";
import { useFastMarketsInfoRequest } from "./useFastMarketsInfoRequest";

export type MarketsInfoResult = {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  walletTokensData?: TokensData;
  pricesUpdatedAt?: number;
  isBalancesLoaded?: boolean;
  error?: Error;
};

export function useMarketsInfoRequest(chainId: UiContractsChain, srcChainId?: UiSourceChain): MarketsInfoResult {
  const { marketsData, marketsAddresses } = useMarkets(chainId);

  const settlementChainTokensDataResult = useTokensDataRequest(chainId);
  const gmxAccountTokensDataResult = useGmxAccountTokensDataRequest(chainId);

  const walletTokensDataResult: TokensDataResult | undefined =
    srcChainId === undefined ? settlementChainTokensDataResult : undefined;
  const walletTokensData = walletTokensDataResult?.tokensData;

  const {
    tokensData,
    pricesUpdatedAt,
    error: tokensDataError,
    isBalancesLoaded,
  } = srcChainId ? gmxAccountTokensDataResult : settlementChainTokensDataResult;

  const { claimableFundingData } = useClaimableFundingDataRequest(chainId);
  const { fastMarketInfoData } = useFastMarketsInfoRequest(chainId);

  const isDependenciesLoading = !marketsAddresses || !tokensData;

  const marketsValues = useMarketsValuesRequest({
    chainId,
    isDependenciesLoading,
    marketsAddresses,
    marketsData,
    tokensData,
  });

  const marketsConfigs = useMarketsConfigsRequest({
    chainId,
    isDependenciesLoading,
    marketsAddresses,
  });

  const mergedData = useMemo(() => {
    if (!marketsAddresses || !tokensData || (!fastMarketInfoData && (!marketsValues.data || !marketsConfigs.data))) {
      return undefined;
    }

    // Manual merging to avoid cloning tokens as they are sometimes compared by reference
    const data: MarketsInfoData = {};
    for (const marketAddress of marketsAddresses) {
      const market = marketsData?.[marketAddress];
      const longToken = getByKey(tokensData!, market?.longTokenAddress);
      const shortToken = getByKey(tokensData!, market?.shortTokenAddress);
      const indexToken = market
        ? getByKey(tokensData!, convertTokenAddress(chainId, market.indexTokenAddress, "native"))
        : undefined;

      if (!market || !longToken || !shortToken || !indexToken) {
        continue;
      }

      const marketValues = getByKey(marketsValues.data, marketAddress);
      const marketConfig = getByKey(marketsConfigs.data, marketAddress);
      const fastMarketInfo = getByKey(fastMarketInfoData, marketAddress);

      // Use on-chain data if loaded or fast api data
      const marketInfoFields = marketValues && marketConfig ? { ...marketValues, ...marketConfig } : fastMarketInfo;

      if (!marketInfoFields) {
        // console.log("market info error 2", marketAddress, marketInfoFields);
        continue;
      }

      const claimableFunding = getByKey(claimableFundingData, marketAddress);

      const fullMarketInfo: MarketInfo = {
        ...marketInfoFields,
        ...(claimableFunding || {}),
        ...market,
        longToken,
        shortToken,
        indexToken,
      };

      data[marketAddress] = fullMarketInfo;
    }

    return data as MarketsInfoData;
  }, [
    marketsAddresses,
    tokensData,
    fastMarketInfoData,
    marketsValues.data,
    marketsConfigs.data,
    marketsData,
    chainId,
    claimableFundingData,
  ]);

  const error = tokensDataError || marketsValues.error || marketsConfigs.error;

  return {
    marketsInfoData: isDependenciesLoading ? undefined : mergedData,
    tokensData,
    walletTokensData,
    pricesUpdatedAt,
    error,
    isBalancesLoaded,
  };
}

function useMarketsValuesRequest({
  chainId,
  isDependenciesLoading,
  marketsAddresses,
  marketsData,
  tokensData,
}: {
  chainId: UiContractsChain;
  isDependenciesLoading: boolean;
  marketsAddresses: string[] | undefined;
  marketsData: MarketsData | undefined;
  tokensData: TokensData | undefined;
}) {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const syntheticsReaderAddress = getContract(chainId, "SyntheticsReader");

  const marketsValuesQuery = useMulticall(chainId, `useMarketsValuesRequest-${chainId}`, {
    key:
      !isDependenciesLoading && marketsAddresses?.length && marketsAddresses.length > 0 ? [...marketsAddresses] : null,

    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () =>
      buildMarketsValuesRequest(chainId, {
        marketsAddresses,
        marketsData,
        tokensData,
        dataStoreAddress,
        syntheticsReaderAddress,
      }),
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
          const marketDivisor = getMarketDivisor(market);

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
}: {
  chainId: UiContractsChain;
  isDependenciesLoading: boolean;
  marketsAddresses: string[] | undefined;
}) {
  const dataStoreAddress = getContract(chainId, "DataStore");

  const marketsConfigsQuery = useMulticall(chainId, "useMarketsConfigsRequest", {
    key: !isDependenciesLoading && marketsAddresses!.length > 0 && [marketsAddresses],

    refreshInterval: CONFIG_UPDATE_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () =>
      buildMarketsConfigsRequest(chainId, {
        marketsAddresses,
        dataStoreAddress,
      }),
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
            atomicSwapFeeFactor: dataStoreValues.atomicSwapFeeFactor.returnValues[0],

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
