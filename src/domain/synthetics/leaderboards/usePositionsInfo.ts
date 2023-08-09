
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { useMulticall } from "lib/multicall";
import { useRef } from "react";
import { PositionsData, getPositionKey, useOptimisticPositions } from "../positions";
import { ContractMarketPrices } from "../markets";

type PositionsResult = {
  positionsData?: PositionsData;
  allPossiblePositionsKeys?: string[];
};

export function usePositionsInfo(
  chainId: number,
  positionKeys: string[],
  marketPrices: ContractMarketPrices[],
  pricesUpdatedAt?: number,
): PositionsResult {
  const positionsDataCache = useRef<PositionsData>();
  const { data: positionsData } = useMulticall(chainId, "usePositionsData", {
    key: positionKeys.length ? [positionKeys.join("-"), pricesUpdatedAt] : null,
    refreshInterval: null, // Refresh on every prices update
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          positions: {
            methodName: "getAccountPositionInfoList",
            params: [
              getContract(chainId, "DataStore"),
              getContract(chainId, "ReferralStorage"),
              positionKeys,
              marketPrices,
              ethers.constants.AddressZero, // uiFeeReceiver
            ],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const positions = res.data.reader.positions.returnValues;

      return positions.reduce((positionsMap: PositionsData, positionInfo, i) => {
        const { position, fees } = positionInfo;
        const { addresses, numbers, flags, data } = position;
        const { account, market: marketAddress, collateralToken: collateralTokenAddress } = addresses;

        // Empty position
        if (BigNumber.from(numbers.increasedAtBlock).eq(0)) {
          return positionsMap;
        }

        const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong);
        const contractPositionKey = positionKeys[i];

        positionsMap[positionKey] = {
          key: positionKey,
          contractKey: contractPositionKey,
          account,
          marketAddress,
          collateralTokenAddress,
          sizeInUsd: BigNumber.from(numbers.sizeInUsd),
          sizeInTokens: BigNumber.from(numbers.sizeInTokens),
          collateralAmount: BigNumber.from(numbers.collateralAmount),
          increasedAtBlock: BigNumber.from(numbers.increasedAtBlock),
          decreasedAtBlock: BigNumber.from(numbers.decreasedAtBlock),
          isLong: flags.isLong,
          pendingBorrowingFeesUsd: BigNumber.from(fees.borrowing.borrowingFeeUsd),
          fundingFeeAmount: BigNumber.from(fees.funding.fundingFeeAmount),
          claimableLongTokenAmount: BigNumber.from(fees.funding.claimableLongTokenAmount),
          claimableShortTokenAmount: BigNumber.from(fees.funding.claimableShortTokenAmount),
          data,
        };

        return positionsMap;
      }, {} as PositionsData);
    },
  });

  if (positionsData) {
    positionsDataCache.current = positionsData;
  }

  const optimisticPositionsData = useOptimisticPositions({
    positionsData: positionsDataCache.current,
    allPositionsKeys: positionKeys,
  });

  return {
    positionsData: optimisticPositionsData,
  };
}
