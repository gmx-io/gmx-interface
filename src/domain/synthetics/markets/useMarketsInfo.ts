import { useWeb3React } from "@web3-react/core";
import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import {
  MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
  borrowingExponentFactorKey,
  borrowingFactorKey,
  claimableFundingAmountKey,
  fundingExponentFactorKey,
  fundingFactorKey,
  isMarketDisabledKey,
  maxPnlFactorKey,
  maxPositionImpactFactorForLiquidationsKey,
  maxPositionImpactFactorKey,
  minCollateralFactorForOpenInterest,
  minCollateralFactorKey,
  openInterestInTokensKey,
  openInterestKey,
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
} from "config/dataStore";
import { convertTokenAddress } from "config/tokens";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useRef } from "react";
import { TokensData, useAvailableTokensData } from "../tokens";
import { MarketsInfoData } from "./types";
import { useMarkets } from "./useMarkets";
import { getContractMarketPrices } from "./utils";

export type MarketsInfoResult = {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
};

export function useMarketsInfo(chainId: number): MarketsInfoResult {
  const { account } = useWeb3React();
  const { marketsData, marketsAddresses } = useMarkets(chainId);
  const { tokensData, pricesUpdatedAt } = useAvailableTokensData(chainId);
  const dataStoreAddress = getContract(chainId, "DataStore");

  const isDepencenciesLoading = !marketsAddresses || !tokensData;

  // Use ref to cache data from previos key with old prices
  const marketsInfoDataCache = useRef<MarketsInfoData>();

  const { data } = useMulticall(chainId, "useMarketsInfo", {
    key: !isDepencenciesLoading &&
      marketsAddresses.length > 0 && [marketsAddresses.join("-"), dataStoreAddress, account, pricesUpdatedAt],

    // Refreshed on every prices update
    refreshInterval: null,

    requireSuccess: false,

    request: () =>
      marketsAddresses!.reduce((request, marketAddress) => {
        const market = getByKey(marketsData, marketAddress)!;
        const marketPrices = getContractMarketPrices(tokensData!, market)!;

        if (!marketPrices) {
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
              positionImpactPoolAmount: {
                methodName: "getUint",
                params: [positionImpactPoolAmountKey(marketAddress)],
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
              maxPnlFactorForTradersLong: {
                methodName: "getUint",
                params: [maxPnlFactorKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY, marketAddress, true)],
              },
              maxPnlFactorForTradersShort: {
                methodName: "getUint",
                params: [maxPnlFactorKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY, marketAddress, false)],
              },
              maxPnlFactorForDepositsLong: {
                methodName: "getUint",
                params: [maxPnlFactorKey(MAX_PNL_FACTOR_FOR_DEPOSITS_KEY, marketAddress, true)],
              },
              maxPnlFactorForDepositsShort: {
                methodName: "getUint",
                params: [maxPnlFactorKey(MAX_PNL_FACTOR_FOR_DEPOSITS_KEY, marketAddress, false)],
              },
              maxPnlFactorForWithdrawalsLong: {
                methodName: "getUint",
                params: [maxPnlFactorKey(MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY, marketAddress, true)],
              },
              maxPnlFactorForWithdrawalsShort: {
                methodName: "getUint",
                params: [maxPnlFactorKey(MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY, marketAddress, false)],
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
              positionFeeFactor: {
                methodName: "getUint",
                params: [positionFeeFactorKey(marketAddress)],
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
              swapFeeFactor: {
                methodName: "getUint",
                params: [swapFeeFactorKey(marketAddress)],
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
          return acc;
        }

        const longInterestUsingLongToken = dataStoreValues.longInterestUsingLongToken.returnValues[0];
        const longInterestUsingShortToken = dataStoreValues.longInterestUsingShortToken.returnValues[0];
        const shortInterestUsingLongToken = dataStoreValues.shortInterestUsingLongToken.returnValues[0];
        const shortInterestUsingShortToken = dataStoreValues.shortInterestUsingShortToken.returnValues[0];

        const longInterestUsd = longInterestUsingLongToken.add(longInterestUsingShortToken);
        const shortInterestUsd = shortInterestUsingLongToken.add(shortInterestUsingShortToken);

        const longInterestInTokensUsingLongToken = dataStoreValues.longInterestInTokensUsingLongToken.returnValues[0];
        const longInterestInTokensUsingShortToken = dataStoreValues.longInterestInTokensUsingShortToken.returnValues[0];
        const shortInterestInTokensUsingLongToken = dataStoreValues.shortInterestInTokensUsingLongToken.returnValues[0];
        const shortInterestInTokensUsingShortToken =
          dataStoreValues.shortInterestInTokensUsingShortToken.returnValues[0];

        const longInterestInTokens = longInterestInTokensUsingLongToken.add(longInterestInTokensUsingShortToken);
        const shortInterestInTokens = shortInterestInTokensUsingLongToken.add(shortInterestInTokensUsingShortToken);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          _,
          borrowingFactorPerSecondForLongs,
          borrowingFactorPerSecondForShorts,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          baseFunding,
          nextFunding,
          virtualInventory,
        ] = readerValues.marketInfo.returnValues[0];

        const [virtualPoolAmountForLongToken, virtualPoolAmountForShortToken, virtualInventoryForPositions] =
          virtualInventory.map(bigNumberify);

        const [longsPayShorts, fundingFactorPerSecond] = nextFunding;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_priceMin, poolValueInfoMin] = readerValues.marketTokenPriceMin.returnValues;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_priceMax, poolValueInfoMax] = readerValues.marketTokenPriceMax.returnValues;

        const [poolValueMin, pnlLongMin, pnlShortMin, netPnlMin] = poolValueInfoMin.map(bigNumberify);

        const [
          poolValueMax,
          pnlLongMax,
          pnlShortMax,
          netPnlMax,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          _longTokenAmount,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          _shortTokenAmount,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          longTokenUsd,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          shortTokenUsd,
          totalBorrowingFees,
        ] = poolValueInfoMax.map(bigNumberify);

        const market = getByKey(marketsData, marketAddress)!;
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
          longPoolAmount: dataStoreValues.longPoolAmount.returnValues[0],
          shortPoolAmount: dataStoreValues.shortPoolAmount.returnValues[0],
          longPoolAmountAdjustment: dataStoreValues.longPoolAmountAdjustment.returnValues[0],
          shortPoolAmountAdjustment: dataStoreValues.shortPoolAmountAdjustment.returnValues[0],
          poolValueMin: poolValueMin,
          poolValueMax: poolValueMax,
          reserveFactorLong: dataStoreValues.reserveFactorLong.returnValues[0],
          reserveFactorShort: dataStoreValues.reserveFactorShort.returnValues[0],
          totalBorrowingFees,
          positionImpactPoolAmount: dataStoreValues.positionImpactPoolAmount.returnValues[0],
          swapImpactPoolAmountLong: dataStoreValues.swapImpactPoolAmountLong.returnValues[0],
          swapImpactPoolAmountShort: dataStoreValues.swapImpactPoolAmountShort.returnValues[0],
          borrowingFactorLong: dataStoreValues.borrowingFactorLong.returnValues[0],
          borrowingFactorShort: dataStoreValues.borrowingFactorShort.returnValues[0],
          borrowingExponentFactorLong: dataStoreValues.borrowingExponentFactorLong.returnValues[0],
          borrowingExponentFactorShort: dataStoreValues.borrowingExponentFactorShort.returnValues[0],
          fundingFactor: dataStoreValues.fundingFactor.returnValues[0],
          fundingExponentFactor: dataStoreValues.fundingExponentFactor.returnValues[0],
          pnlLongMax,
          pnlLongMin,
          pnlShortMax,
          pnlShortMin,
          netPnlMax,
          netPnlMin,
          maxPnlFactorForTradersLong: dataStoreValues.maxPnlFactorForTradersLong.returnValues[0],
          maxPnlFactorForTradersShort: dataStoreValues.maxPnlFactorForTradersShort.returnValues[0],
          maxPnlFactorForDepositsLong: dataStoreValues.maxPnlFactorForDepositsLong.returnValues[0],
          maxPnlFactorForDepositsShort: dataStoreValues.maxPnlFactorForDepositsShort.returnValues[0],
          maxPnlFactorForWithdrawalsLong: dataStoreValues.maxPnlFactorForWithdrawalsLong.returnValues[0],
          maxPnlFactorForWithdrawalsShort: dataStoreValues.maxPnlFactorForWithdrawalsShort.returnValues[0],
          minCollateralFactor: dataStoreValues.minCollateralFactor.returnValues[0],
          minCollateralFactorForOpenInterestLong:
            dataStoreValues.minCollateralFactorForOpenInterestLong.returnValues[0],
          minCollateralFactorForOpenInterestShort:
            dataStoreValues.minCollateralFactorForOpenInterestShort.returnValues[0],
          claimableFundingAmountLong: dataStoreValues.claimableFundingAmountLong?.returnValues[0],
          claimableFundingAmountShort: dataStoreValues.claimableFundingAmountShort?.returnValues[0],
          positionFeeFactor: dataStoreValues.positionFeeFactor.returnValues[0],
          positionImpactFactorPositive: dataStoreValues.positionImpactFactorPositive.returnValues[0],
          positionImpactFactorNegative: dataStoreValues.positionImpactFactorNegative.returnValues[0],
          maxPositionImpactFactorPositive: dataStoreValues.maxPositionImpactFactorPositive.returnValues[0],
          maxPositionImpactFactorNegative: dataStoreValues.maxPositionImpactFactorNegative.returnValues[0],
          maxPositionImpactFactorForLiquidations:
            dataStoreValues.maxPositionImpactFactorForLiquidations.returnValues[0],
          positionImpactExponentFactor: dataStoreValues.positionImpactExponentFactor.returnValues[0],
          swapFeeFactor: dataStoreValues.swapFeeFactor.returnValues[0],
          swapImpactFactorPositive: dataStoreValues.swapImpactFactorPositive.returnValues[0],
          swapImpactFactorNegative: dataStoreValues.swapImpactFactorNegative.returnValues[0],
          swapImpactExponentFactor: dataStoreValues.swapImpactExponentFactor.returnValues[0],

          borrowingFactorPerSecondForLongs,
          borrowingFactorPerSecondForShorts,
          fundingFactorPerSecond: bigNumberify(fundingFactorPerSecond)!,
          longsPayShorts,

          virtualPoolAmountForLongToken,
          virtualPoolAmountForShortToken,
          virtualInventoryForPositions,

          virtualMarketId: dataStoreValues.virtualMarketId.returnValues[0],
          virtualLongTokenId: dataStoreValues.virtualLongTokenId.returnValues[0],
          virtualShortTokenId: dataStoreValues.virtualShortTokenId.returnValues[0],
        };

        return acc;
      }, {} as MarketsInfoData);
    },
  });

  if (data) {
    marketsInfoDataCache.current = data;
  }

  return {
    marketsInfoData: marketsInfoDataCache.current,
    tokensData,
    pricesUpdatedAt,
  };
}
