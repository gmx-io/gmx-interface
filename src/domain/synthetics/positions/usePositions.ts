import { useWeb3React } from "@web3-react/core";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { hashedPositionKey } from "config/dataStore";
import { ethers } from "ethers";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { useMemo } from "react";
import { ContractMarketPrices, getContractMarketPrices, useMarkets } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { PositionsData } from "./types";
import { getPositionKey } from "./utils";

type PositionsResult = {
  positionsData?: PositionsData;
  allPossiblePositionsKeys?: string[];
};

export function usePositions(chainId: number): PositionsResult {
  const { account } = useWeb3React();
  const { marketsData } = useMarkets(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const keysAndPrices = useMemo(() => {
    if (!account || !marketsData || !tokensData) {
      return undefined;
    }

    const markets = Object.values(marketsData);

    const positionsKeys: string[] = [];
    const contractPositionsKeys: string[] = [];
    const marketsPrices: ContractMarketPrices[] = [];

    for (const market of markets) {
      const marketPrices = getContractMarketPrices(tokensData, market);

      if (!marketPrices) {
        continue;
      }

      const collaterals = market.isSameCollaterals
        ? [market.longTokenAddress]
        : [market.longTokenAddress, market.shortTokenAddress];

      for (const collateralAddress of collaterals) {
        for (const isLong of [true, false]) {
          const positionKey = getPositionKey(account, market.marketTokenAddress, collateralAddress, isLong);
          const contractPositionKey = hashedPositionKey(account, market.marketTokenAddress, collateralAddress, isLong);

          positionsKeys.push(positionKey);
          contractPositionsKeys.push(contractPositionKey);
          marketsPrices.push(marketPrices);
        }
      }
    }

    return {
      positionsKeys,
      contractPositionsKeys,
      marketsPrices,
    };
  }, [account, marketsData, tokensData]);

  const { data: positionsData } = useMulticall(chainId, "usePositionsData", {
    key: keysAndPrices?.positionsKeys.length ? [keysAndPrices.positionsKeys.join("-")] : null,
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
              keysAndPrices!.contractPositionsKeys,
              keysAndPrices!.marketsPrices,
              // uiFeeReceiver
              ethers.constants.AddressZero,
            ],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const positions = res.reader.positions.returnValues;

      return positions.reduce((positionsMap: PositionsData, positionInfo, i) => {
        const [positionProps, positionFees] = positionInfo;
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          referral,
          funding,
          borrowing,
          // collateralPrice,
          // positionFeeFactor,
          // protocolFeeAmount,
          // positionFeeReceiverFactor,
          // feeReceiverAmount,
          // feeAmountForPool,
          // positionFeeAmountForPool,
          // positionFeeAmount,
          // totalNetCostAmount,
          // totalNetCostUsd,
        ] = positionFees;

        // const [
        //   referralCode,
        //   affiliate,
        //   trader,
        //   totalRebateFactor,
        //   traderDiscountFactor,
        //   totalRebateAmount,
        //   traderDiscountAmount,
        //   affiliateRewardAmount,
        // ] = referral;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [borrowingFeeUsd, borrowingFeeAmount, borrowingFeeReceiverFactor, borrowingFeeAmountForFeeReceiver] =
          borrowing.map(bigNumberify);

        const [
          fundingFeeAmount,
          claimableLongTokenAmount,
          claimableShortTokenAmount,
          latestLongTokenFundingAmountPerSize,
          latestShortTokenFundingAmountPerSize,
        ] = funding.map(bigNumberify);

        const positionKey = keysAndPrices!.positionsKeys[i];
        const contractPositionKey = keysAndPrices!.contractPositionsKeys[i];

        // Empty position
        if (increasedAtBlock.eq(0)) {
          return positionsMap;
        }

        positionsMap[positionKey] = {
          key: positionKey,
          contractKey: contractPositionKey,
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
          pendingBorrowingFeesUsd: borrowingFeeUsd,
          fundingFeeAmount,
          claimableLongTokenAmount,
          claimableShortTokenAmount,
          latestLongTokenFundingAmountPerSize,
          latestShortTokenFundingAmountPerSize,
          hasPendingLongTokenFundingFee: false,
          hasPendingShortTokenFundingFee: false,
          isOpening: false,
          data,
        };

        return positionsMap;
      }, {} as PositionsData);
    },
  });

  return {
    positionsData,
    allPossiblePositionsKeys: keysAndPrices?.positionsKeys,
  };
}
