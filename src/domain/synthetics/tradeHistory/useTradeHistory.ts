import { useMemo } from "react";
import { gql } from "@apollo/client";
import { getWrappedToken } from "config/tokens";
import { MarketsInfoData } from "domain/synthetics/markets";
import { TokensData, parseContractPrice } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useInfinateSwr from "swr/infinite";
import { isSwapOrderType } from "../orders";
import { getSwapPathOutputAddresses } from "../trade/utils";
import { PositionTradeAction, RawTradeAction, SwapTradeAction, TradeAction } from "./types";

export type TradeHistoryResult = {
  tradeActions?: TradeAction[];
  isLoading: boolean;
  pageIndex: number;
  setPageIndex: (index: number) => Promise<RawTradeAction[] | undefined>;
};

export function useTradeHistory(
  chainId: number,
  p: {
    account: string | null | undefined;
    forAllAccounts?: boolean;
    marketsInfoData?: MarketsInfoData;
    tokensData?: TokensData;
    pageSize: number;
  }
) {
  const { pageSize, marketsInfoData, tokensData, account, forAllAccounts } = p;

  const client = getSyntheticsGraphClient(chainId);

  const getKey = (index: number) => {
    if (chainId && client && (account || forAllAccounts)) {
      return [chainId, "useTradeHistory", account, forAllAccounts, index, pageSize];
    }
    return null;
  };

  const {
    data,
    error,
    size: pageIndex,
    setSize: setPageIndex,
  } = useInfinateSwr<RawTradeAction[]>(getKey, {
    fetcher: async (key) => {
      const [, , , , pageIndex] = key;
      const skip = pageIndex * pageSize;
      const first = pageSize;

      const query = gql(`{
        tradeActions(
            skip: ${skip},
            first: ${first},
            orderBy: transaction__timestamp,
            orderDirection: desc,
            ${!forAllAccounts && account ? `where: { account: "${account!.toLowerCase()}" }` : ""}
        ) {
            id
            eventName
            
            account
            marketAddress
            swapPath
            initialCollateralTokenAddress
            
            initialCollateralDeltaAmount
            sizeDeltaUsd
            triggerPrice
            acceptablePrice
            executionPrice
            minOutputAmount
            executionAmountOut

            priceImpactUsd
            priceImpactDiffUsd
            positionFeeAmount
            borrowingFeeAmount
            fundingFeeAmount
            pnlUsd

            collateralTokenPriceMax
            collateralTokenPriceMin

            indexTokenPriceMin
            indexTokenPriceMax
            
            orderType
            orderKey
            isLong
            shouldUnwrapNativeToken
            
            reason
            reasonBytes
            
            transaction {
                timestamp
                hash
            }
        }
      }`);

      const { data } = await client!.query({ query, fetchPolicy: "no-cache" });

      return data?.tradeActions;
    },
  });

  const isLoading = (!error && !data) || !marketsInfoData || !tokensData;

  const tradeActions = useMemo(() => {
    if (!data || !marketsInfoData || !tokensData) {
      return undefined;
    }

    const wrappedToken = getWrappedToken(chainId);
    const allData = data.flat();

    return allData
      .map((rawAction) => {
        const orderType = Number(rawAction.orderType);

        if (isSwapOrderType(orderType)) {
          const initialCollateralTokenAddress = ethers.utils.getAddress(rawAction.initialCollateralTokenAddress!);
          const swapPath = rawAction.swapPath!.map((address) => ethers.utils.getAddress(address));

          const swapPathOutputAddresses = getSwapPathOutputAddresses({
            marketsInfoData,
            swapPath,
            initialCollateralAddress: initialCollateralTokenAddress,
            wrappedNativeTokenAddress: wrappedToken.address,
            shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
          });

          const initialCollateralToken = getByKey(tokensData, initialCollateralTokenAddress)!;
          const targetCollateralToken = getByKey(tokensData, swapPathOutputAddresses.outTokenAddress)!;

          if (!initialCollateralToken || !targetCollateralToken) {
            return undefined;
          }

          const tradeAction: SwapTradeAction = {
            id: rawAction.id,
            eventName: rawAction.eventName,
            account: rawAction.account,
            swapPath,
            orderType,
            orderKey: rawAction.orderKey,
            initialCollateralTokenAddress: rawAction.initialCollateralTokenAddress!,
            initialCollateralDeltaAmount: bigNumberify(rawAction.initialCollateralDeltaAmount)!,
            minOutputAmount: bigNumberify(rawAction.minOutputAmount)!,
            executionAmountOut: rawAction.executionAmountOut ? bigNumberify(rawAction.executionAmountOut) : undefined,
            shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
            targetCollateralToken,
            initialCollateralToken,
            transaction: rawAction.transaction,
          };

          return tradeAction;
        } else {
          const marketAddress = ethers.utils.getAddress(rawAction.marketAddress!);
          const marketInfo = getByKey(marketsInfoData, marketAddress);
          const indexToken = marketInfo?.indexToken;
          const initialCollateralTokenAddress = ethers.utils.getAddress(rawAction.initialCollateralTokenAddress!);
          const swapPath = rawAction.swapPath!.map((address) => ethers.utils.getAddress(address));
          const swapPathOutputAddresses = getSwapPathOutputAddresses({
            marketsInfoData,
            swapPath,
            initialCollateralAddress: initialCollateralTokenAddress,
            wrappedNativeTokenAddress: wrappedToken.address,
            shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
          });
          const initialCollateralToken = getByKey(tokensData, initialCollateralTokenAddress);
          const targetCollateralToken = getByKey(tokensData, swapPathOutputAddresses.outTokenAddress);

          if (!marketInfo || !indexToken || !initialCollateralToken || !targetCollateralToken) {
            return undefined;
          }

          const tradeAction: PositionTradeAction = {
            id: rawAction.id,
            eventName: rawAction.eventName,
            account: rawAction.account,
            marketAddress,
            marketInfo,
            indexToken,
            swapPath,
            initialCollateralTokenAddress,
            initialCollateralToken,
            targetCollateralToken,
            initialCollateralDeltaAmount: bigNumberify(rawAction.initialCollateralDeltaAmount)!,
            sizeDeltaUsd: bigNumberify(rawAction.sizeDeltaUsd)!,
            triggerPrice: rawAction.triggerPrice
              ? parseContractPrice(bigNumberify(rawAction.triggerPrice)!, indexToken.decimals)
              : undefined,
            acceptablePrice: parseContractPrice(bigNumberify(rawAction.acceptablePrice)!, indexToken.decimals),
            executionPrice: rawAction.executionPrice
              ? parseContractPrice(bigNumberify(rawAction.executionPrice)!, indexToken.decimals)
              : undefined,
            minOutputAmount: bigNumberify(rawAction.minOutputAmount)!,

            collateralTokenPriceMax: rawAction.collateralTokenPriceMax
              ? parseContractPrice(bigNumberify(rawAction.collateralTokenPriceMax)!, initialCollateralToken.decimals)
              : undefined,

            collateralTokenPriceMin: rawAction.collateralTokenPriceMin
              ? parseContractPrice(bigNumberify(rawAction.collateralTokenPriceMin)!, initialCollateralToken.decimals)
              : undefined,

            indexTokenPriceMin: rawAction.indexTokenPriceMin
              ? parseContractPrice(BigNumber.from(rawAction.indexTokenPriceMin), indexToken.decimals)
              : undefined,
            indexTokenPriceMax: rawAction.indexTokenPriceMax
              ? parseContractPrice(BigNumber.from(rawAction.indexTokenPriceMax), indexToken.decimals)
              : undefined,

            orderType,
            orderKey: rawAction.orderKey,
            isLong: rawAction.isLong!,
            pnlUsd: rawAction.pnlUsd ? BigNumber.from(rawAction.pnlUsd) : undefined,

            priceImpactDiffUsd: rawAction.priceImpactDiffUsd ? BigNumber.from(rawAction.priceImpactDiffUsd) : undefined,
            priceImpactUsd: rawAction.priceImpactUsd ? BigNumber.from(rawAction.priceImpactUsd) : undefined,
            positionFeeAmount: rawAction.positionFeeAmount ? BigNumber.from(rawAction.positionFeeAmount) : undefined,
            borrowingFeeAmount: rawAction.borrowingFeeAmount ? BigNumber.from(rawAction.borrowingFeeAmount) : undefined,
            fundingFeeAmount: rawAction.fundingFeeAmount ? BigNumber.from(rawAction.fundingFeeAmount) : undefined,

            reason: rawAction.reason,
            reasonBytes: rawAction.reasonBytes,

            transaction: rawAction.transaction,
          };

          return tradeAction;
        }
      })
      .filter(Boolean) as TradeAction[];
  }, [chainId, data, marketsInfoData, tokensData]);

  return {
    tradeActions,
    isLoading,
    pageIndex,
    setPageIndex,
  };
}
