import { useWeb3React } from "@web3-react/core";
import { getContract } from "config/contracts";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import { PositionsData } from "./types";
import { getPositionKey } from "./utils";
import { useMemo } from "react";
import { bigNumberify } from "lib/numbers";
import { BigNumber } from "ethers";

export function usePositionsData(chainId: number): PositionsData {
  const { account } = useWeb3React();

  const { data: positionsMap } = useMulticall(chainId, "usePositionsData-positions", {
    key: account ? [account] : null,
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          positions: {
            methodName: "getAccountPositionInfoList",
            params: [
              getContract(chainId, "DataStore"),
              getContract(chainId, "MarketStore"),
              getContract(chainId, "PositionStore"),
              account,
              0,
              // TODO: pagination
              100,
            ],
          },
        },
      },
    }),
    parseResponse: (res) =>
      res.reader.positions.returnValues.reduce((positionsMap: PositionsData, positionInfo) => {
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

        const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, isLong);

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
          pendingBorrowingFees: bigNumberify(pendingBorrowingFees) || BigNumber.from(0),
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
  });

  return useMemo(() => {
    return positionsMap || {};
  }, [positionsMap]);
}
