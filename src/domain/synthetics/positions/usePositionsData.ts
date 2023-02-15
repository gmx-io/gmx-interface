import { useWeb3React } from "@web3-react/core";
import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { accountPositionListKey } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { useEffect, useState } from "react";
import { PositionsData } from "./types";
import { getPositionKey } from "./utils";

type PositionsDataResult = {
  positionsData: PositionsData;
  isLoading: boolean;
};

const DEFAULT_COUNT = 100;

export function usePositionsData(chainId: number): PositionsDataResult {
  const { account } = useWeb3React();
  const [positionsData, setPositionsData] = useState<PositionsData>({});
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(DEFAULT_COUNT);

  const { data, isLoading } = useMulticall(chainId, "usePositionsData", {
    key: account ? [account, startIndex, endIndex] : null,
    request: () => ({
      positionStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          count: {
            methodName: "getBytes32Count",
            params: [accountPositionListKey(account!)],
          },
        },
      },
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          positions: {
            methodName: "getAccountPositionInfoList",
            params: [getContract(chainId, "DataStore"), account, startIndex, endIndex],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const count = Number(res.positionStore.count.returnValues[0]);
      const positions = res.reader.positions.returnValues;

      return {
        count,
        positionsData: positions.reduce((positionsMap: PositionsData, positionInfo) => {
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
        }, {} as PositionsData),
      };
    },
  });

  useEffect(() => {
    if (!account) {
      setPositionsData({});
      setStartIndex(0);
      setEndIndex(DEFAULT_COUNT);
      return;
    }

    if (data?.count && data.count > endIndex) {
      setStartIndex(endIndex);
      setEndIndex(data.count);
    }

    if (data?.positionsData) {
      setPositionsData((old) => ({
        ...old,
        ...data.positionsData,
      }));
    }
  }, [account, data?.positionsData, data?.count, endIndex]);

  return {
    positionsData,
    isLoading: isLoading,
  };
}
