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

type PositionsResult = {
  positionsData: PositionsData;
};

const defaultValue = {};

export function usePositions(chainId: number): PositionsResult {
  const { account } = useWeb3React();
  const { marketsData } = useMarkets(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

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
    if (!account || !marketsData || !tokensData || !positionsKeys?.length) return undefined;

    const markets = Object.values(marketsData);
    const marketPricesByPositionsKeys: { [key: string]: ContractMarketPrices } = {};

    for (const market of markets) {
      const marketPrices = getContractMarketPrices(tokensData!, market);

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
  }, [account, marketsData, positionsKeys, tokensData]);

  const { data: positionsData = defaultValue } = useMulticall(chainId, "usePositionsData", {
    key: queryParams?.positionsKeys.length ? [queryParams.positionsKeys.join("-")] : null,
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          positions: {
            methodName: "getAccountPositionInfoList",
            params: [
              getContract(chainId, "DataStore"),
              getContract(chainId, "SyntheticsReferralStorage"),
              queryParams!.positionsKeys,
              queryParams!.marketPricesArray,
            ],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const positions = res.reader.positions.returnValues;

      return positions.reduce((positionsMap: PositionsData, positionInfo, i) => {
        // TODO: parsing from abi?
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

        const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, isLong)!;
        const contractPositionKey = queryParams!.positionsKeys[i];

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
  };
}
