import { useWeb3React } from "@web3-react/core";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { hashedPositionKey } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { useMemo } from "react";
import { ContractMarketPrices, getContractMarketPrices, useMarketsData } from "../markets";
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
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);

  const queryParams = useMemo(() => {
    if (!account || isMarketsLoading || isTokensLoading) return undefined;

    const markets = Object.values(marketsData);
    const positionKeys: string[] = [];
    const marketPricesArray: ContractMarketPrices[] = [];

    for (const market of markets) {
      const marketPrices = getContractMarketPrices(marketsData, tokensData, market.marketTokenAddress);

      if (!marketPrices) continue;

      for (const collateralAddress of [market.longTokenAddress, market.shortTokenAddress]) {
        for (const isLong of [true, false]) {
          const key = hashedPositionKey(account, market.marketTokenAddress, collateralAddress, isLong);

          positionKeys.push(key);
          marketPricesArray.push(marketPrices);
        }
      }
    }

    return {
      positionKeys,
      marketPricesArray,
    };
  }, [account, isMarketsLoading, isTokensLoading, marketsData, tokensData]);

  const { data: positionsData = defaultValue, isLoading } = useMulticall(chainId, "usePositionsData", {
    key: queryParams?.positionKeys.length ? [queryParams.positionKeys.join("-")] : null,
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          positions: {
            methodName: "getAccountPositionInfoList",
            params: [getContract(chainId, "DataStore"), queryParams!.positionKeys, queryParams!.marketPricesArray],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const positions = res.reader.positions.returnValues;

      return positions.reduce((positionsMap: PositionsData, positionInfo) => {
        // TODO: parsing from abi?
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
