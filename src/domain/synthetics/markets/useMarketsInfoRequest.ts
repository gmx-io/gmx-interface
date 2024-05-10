import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import {
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  borrowingExponentFactorKey,
  borrowingFactorKey,
  claimableFundingAmountKey,
  fundingExponentFactorKey,
  fundingFactorKey,
  fundingIncreaseFactorPerSecondKey,
  fundingDecreaseFactorPerSecondKey,
  thresholdForStableFundingKey,
  thresholdForDecreaseFundingKey,
  minFundingFactorPerSecondKey,
  maxFundingFactorPerSecondKey,
  isMarketDisabledKey,
  maxPnlFactorKey,
  maxPoolAmountForDepositKey,
  maxPoolAmountKey,
  maxPositionImpactFactorForLiquidationsKey,
  maxPositionImpactFactorKey,
  minCollateralFactorForOpenInterest,
  minCollateralFactorKey,
  openInterestInTokensKey,
  openInterestKey,
  openInterestReserveFactorKey,
  maxOpenInterestKey,
  poolAmountAdjustmentKey,
  poolAmountKey,
  positionFeeFactorKey,
  positionImpactExponentFactorKey,
  positionImpactFactorKey,
  positionImpactPoolAmountKey,
  reserveFactorKey,
  swapFeeFactorKey,
  swapImpactExponentFactorKey,
  swapImpactFactorKey,
  swapImpactPoolAmountKey,
  virtualMarketIdKey,
  virtualTokenIdKey,
  minPositionImpactPoolAmountKey,
  positionImpactPoolDistributionRateKey,
} from "config/dataStore";
import { convertTokenAddress } from "config/tokens";
import { useMulticall } from "lib/multicall";
import { getByKey } from "lib/objects";
import { TokensData, useTokensDataRequest } from "../tokens";
import { MarketsInfoData } from "./types";
import { useMarkets } from "./useMarkets";
import { getContractMarketPrices } from "./utils";
import useWallet from "lib/wallets/useWallet";
import { BN_ONE } from "lib/numbers";

export type MarketsInfoResult = {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
};

export function useMarketsInfoRequest(chainId: number): MarketsInfoResult {
  const { account } = useWallet();
  const { marketsData, marketsAddresses } = useMarkets(chainId);
  const { tokensData, pricesUpdatedAt } = useTokensDataRequest(chainId);
  const dataStoreAddress = getContract(chainId, "DataStore");

  const isDepencenciesLoading = !marketsAddresses || !tokensData;

  const { data } = useMulticall(chainId, "useMarketsInfo", {
    key: !isDepencenciesLoading &&
      marketsAddresses.length > 0 && [marketsAddresses.join("-"), dataStoreAddress, account, pricesUpdatedAt],

    // Refreshed on every prices update
    refreshInterval: null,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () =>
      marketsAddresses!.reduce((request, marketAddress) => {
        const market = getByKey(marketsData, marketAddress)!;
        const marketPrices = getContractMarketPrices(tokensData!, market)!;

        if (!marketPrices) {
          // eslint-disable-next-line no-console
          console.warn("missed market prices", market);
          return request;
        }

        const marketProps = {
          marketToken: market.marketTokenAddress,
          indexToken: market.indexTokenAddress,
          longToken: market.longTokenAddress,
          shortToken: market.shortTokenAddress,
        };

        return Object.assign(request, {
          [`${marketAddress}-reader`]: {
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
          },
          [`${marketAddress}-dataStore`]: {
            contractAddress: dataStoreAddress,
            abi: DataStore.abi,
            calls: {
              isDisabled: {
                methodName: "getBool",
                params: [isMarketDisabledKey(marketAddress)],
              },
              longPoolAmount: {
                methodName: "getUint",
                params: [poolAmountKey(marketAddress, market.longTokenAddress)],
              },
              shortPoolAmount: {
                methodName: "getUint",
                params: [poolAmountKey(marketAddress, market.shortTokenAddress)],
              },
              maxLongPoolAmount: {
                methodName: "getUint",
                params: [maxPoolAmountKey(marketAddress, market.longTokenAddress)],
              },
              maxShortPoolAmount: {
                methodName: "getUint",
                params: [maxPoolAmountKey(marketAddress, market.shortTokenAddress)],
              },
              maxLongPoolAmountForDeposit: {
                methodName: "getUint",
                params: [maxPoolAmountForDepositKey(marketAddress, market.longTokenAddress)],
              },
              maxShortPoolAmountForDeposit: {
                methodName: "getUint",
                params: [maxPoolAmountForDepositKey(marketAddress, market.shortTokenAddress)],
              },
              longPoolAmountAdjustment: {
                methodName: "getUint",
                params: [poolAmountAdjustmentKey(marketAddress, market.longTokenAddress)],
              },
              shortPoolAmountAdjustment: {
                methodName: "getUint",
                params: [poolAmountAdjustmentKey(marketAddress, market.longTokenAddress)],
              },
              reserveFactorLong: {
                methodName: "getUint",
                params: [reserveFactorKey(marketAddress, true)],
              },
              reserveFactorShort: {
                methodName: "getUint",
                params: [reserveFactorKey(marketAddress, true)],
              },
              openInterestReserveFactorLong: {
                methodName: "getUint",
                params: [openInterestReserveFactorKey(marketAddress, true)],
              },
              openInterestReserveFactorShort: {
                methodName: "getUint",
                params: [openInterestReserveFactorKey(marketAddress, false)],
              },
              maxOpenInterestLong: {
                methodName: "getUint",
                params: [maxOpenInterestKey(marketAddress, true)],
              },
              maxOpenInterestShort: {
                methodName: "getUint",
                params: [maxOpenInterestKey(marketAddress, false)],
              },
              positionImpactPoolAmount: {
                methodName: "getUint",
                params: [positionImpactPoolAmountKey(marketAddress)],
              },
              minPositionImpactPoolAmount: {
                methodName: "getUint",
                params: [minPositionImpactPoolAmountKey(marketAddress)],
              },
              positionImpactPoolDistributionRate: {
                methodName: "getUint",
                params: [positionImpactPoolDistributionRateKey(marketAddress)],
              },
              swapImpactPoolAmountLong: {
                methodName: "getUint",
                params: [swapImpactPoolAmountKey(marketAddress, market.longTokenAddress)],
              },
              swapImpactPoolAmountShort: {
                methodName: "getUint",
                params: [swapImpactPoolAmountKey(marketAddress, market.shortTokenAddress)],
              },
              borrowingFactorLong: {
                methodName: "getUint",
                params: [borrowingFactorKey(marketAddress, true)],
              },
              borrowingFactorShort: {
                methodName: "getUint",
                params: [borrowingFactorKey(marketAddress, false)],
              },
              borrowingExponentFactorLong: {
                methodName: "getUint",
                params: [borrowingExponentFactorKey(marketAddress, true)],
              },
              borrowingExponentFactorShort: {
                methodName: "getUint",
                params: [borrowingExponentFactorKey(marketAddress, false)],
              },
              fundingFactor: {
                methodName: "getUint",
                params: [fundingFactorKey(marketAddress)],
              },
              fundingExponentFactor: {
                methodName: "getUint",
                params: [fundingExponentFactorKey(marketAddress)],
              },
              fundingIncreaseFactorPerSecond: {
                methodName: "getUint",
                params: [fundingIncreaseFactorPerSecondKey(marketAddress)],
              },
              fundingDecreaseFactorPerSecond: {
                methodName: "getUint",
                params: [fundingDecreaseFactorPerSecondKey(marketAddress)],
              },
              thresholdForStableFunding: {
                methodName: "getUint",
                params: [thresholdForStableFundingKey(marketAddress)],
              },
              thresholdForDecreaseFunding: {
                methodName: "getUint",
                params: [thresholdForDecreaseFundingKey(marketAddress)],
              },
              minFundingFactorPerSecond: {
                methodName: "getUint",
                params: [minFundingFactorPerSecondKey(marketAddress)],
              },
              maxFundingFactorPerSecond: {
                methodName: "getUint",
                params: [maxFundingFactorPerSecondKey(marketAddress)],
              },
              maxPnlFactorForTradersLong: {
                methodName: "getUint",
                params: [maxPnlFactorKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY, marketAddress, true)],
              },
              maxPnlFactorForTradersShort: {
                methodName: "getUint",
                params: [maxPnlFactorKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY, marketAddress, false)],
              },
              claimableFundingAmountLong: account
                ? {
                    methodName: "getUint",
                    params: [claimableFundingAmountKey(marketAddress, market.longTokenAddress, account)],
                  }
                : undefined,
              claimableFundingAmountShort: account
                ? {
                    methodName: "getUint",
                    params: [claimableFundingAmountKey(marketAddress, market.shortTokenAddress, account)],
                  }
                : undefined,
              positionFeeFactorForPositiveImpact: {
                methodName: "getUint",
                params: [positionFeeFactorKey(marketAddress, true)],
              },
              positionFeeFactorForNegativeImpact: {
                methodName: "getUint",
                params: [positionFeeFactorKey(marketAddress, false)],
              },
              positionImpactFactorPositive: {
                methodName: "getUint",
                params: [positionImpactFactorKey(marketAddress, true)],
              },
              positionImpactFactorNegative: {
                methodName: "getUint",
                params: [positionImpactFactorKey(marketAddress, false)],
              },
              maxPositionImpactFactorPositive: {
                methodName: "getUint",
                params: [maxPositionImpactFactorKey(marketAddress, true)],
              },
              maxPositionImpactFactorNegative: {
                methodName: "getUint",
                params: [maxPositionImpactFactorKey(marketAddress, false)],
              },
              maxPositionImpactFactorForLiquidations: {
                methodName: "getUint",
                params: [maxPositionImpactFactorForLiquidationsKey(marketAddress)],
              },
              minCollateralFactor: {
                methodName: "getUint",
                params: [minCollateralFactorKey(marketAddress)],
              },
              minCollateralFactorForOpenInterestLong: {
                methodName: "getUint",
                params: [minCollateralFactorForOpenInterest(marketAddress, true)],
              },
              minCollateralFactorForOpenInterestShort: {
                methodName: "getUint",
                params: [minCollateralFactorForOpenInterest(marketAddress, false)],
              },
              positionImpactExponentFactor: {
                methodName: "getUint",
                params: [positionImpactExponentFactorKey(marketAddress)],
              },
              swapFeeFactorForPositiveImpact: {
                methodName: "getUint",
                params: [swapFeeFactorKey(marketAddress, true)],
              },
              swapFeeFactorForNegativeImpact: {
                methodName: "getUint",
                params: [swapFeeFactorKey(marketAddress, false)],
              },
              swapImpactFactorPositive: {
                methodName: "getUint",
                params: [swapImpactFactorKey(marketAddress, true)],
              },
              swapImpactFactorNegative: {
                methodName: "getUint",
                params: [swapImpactFactorKey(marketAddress, false)],
              },
              swapImpactExponentFactor: {
                methodName: "getUint",
                params: [swapImpactExponentFactorKey(marketAddress)],
              },
              longInterestUsingLongToken: {
                methodName: "getUint",
                params: [openInterestKey(marketAddress, market.longTokenAddress, true)],
              },
              longInterestUsingShortToken: {
                methodName: "getUint",
                params: [openInterestKey(marketAddress, market.shortTokenAddress, true)],
              },
              shortInterestUsingLongToken: {
                methodName: "getUint",
                params: [openInterestKey(marketAddress, market.longTokenAddress, false)],
              },
              shortInterestUsingShortToken: {
                methodName: "getUint",
                params: [openInterestKey(marketAddress, market.shortTokenAddress, false)],
              },
              longInterestInTokensUsingLongToken: {
                methodName: "getUint",
                params: [openInterestInTokensKey(marketAddress, market.longTokenAddress, true)],
              },
              longInterestInTokensUsingShortToken: {
                methodName: "getUint",
                params: [openInterestInTokensKey(marketAddress, market.shortTokenAddress, true)],
              },
              shortInterestInTokensUsingLongToken: {
                methodName: "getUint",
                params: [openInterestInTokensKey(marketAddress, market.longTokenAddress, false)],
              },
              shortInterestInTokensUsingShortToken: {
                methodName: "getUint",
                params: [openInterestInTokensKey(marketAddress, market.shortTokenAddress, false)],
              },
              virtualMarketId: {
                methodName: "getBytes32",
                params: [virtualMarketIdKey(marketAddress)],
              },
              virtualLongTokenId: {
                methodName: "getBytes32",
                params: [virtualTokenIdKey(market.longTokenAddress)],
              },
              virtualShortTokenId: {
                methodName: "getBytes32",
                params: [virtualTokenIdKey(market.shortTokenAddress)],
              },
            },
          },
        });
      }, {}),
    parseResponse: (res) => {
      return marketsAddresses!.reduce((acc: MarketsInfoData, marketAddress) => {
        const readerErrors = res.errors[`${marketAddress}-reader`];
        const dataStoreErrors = res.errors[`${marketAddress}-dataStore`];

        const readerValues = res.data[`${marketAddress}-reader`];
        const dataStoreValues = res.data[`${marketAddress}-dataStore`];

        // Skip invalid market
        if (!readerValues || !dataStoreValues || readerErrors || dataStoreErrors) {
          // eslint-disable-next-line no-console
          console.log("market info error", marketAddress, readerErrors, dataStoreErrors, dataStoreValues);
          return acc;
        }
        const market = getByKey(marketsData, marketAddress)!;
        const marketDivisor = market.isSameCollaterals ? BigInt(2) : BN_ONE;

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

        const [, poolValueInfoMin] = readerValues.marketTokenPriceMin.returnValues;

        const [, poolValueInfoMax] = readerValues.marketTokenPriceMax.returnValues;

        const longToken = getByKey(tokensData!, market.longTokenAddress)!;
        const shortToken = getByKey(tokensData!, market.shortTokenAddress)!;
        const indexToken = getByKey(tokensData!, convertTokenAddress(chainId, market.indexTokenAddress, "native"))!;

        acc[marketAddress] = {
          ...market,
          isDisabled: dataStoreValues.isDisabled.returnValues[0],
          longToken,
          shortToken,
          indexToken,
          longInterestUsd,
          shortInterestUsd,
          longInterestInTokens,
          shortInterestInTokens,
          longPoolAmount: dataStoreValues.longPoolAmount.returnValues[0] / marketDivisor,
          shortPoolAmount: dataStoreValues.shortPoolAmount.returnValues[0] / marketDivisor,
          maxLongPoolAmountForDeposit: dataStoreValues.maxLongPoolAmountForDeposit.returnValues[0],
          maxShortPoolAmountForDeposit: dataStoreValues.maxShortPoolAmountForDeposit.returnValues[0],
          maxLongPoolAmount: dataStoreValues.maxLongPoolAmount.returnValues[0],
          maxShortPoolAmount: dataStoreValues.maxShortPoolAmount.returnValues[0],
          longPoolAmountAdjustment: dataStoreValues.longPoolAmountAdjustment.returnValues[0],
          shortPoolAmountAdjustment: dataStoreValues.shortPoolAmountAdjustment.returnValues[0],
          poolValueMin: poolValueInfoMin.poolValue,
          poolValueMax: poolValueInfoMax.poolValue,
          reserveFactorLong: dataStoreValues.reserveFactorLong.returnValues[0],
          reserveFactorShort: dataStoreValues.reserveFactorShort.returnValues[0],
          openInterestReserveFactorLong: dataStoreValues.openInterestReserveFactorLong.returnValues[0],
          openInterestReserveFactorShort: dataStoreValues.openInterestReserveFactorShort.returnValues[0],
          maxOpenInterestLong: dataStoreValues.maxOpenInterestLong.returnValues[0],
          maxOpenInterestShort: dataStoreValues.maxOpenInterestShort.returnValues[0],
          totalBorrowingFees: poolValueInfoMax.totalBorrowingFees,
          positionImpactPoolAmount: dataStoreValues.positionImpactPoolAmount.returnValues[0],
          minPositionImpactPoolAmount: dataStoreValues.minPositionImpactPoolAmount.returnValues[0],
          positionImpactPoolDistributionRate: dataStoreValues.positionImpactPoolDistributionRate.returnValues[0],
          swapImpactPoolAmountLong: dataStoreValues.swapImpactPoolAmountLong.returnValues[0],
          swapImpactPoolAmountShort: dataStoreValues.swapImpactPoolAmountShort.returnValues[0],
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
          pnlLongMax: poolValueInfoMax.longPnl,
          pnlLongMin: poolValueInfoMin.longPnl,
          pnlShortMax: poolValueInfoMax.shortPnl,
          pnlShortMin: poolValueInfoMin.shortPnl,
          netPnlMax: poolValueInfoMax.netPnl,
          netPnlMin: poolValueInfoMin.netPnl,

          maxPnlFactorForTradersLong: dataStoreValues.maxPnlFactorForTradersLong.returnValues[0],
          maxPnlFactorForTradersShort: dataStoreValues.maxPnlFactorForTradersShort.returnValues[0],

          minCollateralFactor: dataStoreValues.minCollateralFactor.returnValues[0],
          minCollateralFactorForOpenInterestLong:
            dataStoreValues.minCollateralFactorForOpenInterestLong.returnValues[0],

          minCollateralFactorForOpenInterestShort:
            dataStoreValues.minCollateralFactorForOpenInterestShort.returnValues[0],

          claimableFundingAmountLong: dataStoreValues.claimableFundingAmountLong
            ? dataStoreValues.claimableFundingAmountLong?.returnValues[0] / marketDivisor
            : undefined,

          claimableFundingAmountShort: dataStoreValues.claimableFundingAmountShort
            ? dataStoreValues.claimableFundingAmountShort?.returnValues[0] / marketDivisor
            : undefined,

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

          borrowingFactorPerSecondForLongs: readerValues.marketInfo.returnValues.borrowingFactorPerSecondForLongs,

          borrowingFactorPerSecondForShorts: readerValues.marketInfo.returnValues.borrowingFactorPerSecondForShorts,

          fundingFactorPerSecond: nextFunding.fundingFactorPerSecond,
          longsPayShorts: nextFunding.longsPayShorts,

          virtualPoolAmountForLongToken: virtualInventory.virtualPoolAmountForLongToken,
          virtualPoolAmountForShortToken: virtualInventory.virtualPoolAmountForShortToken,
          virtualInventoryForPositions: virtualInventory.virtualInventoryForPositions,

          virtualMarketId: dataStoreValues.virtualMarketId.returnValues[0],
          virtualLongTokenId: dataStoreValues.virtualLongTokenId.returnValues[0],
          virtualShortTokenId: dataStoreValues.virtualShortTokenId.returnValues[0],
        };

        return acc;
      }, {} as MarketsInfoData);
    },
  });

  return {
    marketsInfoData: isDepencenciesLoading ? undefined : data,
    tokensData,
    pricesUpdatedAt,
  };
}
