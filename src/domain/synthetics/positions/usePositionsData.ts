import { useWeb3React } from "@web3-react/core";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { accountPositionListKey, hashedPositionKey } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import DataStore from "abis/DataStore.json";
import { bigNumberify } from "lib/numbers";
import { useMemo } from "react";
import { ContractMarketPrices, getContractMarketPrices, useMarkets } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { PositionsData } from "./types";
import { getPositionKey } from "./utils";

type PositionsDataResult = {
  positionsData: PositionsData;
  isLoading: boolean;
};

const defaultValue = {};

export function usePositionsData(chainId: number): PositionsDataResult {
  const { account } = useWeb3React();
  const { marketsData, isLoading: isMarketsLoading } = useMarkets(chainId);
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);

  const { data: positionsKeys } = useMulticall(chainId, "usePositionsData-keys", {
    key: account ? [account] : null,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          keys: {
            methodName: "getBytes32ValuesAt",
            params: [accountPositionListKey(account!), 0, 300],
          },
        },
      },
    }),
    parseResponse: (res) => {
      return res.dataStore.keys.returnValues;
    },
  });

  const queryParams = useMemo(() => {
    if (!account || isMarketsLoading || isTokensLoading || !positionsKeys?.length) return undefined;

    const markets = Object.values(marketsData);
    const marketPricesByPositionsKeys: { [key: string]: ContractMarketPrices } = {};

    for (const market of markets) {
      const marketPrices = getContractMarketPrices(tokensData, market);

      for (const collateralAddress of [market.longTokenAddress, market.shortTokenAddress]) {
        for (const isLong of [true, false]) {
          const key = hashedPositionKey(account, market.marketTokenAddress, collateralAddress, isLong);

          marketPricesByPositionsKeys[key] = marketPrices;
        }
      }
    }

    const marketPricesArray = positionsKeys.map((key) => marketPricesByPositionsKeys[key]);

    if (marketPricesArray.length !== positionsKeys.length) {
      return undefined;
    }

    return {
      positionsKeys,
      marketPricesArray,
    };
  }, [account, isMarketsLoading, isTokensLoading, marketsData, positionsKeys, tokensData]);

  const { data: positionsData = defaultValue, isLoading } = useMulticall(chainId, "usePositionsData", {
    key: queryParams?.positionsKeys.length ? [queryParams.positionsKeys.join("-")] : null,
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          positions: {
            methodName: "getAccountPositionInfoList",
            params: [getContract(chainId, "DataStore"), queryParams!.positionsKeys, queryParams!.marketPricesArray],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const positions = res.reader.positions.returnValues;

      return positions.reduce((positionsMap: PositionsData, positionInfo) => {
        const [positionProps, pendingBorrowingFees, fundingFees] = positionInfo;
        const [addresses, numbers, flags, data] = positionProps;
        const [account, marketAddress, collateralTokenAddress] = addresses;
        const [
          sizeInUsd,
          sizeInTokens,
          collateralAmount,
          borrowingFactor,
          longTokenFundingAmountPerSize,
          shortTokenFundingAmountPerSize,
          increasedAtBlock,
          decreasedAtBlock,
        ] = numbers.map(bigNumberify);

        const [isLong] = flags;

        const [
          fundingFeeAmount,
          claimableLongTokenAmount,
          claimableShortTokenAmount,
          latestLongTokenFundingAmountPerSize,
          latestShortTokenFundingAmountPerSize,
          hasPendingLongTokenFundingFee,
          hasPendingShortTokenFundingFee,
        ] = fundingFees.map((item) => (typeof item === "boolean" ? item : bigNumberify(item)));

        const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, isLong)!;

        positionsMap[positionKey] = {
          key: positionKey,
          account,
          marketAddress,
          collateralTokenAddress,
          sizeInUsd,
          sizeInTokens,
          collateralAmount,
          borrowingFactor,
          longTokenFundingAmountPerSize,
          shortTokenFundingAmountPerSize,
          increasedAtBlock,
          decreasedAtBlock,
          isLong,
          pendingBorrowingFees: bigNumberify(pendingBorrowingFees)!,
          pendingFundingFees: {
            fundingFeeAmount,
            claimableLongTokenAmount,
            claimableShortTokenAmount,
            latestLongTokenFundingAmountPerSize,
            latestShortTokenFundingAmountPerSize,
            hasPendingLongTokenFundingFee,
            hasPendingShortTokenFundingFee,
          },
          data,
        };

        return positionsMap;
      }, {} as PositionsData);
    },
  });

  return {
    positionsData,
    isLoading,
  };
}
