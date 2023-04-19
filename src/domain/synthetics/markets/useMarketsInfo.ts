import { useWeb3React } from "@web3-react/core";
import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import {
  BORROWING_FEE_RECEIVER_FACTOR_KEY,
  MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
  claimableFundingAmountKey,
  cumulativeBorrowingFactorKey,
  maxPnlFactorKey,
  maxPositionImpactFactorForLiquidationsKey,
  maxPositionImpactFactorKey,
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
  totalBorrowingKey,
} from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useAvailableTokensData } from "../tokens";
import { MarketsInfoData } from "./types";
import { useMarkets } from "./useMarkets";
import { getContractMarketPrices } from "./utils";

export type MarketsInfoResult = {
  marketsInfoData?: MarketsInfoData;
};

export function useMarketsInfo(chainId: number): MarketsInfoResult {
  const { account } = useWeb3React();
  const { marketsData, marketsAddresses } = useMarkets(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const dataStoreAddress = getContract(chainId, "DataStore");

  const isDepencenciesLoading = !marketsAddresses || !tokensData;

  const { data } = useMulticall(chainId, "useMarketsInfo", {
    key: !isDepencenciesLoading &&
      marketsAddresses.length > 0 && [marketsAddresses.join("-"), dataStoreAddress, account],

    request: () =>
      marketsAddresses!.reduce((request, marketAddress) => {
        const market = getByKey(marketsData, marketAddress)!;
        const marketPrices = getContractMarketPrices(tokensData!, market)!;

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
              totalBorrowingLong: {
                methodName: "getUint",
                params: [totalBorrowingKey(marketAddress, true)],
              },
              totalBorrowingShort: {
                methodName: "getUint",
                params: [totalBorrowingKey(marketAddress, false)],
              },
              cummulativeBorrowingFactorLong: {
                methodName: "getUint",
                params: [cumulativeBorrowingFactorKey(marketAddress, true)],
              },
              cummulativeBorrowingFactorShort: {
                methodName: "getUint",
                params: [cumulativeBorrowingFactorKey(marketAddress, false)],
              },
              borrowingFeeReceiverFactor: {
                methodName: "getUint",
                params: [BORROWING_FEE_RECEIVER_FACTOR_KEY],
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
            },
          },
        });
      }, {}),
    parseResponse: (res) => {
      return marketsAddresses!.reduce((acc: MarketsInfoData, marketAddress) => {
        const readerValues = res[`${marketAddress}-reader`];
        const dataStoreValues = res[`${marketAddress}-dataStore`];

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
        const [_, borrowingFactorPerSecondForLongs, borrowingFactorPerSecondForShorts, funding] =
          readerValues.marketInfo.returnValues;

        const [
          longsPayShorts,
          fundingPerSecond,
          fundingAmountPerSize_LongCollateral_LongPosition,
          fundingAmountPerSize_LongCollateral_ShortPosition,
          fundingAmountPerSize_ShortCollateral_LongPosition,
          fundingAmountPerSize_ShortCollateral_ShortPosition,
        ] = funding;

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
        const indexToken = getByKey(tokensData!, market.indexTokenAddress)!;

        acc[marketAddress] = {
          ...market,
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
          totalBorrowingLong: dataStoreValues.totalBorrowingLong.returnValues[0],
          totalBorrowingShort: dataStoreValues.totalBorrowingShort.returnValues[0],
          totalBorrowingFees,
          cummulativeBorrowingFactorLong: dataStoreValues.cummulativeBorrowingFactorLong.returnValues[0],
          cummulativeBorrowingFactorShort: dataStoreValues.cummulativeBorrowingFactorShort.returnValues[0],
          borrowingFeeReceiverFactor: dataStoreValues.borrowingFeeReceiverFactor.returnValues[0],
          positionImpactPoolAmount: dataStoreValues.positionImpactPoolAmount.returnValues[0],
          swapImpactPoolAmountLong: dataStoreValues.swapImpactPoolAmountLong.returnValues[0],
          swapImpactPoolAmountShort: dataStoreValues.swapImpactPoolAmountShort.returnValues[0],
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
          fundingPerSecond: bigNumberify(fundingPerSecond)!,
          longsPayShorts,
          fundingAmountPerSize_LongCollateral_LongPosition: bigNumberify(
            fundingAmountPerSize_LongCollateral_LongPosition
          )!,
          fundingAmountPerSize_LongCollateral_ShortPosition: bigNumberify(
            fundingAmountPerSize_LongCollateral_ShortPosition
          )!,
          fundingAmountPerSize_ShortCollateral_LongPosition: bigNumberify(
            fundingAmountPerSize_ShortCollateral_LongPosition
          )!,
          fundingAmountPerSize_ShortCollateral_ShortPosition: bigNumberify(
            fundingAmountPerSize_ShortCollateral_ShortPosition
          )!,
        };

        return acc;
      }, {} as MarketsInfoData);
    },
  });

  return {
    marketsInfoData: data,
  };
}
