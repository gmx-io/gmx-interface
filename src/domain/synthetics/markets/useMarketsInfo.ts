import { useWeb3React } from "@web3-react/core";
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
  isMarketDisabledKey,
  maxPnlFactorKey,
  maxPoolAmountKey,
  maxPositionImpactFactorForLiquidationsKey,
  maxPositionImpactFactorKey,
  minCollateralFactorForOpenInterest,
  minCollateralFactorKey,
  openInterestInTokensKey,
  openInterestKey,
  openInterestReserveFactorKey,
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
import { BigNumber } from "ethers";
import { useMulticall } from "lib/multicall";
import { getByKey } from "lib/objects";
import { useRef } from "react";
import { TokensData, useTokensData } from "../tokens";
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
  const { tokensData, pricesUpdatedAt } = useTokensData(chainId);
  const dataStoreAddress = getContract(chainId, "DataStore");

  const isDepencenciesLoading = !marketsAddresses || !tokensData;

  // Use ref to cache data from previos key with old prices
  const marketsInfoDataCache = useRef<MarketsInfoData>();

  const { data } = useMulticall(chainId, "useMarketsInfo", {
    key: !isDepencenciesLoading &&
      marketsAddresses.length > 0 && [marketsAddresses.join("-"), dataStoreAddress, account, pricesUpdatedAt],

    // Refreshed on every prices update
    refreshInterval: null,

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
              maxLongPoolAmount: {
                methodName: "getUint",
                params: [maxPoolAmountKey(marketAddress, market.longTokenAddress)],
              },
              maxShortPoolAmount: {
                methodName: "getUint",
                params: [maxPoolAmountKey(marketAddress, market.shortTokenAddress)],
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
          return acc;
        }

        const longInterestUsingLongToken = BigNumber.from(dataStoreValues.longInterestUsingLongToken.returnValues[0]);
        const longInterestUsingShortToken = BigNumber.from(dataStoreValues.longInterestUsingShortToken.returnValues[0]);
        const shortInterestUsingLongToken = BigNumber.from(dataStoreValues.shortInterestUsingLongToken.returnValues[0]);
        const shortInterestUsingShortToken = BigNumber.from(
          dataStoreValues.shortInterestUsingShortToken.returnValues[0]
        );

        const longInterestUsd = longInterestUsingLongToken.add(longInterestUsingShortToken);
        const shortInterestUsd = shortInterestUsingLongToken.add(shortInterestUsingShortToken);

        const longInterestInTokensUsingLongToken = BigNumber.from(
          dataStoreValues.longInterestInTokensUsingLongToken.returnValues[0]
        );
        const longInterestInTokensUsingShortToken = BigNumber.from(
          dataStoreValues.longInterestInTokensUsingShortToken.returnValues[0]
        );
        const shortInterestInTokensUsingLongToken = BigNumber.from(
          dataStoreValues.shortInterestInTokensUsingLongToken.returnValues[0]
        );
        const shortInterestInTokensUsingShortToken = BigNumber.from(
          dataStoreValues.shortInterestInTokensUsingShortToken.returnValues[0]
        );

        const longInterestInTokens = longInterestInTokensUsingLongToken.add(longInterestInTokensUsingShortToken);
        const shortInterestInTokens = shortInterestInTokensUsingLongToken.add(shortInterestInTokensUsingShortToken);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { nextFunding, virtualInventory } = readerValues.marketInfo.returnValues;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_priceMin, poolValueInfoMin] = readerValues.marketTokenPriceMin.returnValues;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_priceMax, poolValueInfoMax] = readerValues.marketTokenPriceMax.returnValues;

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
          longPoolAmount: BigNumber.from(dataStoreValues.longPoolAmount.returnValues[0]),
          shortPoolAmount: BigNumber.from(dataStoreValues.shortPoolAmount.returnValues[0]),
          maxLongPoolAmount: BigNumber.from(dataStoreValues.maxLongPoolAmount.returnValues[0]),
          maxShortPoolAmount: BigNumber.from(dataStoreValues.maxShortPoolAmount.returnValues[0]),
          longPoolAmountAdjustment: BigNumber.from(dataStoreValues.longPoolAmountAdjustment.returnValues[0]),
          shortPoolAmountAdjustment: BigNumber.from(dataStoreValues.shortPoolAmountAdjustment.returnValues[0]),
          poolValueMin: BigNumber.from(poolValueInfoMin.poolValue),
          poolValueMax: BigNumber.from(poolValueInfoMax.poolValue),
          reserveFactorLong: BigNumber.from(dataStoreValues.reserveFactorLong.returnValues[0]),
          reserveFactorShort: BigNumber.from(dataStoreValues.reserveFactorShort.returnValues[0]),
          openInterestReserveFactorLong: BigNumber.from(dataStoreValues.openInterestReserveFactorLong.returnValues[0]),
          openInterestReserveFactorShort: BigNumber.from(
            dataStoreValues.openInterestReserveFactorShort.returnValues[0]
          ),
          totalBorrowingFees: BigNumber.from(poolValueInfoMax.totalBorrowingFees),
          positionImpactPoolAmount: BigNumber.from(dataStoreValues.positionImpactPoolAmount.returnValues[0]),
          swapImpactPoolAmountLong: BigNumber.from(dataStoreValues.swapImpactPoolAmountLong.returnValues[0]),
          swapImpactPoolAmountShort: BigNumber.from(dataStoreValues.swapImpactPoolAmountShort.returnValues[0]),
          borrowingFactorLong: BigNumber.from(dataStoreValues.borrowingFactorLong.returnValues[0]),
          borrowingFactorShort: BigNumber.from(dataStoreValues.borrowingFactorShort.returnValues[0]),
          borrowingExponentFactorLong: BigNumber.from(dataStoreValues.borrowingExponentFactorLong.returnValues[0]),
          borrowingExponentFactorShort: BigNumber.from(dataStoreValues.borrowingExponentFactorShort.returnValues[0]),
          fundingFactor: BigNumber.from(dataStoreValues.fundingFactor.returnValues[0]),
          fundingExponentFactor: BigNumber.from(dataStoreValues.fundingExponentFactor.returnValues[0]),
          pnlLongMax: BigNumber.from(poolValueInfoMax.longPnl),
          pnlLongMin: BigNumber.from(poolValueInfoMin.longPnl),
          pnlShortMax: BigNumber.from(poolValueInfoMax.shortPnl),
          pnlShortMin: BigNumber.from(poolValueInfoMin.shortPnl),
          netPnlMax: BigNumber.from(poolValueInfoMax.netPnl),
          netPnlMin: BigNumber.from(poolValueInfoMin.netPnl),

          maxPnlFactorForTradersLong: BigNumber.from(dataStoreValues.maxPnlFactorForTradersLong.returnValues[0]),
          maxPnlFactorForTradersShort: BigNumber.from(dataStoreValues.maxPnlFactorForTradersShort.returnValues[0]),

          minCollateralFactor: BigNumber.from(dataStoreValues.minCollateralFactor.returnValues[0]),
          minCollateralFactorForOpenInterestLong: BigNumber.from(
            dataStoreValues.minCollateralFactorForOpenInterestLong.returnValues[0]
          ),

          minCollateralFactorForOpenInterestShort: BigNumber.from(
            dataStoreValues.minCollateralFactorForOpenInterestShort.returnValues[0]
          ),

          claimableFundingAmountLong: dataStoreValues.claimableFundingAmountLong
            ? BigNumber.from(dataStoreValues.claimableFundingAmountLong?.returnValues[0])
            : undefined,

          claimableFundingAmountShort: dataStoreValues.claimableFundingAmountShort
            ? BigNumber.from(dataStoreValues.claimableFundingAmountShort?.returnValues[0])
            : undefined,

          positionFeeFactorForPositiveImpact: BigNumber.from(
            dataStoreValues.positionFeeFactorForPositiveImpact.returnValues[0]
          ),
          positionFeeFactorForNegativeImpact: BigNumber.from(
            dataStoreValues.positionFeeFactorForNegativeImpact.returnValues[0]
          ),
          positionImpactFactorPositive: BigNumber.from(dataStoreValues.positionImpactFactorPositive.returnValues[0]),
          positionImpactFactorNegative: BigNumber.from(dataStoreValues.positionImpactFactorNegative.returnValues[0]),
          maxPositionImpactFactorPositive: BigNumber.from(
            dataStoreValues.maxPositionImpactFactorPositive.returnValues[0]
          ),
          maxPositionImpactFactorNegative: BigNumber.from(
            dataStoreValues.maxPositionImpactFactorNegative.returnValues[0]
          ),
          maxPositionImpactFactorForLiquidations: BigNumber.from(
            dataStoreValues.maxPositionImpactFactorForLiquidations.returnValues[0]
          ),
          positionImpactExponentFactor: BigNumber.from(dataStoreValues.positionImpactExponentFactor.returnValues[0]),
          swapFeeFactorForPositiveImpact: BigNumber.from(
            dataStoreValues.swapFeeFactorForPositiveImpact.returnValues[0]
          ),
          swapFeeFactorForNegativeImpact: BigNumber.from(
            dataStoreValues.swapFeeFactorForNegativeImpact.returnValues[0]
          ),
          swapImpactFactorPositive: BigNumber.from(dataStoreValues.swapImpactFactorPositive.returnValues[0]),
          swapImpactFactorNegative: BigNumber.from(dataStoreValues.swapImpactFactorNegative.returnValues[0]),
          swapImpactExponentFactor: BigNumber.from(dataStoreValues.swapImpactExponentFactor.returnValues[0]),

          borrowingFactorPerSecondForLongs: BigNumber.from(
            readerValues.marketInfo.returnValues.borrowingFactorPerSecondForLongs
          ),

          borrowingFactorPerSecondForShorts: BigNumber.from(
            readerValues.marketInfo.returnValues.borrowingFactorPerSecondForShorts
          ),

          fundingFactorPerSecond: BigNumber.from(nextFunding.fundingFactorPerSecond),
          longsPayShorts: nextFunding.longsPayShorts,

          virtualPoolAmountForLongToken: BigNumber.from(virtualInventory.virtualPoolAmountForLongToken),
          virtualPoolAmountForShortToken: BigNumber.from(virtualInventory.virtualPoolAmountForShortToken),
          virtualInventoryForPositions: BigNumber.from(virtualInventory.virtualInventoryForPositions),

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
