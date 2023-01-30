import { getContract } from "config/contracts";
import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import {
  maxPositionImpactFactorKey,
  positionFeeFactorKey,
  positionImpactExponentFactorKey,
  positionImpactFactorKey,
  swapFeeFactorKey,
  swapImpactExponentFactorKey,
  swapImpactFactorKey,
} from "config/dataStore";
import { useMemo } from "react";
import { MarketsFeesConfigsData } from "./types";
import { getContractMarketPrices, useMarketsData } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { bigNumberify } from "lib/numbers";
import { BigNumber } from "ethers";

type MarketFeesConfigsResult = {
  marketsFeesConfigs: MarketsFeesConfigsData;
  isLoading: boolean;
};

export function useMarketsFeesConfigs(chainId: number): MarketFeesConfigsResult {
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);

  const marketsAddresses = Object.keys(marketsData);

  const isDataLoaded = !isTokensLoading && !isMarketsLoading && marketsAddresses.length > 0;

  const { data, isLoading } = useMulticall(chainId, "useMarketsFeesConfigs", {
    key: isDataLoaded ? [marketsAddresses.join("-")] : undefined,
    request: () =>
      marketsAddresses.reduce((requests, marketAddress) => {
        const marketPrices = getContractMarketPrices(marketsData, tokensData, marketAddress);

        return Object.assign(requests, {
          [`${marketAddress}-reader`]: {
            contractAddress: getContract(chainId, "SyntheticsReader"),
            abi: SyntheticsReader.abi,
            calls: {
              marketInfo: {
                methodName: "getMarketInfo",
                params: [getContract(chainId, "DataStore"), marketPrices, marketAddress],
              },
            },
          },
          [`${marketAddress}-dataStore`]: {
            contractAddress: getContract(chainId, "DataStore"),
            abi: DataStore.abi,
            calls: {
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
            },
          },
        });
      }, {}),
    parseResponse: (res) =>
      marketsAddresses.reduce((feeConfigs, marketAddress) => {
        const marketInfoValues = res[`${marketAddress}-reader`].marketInfo.returnValues;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [market, borrowingFactorPerSecondForLongs, borrowingFactorPerSecondForShorts, funding] = marketInfoValues;

        const [
          longsPayShorts,
          fundingAmountPerSize_LongCollateral_LongPosition,
          fundingAmountPerSize_LongCollateral_ShortPosition,
          fundingAmountPerSize_ShortCollateral_LongPosition,
          fundingAmountPerSize_ShortCollateral_ShortPosition,
        ] = funding;

        const dataStoreValues = res[`${marketAddress}-dataStore`];

        feeConfigs[marketAddress] = {
          positionFeeFactor: dataStoreValues.positionFeeFactor.returnValues[0],
          positionImpactFactorPositive: dataStoreValues.positionImpactFactorPositive.returnValues[0],
          positionImpactFactorNegative: dataStoreValues.positionImpactFactorNegative.returnValues[0],
          maxPositionImpactFactorPositive: dataStoreValues.maxPositionImpactFactorPositive.returnValues[0],
          maxPositionImpactFactorNegative: dataStoreValues.maxPositionImpactFactorNegative.returnValues[0],
          positionImpactExponentFactor: dataStoreValues.positionImpactExponentFactor.returnValues[0],
          swapFeeFactor: dataStoreValues.swapFeeFactor.returnValues[0],
          swapImpactFactorPositive: dataStoreValues.swapImpactFactorPositive.returnValues[0],
          swapImpactFactorNegative: dataStoreValues.swapImpactFactorNegative.returnValues[0],
          swapImpactExponentFactor: dataStoreValues.swapImpactExponentFactor.returnValues[0],

          borrowingFactorPerSecondForLongs,
          borrowingFactorPerSecondForShorts,

          fundingPerSecond: BigNumber.from(0),
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

        return feeConfigs;
      }, {} as MarketsFeesConfigsData),
  });

  return useMemo(() => {
    return {
      marketsFeesConfigs: data || {},
      isLoading,
    };
  }, [data, isLoading]);
}
