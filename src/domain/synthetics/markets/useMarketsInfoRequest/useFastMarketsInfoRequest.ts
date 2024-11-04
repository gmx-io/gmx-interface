import { gql } from "@apollo/client";
import { metrics } from "lib/metrics";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { FastMarketInfoData } from "..";
import { getIsFlagEnabled } from "config/ab";

export function useFastMarketsInfoRequest(chainId: number) {
  const swrKey = getIsFlagEnabled("testFastMarketsInfo") ? [chainId, "useFastMarketsInfoRequest"] : null;

  const {
    data: fastMarketInfoData,
    error,
    isLoading,
  } = useSWR<FastMarketInfoData>(swrKey, {
    refreshInterval: undefined,
    fetcher: async () => {
      try {
        const client = getSubsquidGraphClient(chainId);
        const res = await client?.query({
          query: gql`
            query MarketsInfo {
              marketInfos {
                marketTokenAddress
                indexTokenAddress
                longTokenAddress
                shortTokenAddress

                isDisabled

                longPoolAmount
                shortPoolAmount

                maxLongPoolAmount
                maxShortPoolAmount
                maxLongPoolUsdForDeposit
                maxShortPoolUsdForDeposit

                longPoolAmountAdjustment
                shortPoolAmountAdjustment

                poolValueMax
                poolValueMin

                reserveFactorLong
                reserveFactorShort

                openInterestReserveFactorLong
                openInterestReserveFactorShort

                maxOpenInterestLong
                maxOpenInterestShort

                fundingFactor
                fundingExponentFactor
                fundingIncreaseFactorPerSecond
                fundingDecreaseFactorPerSecond
                thresholdForStableFunding
                thresholdForDecreaseFunding
                minFundingFactorPerSecond
                maxFundingFactorPerSecond

                totalBorrowingFees

                positionImpactPoolAmount
                minPositionImpactPoolAmount
                positionImpactPoolDistributionRate

                minCollateralFactor
                minCollateralFactorForOpenInterestLong
                minCollateralFactorForOpenInterestShort

                swapImpactPoolAmountLong
                swapImpactPoolAmountShort

                maxPnlFactorForTradersLong
                maxPnlFactorForTradersShort

                longOpenInterestUsd
                shortOpenInterestUsd
                longOpenInterestInTokens
                shortOpenInterestInTokens

                positionFeeFactorForPositiveImpact
                positionFeeFactorForNegativeImpact
                positionImpactFactorPositive
                positionImpactFactorNegative
                maxPositionImpactFactorPositive
                maxPositionImpactFactorNegative
                maxPositionImpactFactorForLiquidations
                positionImpactExponentFactor

                swapFeeFactorForPositiveImpact
                swapFeeFactorForNegativeImpact
                swapImpactFactorPositive
                swapImpactFactorNegative
                swapImpactExponentFactor

                borrowingFactorPerSecondForLongs
                borrowingFactorPerSecondForShorts

                fundingFactorPerSecond
                longsPayShorts

                virtualPoolAmountForLongToken
                virtualPoolAmountForShortToken
                virtualInventoryForPositions

                virtualMarketId
                virtualLongTokenId
                virtualShortTokenId
              }
            }
          `,
          fetchPolicy: "no-cache",
        });

        const rawMarketsInfo = res?.data?.marketInfos;

        if (!rawMarketsInfo) {
          return undefined;
        }

        return rawMarketsInfo.reduce((acc: FastMarketInfoData, mInfo) => {
          acc[mInfo.marketTokenAddress] = {
            marketTokenAddress: mInfo.marketTokenAddress,
            indexTokenAddress: mInfo.indexTokenAddress,
            longTokenAddress: mInfo.longTokenAddress,
            shortTokenAddress: mInfo.shortTokenAddress,

            isDisabled: mInfo.isDisabled,

            longPoolAmount: BigInt(mInfo.longPoolAmount),
            shortPoolAmount: BigInt(mInfo.shortPoolAmount),

            maxLongPoolAmount: BigInt(mInfo.maxLongPoolAmount),
            maxShortPoolAmount: BigInt(mInfo.maxShortPoolAmount),
            maxLongPoolUsdForDeposit: BigInt(mInfo.maxLongPoolUsdForDeposit),
            maxShortPoolUsdForDeposit: BigInt(mInfo.maxShortPoolUsdForDeposit),

            longPoolAmountAdjustment: BigInt(mInfo.longPoolAmountAdjustment),
            shortPoolAmountAdjustment: BigInt(mInfo.shortPoolAmountAdjustment),

            poolValueMax: BigInt(mInfo.poolValueMax),
            poolValueMin: BigInt(mInfo.poolValueMin),

            reserveFactorLong: BigInt(mInfo.reserveFactorLong),
            reserveFactorShort: BigInt(mInfo.reserveFactorShort),

            openInterestReserveFactorLong: BigInt(mInfo.openInterestReserveFactorLong),
            openInterestReserveFactorShort: BigInt(mInfo.openInterestReserveFactorShort),

            maxOpenInterestLong: BigInt(mInfo.maxOpenInterestLong),
            maxOpenInterestShort: BigInt(mInfo.maxOpenInterestShort),

            borrowingFactorLong: 0n,
            borrowingFactorShort: 0n,
            borrowingExponentFactorLong: 0n,
            borrowingExponentFactorShort: 0n,

            fundingFactor: BigInt(mInfo.fundingFactor),
            fundingExponentFactor: BigInt(mInfo.fundingExponentFactor),
            fundingIncreaseFactorPerSecond: BigInt(mInfo.fundingIncreaseFactorPerSecond),
            fundingDecreaseFactorPerSecond: BigInt(mInfo.fundingDecreaseFactorPerSecond),
            thresholdForStableFunding: BigInt(mInfo.thresholdForStableFunding),
            thresholdForDecreaseFunding: BigInt(mInfo.thresholdForDecreaseFunding),
            minFundingFactorPerSecond: BigInt(mInfo.minFundingFactorPerSecond),
            maxFundingFactorPerSecond: BigInt(mInfo.maxFundingFactorPerSecond),

            totalBorrowingFees: BigInt(mInfo.totalBorrowingFees),

            positionImpactPoolAmount: BigInt(mInfo.positionImpactPoolAmount),
            minPositionImpactPoolAmount: BigInt(mInfo.minPositionImpactPoolAmount),
            positionImpactPoolDistributionRate: BigInt(mInfo.positionImpactPoolDistributionRate),

            minCollateralFactor: BigInt(mInfo.minCollateralFactor),
            minCollateralFactorForOpenInterestLong: BigInt(mInfo.minCollateralFactorForOpenInterestLong),
            minCollateralFactorForOpenInterestShort: BigInt(mInfo.minCollateralFactorForOpenInterestShort),

            swapImpactPoolAmountLong: BigInt(mInfo.swapImpactPoolAmountLong),
            swapImpactPoolAmountShort: BigInt(mInfo.swapImpactPoolAmountShort),

            maxPnlFactorForTradersLong: BigInt(mInfo.maxPnlFactorForTradersLong),
            maxPnlFactorForTradersShort: BigInt(mInfo.maxPnlFactorForTradersShort),

            longInterestUsd: BigInt(mInfo.longOpenInterestUsd),
            shortInterestUsd: BigInt(mInfo.shortOpenInterestUsd),
            longInterestInTokens: BigInt(mInfo.longOpenInterestInTokens),
            shortInterestInTokens: BigInt(mInfo.shortOpenInterestInTokens),

            positionFeeFactorForPositiveImpact: BigInt(mInfo.positionFeeFactorForPositiveImpact),
            positionFeeFactorForNegativeImpact: BigInt(mInfo.positionFeeFactorForNegativeImpact),
            positionImpactFactorPositive: BigInt(mInfo.positionImpactFactorPositive),
            positionImpactFactorNegative: BigInt(mInfo.positionImpactFactorNegative),
            maxPositionImpactFactorPositive: BigInt(mInfo.maxPositionImpactFactorPositive),
            maxPositionImpactFactorNegative: BigInt(mInfo.maxPositionImpactFactorNegative),
            maxPositionImpactFactorForLiquidations: BigInt(mInfo.maxPositionImpactFactorForLiquidations),
            positionImpactExponentFactor: BigInt(mInfo.positionImpactExponentFactor),

            swapFeeFactorForPositiveImpact: BigInt(mInfo.swapFeeFactorForPositiveImpact),
            swapFeeFactorForNegativeImpact: BigInt(mInfo.swapFeeFactorForNegativeImpact),
            swapImpactFactorPositive: BigInt(mInfo.swapImpactFactorPositive),
            swapImpactFactorNegative: BigInt(mInfo.swapImpactFactorNegative),
            swapImpactExponentFactor: BigInt(mInfo.swapImpactExponentFactor),

            borrowingFactorPerSecondForLongs: BigInt(mInfo.borrowingFactorPerSecondForLongs),
            borrowingFactorPerSecondForShorts: BigInt(mInfo.borrowingFactorPerSecondForShorts),

            fundingFactorPerSecond: BigInt(mInfo.fundingFactorPerSecond),
            longsPayShorts: mInfo.longsPayShorts,

            virtualPoolAmountForLongToken: BigInt(mInfo.virtualPoolAmountForLongToken),
            virtualPoolAmountForShortToken: BigInt(mInfo.virtualPoolAmountForShortToken),
            virtualInventoryForPositions: BigInt(mInfo.virtualInventoryForPositions),

            virtualMarketId: mInfo.virtualMarketId,
            virtualLongTokenId: mInfo.virtualLongTokenId,
            virtualShortTokenId: mInfo.virtualShortTokenId,
          };

          return acc;
        }, {} as FastMarketInfoData);
      } catch (e) {
        metrics.pushError(e, "useFastMarketsInfoRequest");
        throw e;
      }
    },
  });

  return useMemo(
    () => ({
      fastMarketInfoData,
      error,
      isLoading,
    }),
    [error, fastMarketInfoData, isLoading]
  );
}
