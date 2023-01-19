import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useMemo } from "react";
import { getContract } from "config/contracts";
import { getMarket } from "./utils";
import { useMulticall } from "lib/multicall";
import { useMarketsData } from "./useMarketsData";
import { MarketsPoolsData } from "./types";
import {
  cumulativeBorrowingFactorKey,
  poolAmountKey,
  positionImpactPoolAmountKey,
  reserveFactorKey,
  totalBorrowingKey,
} from "config/dataStore";
import { convertToContractPrices, getTokenData, useAvailableTokensData } from "../tokens";

type MarketPoolsResult = {
  isLoading: boolean;
  poolsData: MarketsPoolsData;
};

export function useMarketsPoolsData(chainId: number): MarketPoolsResult {
  const { marketsData } = useMarketsData(chainId);
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const { data, isLoading } = useMulticall(chainId, "useMarketsPools", {
    key: !isTokensLoading && marketAddresses.length > 0 && [marketAddresses.join("-")],
    request: () =>
      marketAddresses.reduce((request, marketAddress) => {
        const market = getMarket(marketsData, marketAddress);
        const dataStoreAddress = getContract(chainId, "DataStore");
        const indexToken = getTokenData(tokensData, market?.indexTokenAddress);

        if (!market || !indexToken?.prices) {
          return request;
        }

        const indexTokenPrices = convertToContractPrices(indexToken.prices!, indexToken.decimals);

        return Object.assign(request, {
          [`${marketAddress}-reader`]: {
            contractAddress: getContract(chainId, "SyntheticsReader"),
            abi: SyntheticsReader.abi,
            calls: {
              netPnlMax: {
                methodName: "getNetPnl",
                params: [
                  dataStoreAddress,
                  marketAddress,
                  market.longTokenAddress,
                  market.shortTokenAddress,
                  indexTokenPrices,
                  true,
                ],
              },
              netPnlMin: {
                methodName: "getNetPnl",
                params: [
                  dataStoreAddress,
                  marketAddress,
                  market.longTokenAddress,
                  market.shortTokenAddress,
                  indexTokenPrices,
                  false,
                ],
              },
              pnlLongMax: {
                methodName: "getPnl",
                params: [dataStoreAddress, marketAddress, market.longTokenAddress, indexTokenPrices, true, true],
              },
              pnlLongMin: {
                methodName: "getPnl",
                params: [dataStoreAddress, marketAddress, market.longTokenAddress, indexTokenPrices, true, false],
              },
              pnlShortMax: {
                methodName: "getPnl",
                params: [dataStoreAddress, marketAddress, market.longTokenAddress, indexTokenPrices, false, true],
              },
              pnlShortMin: {
                methodName: "getPnl",
                params: [dataStoreAddress, marketAddress, market.longTokenAddress, indexTokenPrices, false, false],
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
              positionImpactPoolAmount: {
                methodName: "getUint",
                params: [positionImpactPoolAmountKey(marketAddress)],
              },
            },
          },
        });
      }, {}),
    parseResponse: (res) =>
      marketAddresses.reduce((acc: MarketsPoolsData, marketAddress: string) => {
        const reader = res[`${marketAddress}-reader`];
        const dataStore = res[`${marketAddress}-dataStore`];

        acc[marketAddress] = {
          longPoolAmount: dataStore.longPoolAmount.returnValues[0],
          shortPoolAmount: dataStore.shortPoolAmount.returnValues[0],
          reserveFactorLong: dataStore.reserveFactorLong.returnValues[0],
          reserveFactorShort: dataStore.reserveFactorShort.returnValues[0],
          totalBorrowingLong: dataStore.totalBorrowingLong.returnValues[0],
          totalBorrowingShort: dataStore.totalBorrowingShort.returnValues[0],
          cummulativeBorrowingFactorLong: dataStore.cummulativeBorrowingFactorLong.returnValues[0],
          cummulativeBorrowingFactorShort: dataStore.cummulativeBorrowingFactorShort.returnValues[0],
          positionImpactPoolAmount: dataStore.positionImpactPoolAmount.returnValues[0],
          netPnlMax: reader.netPnlMax.returnValues[0],
          netPnlMin: reader.netPnlMin.returnValues[0],
          pnlLongMax: reader.pnlLongMax.returnValues[0],
          pnlLongMin: reader.pnlLongMin.returnValues[0],
          pnlShortMax: reader.pnlShortMax.returnValues[0],
          pnlShortMin: reader.pnlShortMin.returnValues[0],
        };

        return acc;
      }, {} as MarketsPoolsData),
  });

  return useMemo(() => {
    return {
      poolsData: data || {},
      isLoading,
    };
  }, [data, isLoading]);
}
