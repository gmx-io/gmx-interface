import { gql } from "@apollo/client";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";

type FastMarketInfo = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;

  isDisabled: boolean;

  longPoolAmount: bigint;
  shortPoolAmount: bigint;

  maxLongPoolAmount: bigint;
  maxShortPoolAmount: bigint;
  maxLongPoolUsdForDeposit: bigint;
  maxShortPoolUsdForDeposit: bigint;

  longPoolAmountAdjustment: bigint;
  shortPoolAmountAdjustment: bigint;

  poolValueMax: bigint;
  poolValueMin: bigint;

  reserveFactorLong: bigint;
  reserveFactorShort: bigint;

  openInterestReserveFactorLong: bigint;
  openInterestReserveFactorShort: bigint;

  maxOpenInterestLong: bigint;
  maxOpenInterestShort: bigint;

  borrowingFactorLong: bigint;
  borrowingFactorShort: bigint;
  borrowingExponentFactorLong: bigint;
  borrowingExponentFactorShort: bigint;

  fundingFactor: bigint;
  fundingExponentFactor: bigint;
  fundingIncreaseFactorPerSecond: bigint;
  fundingDecreaseFactorPerSecond: bigint;
  thresholdForStableFunding: bigint;
  thresholdForDecreaseFunding: bigint;
  minFundingFactorPerSecond: bigint;
  maxFundingFactorPerSecond: bigint;

  totalBorrowingFees: bigint;

  positionImpactPoolAmount: bigint;
  minPositionImpactPoolAmount: bigint;
  positionImpactPoolDistributionRate: bigint;

  minCollateralFactor: bigint;
  minCollateralFactorForOpenInterestLong: bigint;
  minCollateralFactorForOpenInterestShort: bigint;

  swapImpactPoolAmountLong: bigint;
  swapImpactPoolAmountShort: bigint;

  maxPnlFactorForTradersLong: bigint;
  maxPnlFactorForTradersShort: bigint;

  pnlLongMin: bigint;
  pnlLongMax: bigint;
  pnlShortMin: bigint;
  pnlShortMax: bigint;

  netPnlMin: bigint;
  netPnlMax: bigint;

  longInterestUsd: bigint;
  shortInterestUsd: bigint;
  longInterestInTokens: bigint;
  shortInterestInTokens: bigint;

  positionFeeFactorForPositiveImpact: bigint;
  positionFeeFactorForNegativeImpact: bigint;
  positionImpactFactorPositive: bigint;
  positionImpactFactorNegative: bigint;
  maxPositionImpactFactorPositive: bigint;
  maxPositionImpactFactorNegative: bigint;
  maxPositionImpactFactorForLiquidations: bigint;
  positionImpactExponentFactor: bigint;

  swapFeeFactorForPositiveImpact: bigint;
  swapFeeFactorForNegativeImpact: bigint;
  swapImpactFactorPositive: bigint;
  swapImpactFactorNegative: bigint;
  swapImpactExponentFactor: bigint;

  borrowingFactorPerSecondForLongs: bigint;
  borrowingFactorPerSecondForShorts: bigint;

  fundingFactorPerSecond: bigint;
  longsPayShorts: boolean;

  virtualPoolAmountForLongToken: bigint;
  virtualPoolAmountForShortToken: bigint;
  virtualInventoryForPositions: bigint;

  virtualMarketId?: string;
  virtualLongTokenId?: string;
  virtualShortTokenId?: string;
};

type FastMarketInfoData = {
  [address: string]: FastMarketInfo;
};

export function useFastMarketsInfoRequest(chainId: number) {
  const {
    data: fastMarketInfoData,
    error,
    isLoading,
  } = useSWR<FastMarketInfoData>(["useFastMarketsInfoRequest", chainId], {
    refreshInterval: undefined,
    fetcher: async () => {
      const client = getSubsquidGraphClient(chainId);
      const res = await client?.query({
        query: gql`
            query MarketsInfo() {
                marketInfos {
                    marketTokenAddress,
                    indexTokenAddress,
                    longTokenAddress,
                    shortTokenAddress,

                    isDisabled,

                    longPoolAmount,
                    shortPoolAmount,

                    maxLongPoolAmount,
                    maxShortPoolAmount,
                    maxLongPoolUsdForDeposit,
                    maxShortPoolUsdForDeposit,

                    longPoolAmountAdjustment,
                    shortPoolAmountAdjustment,

                    poolValueMax,
                    poolValueMin,

                    reserveFactorLong,
                    reserveFactorShort,

                    openInterestReserveFactorLong,
                    openInterestReserveFactorShort,

                    maxOpenInterestLong,
                    maxOpenInterestShort,

                    borrowingFactorLong,
                    borrowingFactorShort,
                    borrowingExponentFactorLong,
                    borrowingExponentFactorShort,

                    fundingFactor,
                    fundingExponentFactor,
                    fundingIncreaseFactorPerSecond,
                    fundingDecreaseFactorPerSecond,
                    thresholdForStableFunding,
                    thresholdForDecreaseFunding,
                    minFundingFactorPerSecond,
                    maxFundingFactorPerSecond,

                    totalBorrowingFees,

                    positionImpactPoolAmount,
                    minPositionImpactPoolAmount,
                    positionImpactPoolDistributionRate,

                    minCollateralFactor,
                    minCollateralFactorForOpenInterestLong,
                    minCollateralFactorForOpenInterestShort,

                    swapImpactPoolAmountLong,
                    swapImpactPoolAmountShort,

                    maxPnlFactorForTradersLong,
                    maxPnlFactorForTradersShort,

                    pnlLongMin,
                    pnlLongMax,
                    pnlShortMin,
                    pnlShortMax,

                    netPnlMin,
                    netPnlMax,

                    longInterestUsd,
                    shortInterestUsd,
                    longInterestInTokens,
                    shortInterestInTokens,

                    positionFeeFactorForPositiveImpact,
                    positionFeeFactorForNegativeImpact,
                    positionImpactFactorPositive,
                    positionImpactFactorNegative,
                    maxPositionImpactFactorPositive,
                    maxPositionImpactFactorNegative,
                    maxPositionImpactFactorForLiquidations,
                    positionImpactExponentFactor,

                    swapFeeFactorForPositiveImpact,
                    swapFeeFactorForNegativeImpact,
                    swapImpactFactorPositive,
                    swapImpactFactorNegative,
                    swapImpactExponentFactor,

                    borrowingFactorPerSecondForLongs,
                    borrowingFactorPerSecondForShorts,

                    fundingFactorPerSecond,
                    longsPayShorts,

                    virtualPoolAmountForLongToken,
                    virtualPoolAmountForShortToken,
                    virtualInventoryForPositions,

                    virtualMarketId,
                    virtualLongTokenId,
                    virtualShortTokenId,
                }
            }
          `,
        fetchPolicy: "no-cache",
      });

      const marketInfos = res?.data?.marketInfos;

      if (!marketInfos) {
        return undefined;
      }

      return marketInfos.reduce((acc, mInfo) => {
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
          reserveFactorShort: BigInt(mInfo.reserveFactorShor),

          openInterestReserveFactorLong: BigInt(mInfo.openInterestReserveFactorLong),
          openInterestReserveFactorShort: BigInt(mInfo.openInterestReserveFactorShort),

          maxOpenInterestLong: BigInt(mInfo.maxOpenInterestLong),
          maxOpenInterestShort: BigInt(mInfo.maxOpenInterestShort),

          borrowingFactorLong: BigInt(mInfo.borrowingFactorLong),
          borrowingFactorShort: BigInt(mInfo.borrowingFactorShort),
          borrowingExponentFactorLong: BigInt(mInfo.borrowingExponentFactorLong),
          borrowingExponentFactorShort: BigInt(mInfo.borrowingExponentFactorShort),

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

          pnlLongMin: BigInt(mInfo.pnlLongMin),
          pnlLongMax: BigInt(mInfo.pnlLongMax),
          pnlShortMin: BigInt(mInfo.pnlShortMin),
          pnlShortMax: BigInt(mInfo.pnlShortMax),

          netPnlMin: BigInt(mInfo.netPnlMin),
          netPnlMax: BigInt(mInfo.netPnlMax),

          longInterestUsd: BigInt(mInfo.longInterestUsd),
          shortInterestUsd: BigInt(mInfo.shortInterestUsd),
          longInterestInTokens: BigInt(mInfo.longInterestInTokens),
          shortInterestInTokens: BigInt(mInfo.shortInterestInTokens),

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
      });
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
