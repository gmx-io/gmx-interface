import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import {
  BORROWING_FEE_RECEIVER_FACTOR_KEY,
  claimableFundingAmountKey,
  cumulativeBorrowingFactorKey,
  maxPnlFactorForWithdrawalsKey,
  maxPnlFactorKey,
  poolAmountKey,
  positionImpactPoolAmountKey,
  reserveFactorKey,
  swapImpactPoolAmountKey,
  totalBorrowingKey,
} from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { convertToContractPrices, getTokenData, useAvailableTokensData } from "../tokens";
import { MarketsPoolsData } from "./types";
import { useMarketsData } from "./useMarketsData";
import { getMarket } from "./utils";
import { useWeb3React } from "@web3-react/core";

type MarketPoolsResult = {
  isLoading: boolean;
  poolsData: MarketsPoolsData;
};

const defaultValue = {};

export function useMarketsPoolsData(chainId: number): MarketPoolsResult {
  const { account } = useWeb3React();
  const { marketsData } = useMarketsData(chainId);
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const { data = defaultValue, isLoading } = useMulticall(chainId, "useMarketsPools", {
    key: !isTokensLoading && marketAddresses.length > 0 && [marketAddresses.join("-"), account],
    request: () =>
      marketAddresses.reduce((request, marketAddress) => {
        const market = getMarket(marketsData, marketAddress);
        const dataStoreAddress = getContract(chainId, "DataStore");
        const indexToken = getTokenData(tokensData, market?.indexTokenAddress);

        if (!market || !indexToken?.prices) {
          return request;
        }

        const indexTokenPrices = convertToContractPrices(indexToken.prices!, indexToken.decimals);

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
              netPnlMax: {
                methodName: "getNetPnl",
                params: [dataStoreAddress, marketProps, indexTokenPrices, true],
              },
              netPnlMin: {
                methodName: "getNetPnl",
                params: [dataStoreAddress, marketProps, indexTokenPrices, false],
              },
              pnlLongMax: {
                methodName: "getPnl",
                params: [dataStoreAddress, marketProps, indexTokenPrices, true, true],
              },
              pnlLongMin: {
                methodName: "getPnl",
                params: [dataStoreAddress, marketProps, indexTokenPrices, true, false],
              },
              pnlShortMax: {
                methodName: "getPnl",
                params: [dataStoreAddress, marketProps, indexTokenPrices, false, true],
              },
              pnlShortMin: {
                methodName: "getPnl",
                params: [dataStoreAddress, marketProps, indexTokenPrices, false, false],
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
              maxPnlFactorLong: {
                methodName: "getUint",
                params: [maxPnlFactorKey(marketAddress, true)],
              },
              maxPnlFactorShort: {
                methodName: "getUint",
                params: [maxPnlFactorKey(marketAddress, false)],
              },
              maxPnlFactorForWithdrawalsLong: {
                methodName: "getUint",
                params: [maxPnlFactorForWithdrawalsKey(marketAddress, true)],
              },
              maxPnlFactorForWithdrawalsShort: {
                methodName: "getUint",
                params: [maxPnlFactorForWithdrawalsKey(marketAddress, false)],
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
          borrowingFeeReceiverFactor: dataStore.borrowingFeeReceiverFactor.returnValues[0],
          positionImpactPoolAmount: dataStore.positionImpactPoolAmount.returnValues[0],
          swapImpactPoolAmountLong: dataStore.swapImpactPoolAmountLong.returnValues[0],
          swapImpactPoolAmountShort: dataStore.swapImpactPoolAmountShort.returnValues[0],
          netPnlMax: reader.netPnlMax.returnValues[0],
          netPnlMin: reader.netPnlMin.returnValues[0],
          pnlLongMax: reader.pnlLongMax.returnValues[0],
          pnlLongMin: reader.pnlLongMin.returnValues[0],
          pnlShortMax: reader.pnlShortMax.returnValues[0],
          pnlShortMin: reader.pnlShortMin.returnValues[0],
          maxPnlFactorLong: dataStore.maxPnlFactorLong.returnValues[0],
          maxPnlFactorShort: dataStore.maxPnlFactorShort.returnValues[0],
          maxPnlFactorForWithdrawalsLong: dataStore.maxPnlFactorForWithdrawalsLong.returnValues[0],
          maxPnlFactorForWithdrawalsShort: dataStore.maxPnlFactorForWithdrawalsShort.returnValues[0],
          claimableFundingAmountLong: dataStore.claimableFundingAmountLong?.returnValues[0],
          claimableFundingAmountShort: dataStore.claimableFundingAmountShort?.returnValues[0],
        };

        return acc;
      }, {} as MarketsPoolsData),
  });

  return {
    poolsData: data,
    isLoading,
  };
}
