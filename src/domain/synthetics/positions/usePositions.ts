import { useWeb3React } from "@web3-react/core";
import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { accountPositionListKey, hashedPositionKey } from "config/dataStore";
import { ethers } from "ethers";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { useMemo, useRef } from "react";
import { ContractMarketPrices, MarketsData, getContractMarketPrices } from "../markets";
import { TokensData } from "../tokens";
import { PositionsData } from "./types";
import { getPositionKey } from "./utils";

type PositionsResult = {
  positionsData?: PositionsData;
  allPossiblePositionsKeys?: string[];
};

export function usePositions(
  chainId: number,
  p: {
    marketsInfoData?: MarketsData;
    tokensData?: TokensData;
    pricesUpdatedAt?: number;
  }
): PositionsResult {
  const { marketsInfoData, tokensData, pricesUpdatedAt } = p;
  const { account } = useWeb3React();

  const positionsDataCache = useRef<PositionsData>();

  const { data: existingPositionsKeysSet } = useMulticall(chainId, "usePositions-keys", {
    key: account ? [account] : null,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          keys: {
            methodName: "getBytes32ValuesAt",
            params: [accountPositionListKey(account!), 0, 1000],
          },
        },
      },
    }),
    parseResponse: (res) => {
      return new Set(res.data.dataStore.keys.returnValues[0]);
    },
  });

  const keysAndPrices = useMemo(() => {
    if (!account || !marketsInfoData || !tokensData || !existingPositionsKeysSet) {
      return undefined;
    }

    const markets = Object.values(marketsInfoData);

    const allPositionKeys: string[] = [];
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

          allPositionKeys.push(positionKey);

          if (existingPositionsKeysSet.has(contractPositionKey)) {
            contractPositionsKeys.push(contractPositionKey);
            marketsPrices.push(marketPrices);
          }
        }
      }
    }

    return {
      allPositionKeys,
      contractPositionsKeys,
      marketsPrices,
    };
  }, [account, existingPositionsKeysSet, marketsInfoData, tokensData]);

  const { data: positionsData } = useMulticall(chainId, "usePositionsData", {
    key: keysAndPrices?.contractPositionsKeys.length
      ? [keysAndPrices.contractPositionsKeys.join("-"), pricesUpdatedAt]
      : null,

    // Refresh on every prices update
    refreshInterval: null,

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
      const positions = res.data.reader.positions.returnValues[0];

      return positions.reduce((positionsMap: PositionsData, positionInfo, i) => {
        const [position, fees] = positionInfo;
        const [addresses, numbers, flags, data] = position;
        const [account, marketAddress, collateralTokenAddress] = addresses;

        const [
          sizeInUsd,
          sizeInTokens,
          collateralAmount,
          borrowingFactor,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          fundingFeeAmountPerSize,
          longTokenClaimableFundingAmountPerSize,
          shortTokenClaimableFundingAmountPerSize,
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
        ] = fees;

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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          latestFundingFeeAmountPerSize,
          latestLongTokenFundingAmountPerSize,
          latestShortTokenFundingAmountPerSize,
        ] = funding.map(bigNumberify);

        const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, isLong);
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
          longTokenFundingAmountPerSize: longTokenClaimableFundingAmountPerSize,
          shortTokenFundingAmountPerSize: shortTokenClaimableFundingAmountPerSize,
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

  if (positionsData) {
    positionsDataCache.current = positionsData;
  }

  return {
    positionsData: positionsDataCache.current,
    allPossiblePositionsKeys: keysAndPrices?.allPositionKeys,
  };
}
