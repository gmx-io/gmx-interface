import { gql } from "@apollo/client";
import { useWeb3React } from "@web3-react/core";
import { getWrappedToken } from "config/tokens";
import { useMarketsInfo } from "domain/synthetics/markets";
import { parseContractPrice, useAvailableTokensData } from "domain/synthetics/tokens";
import { bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useFixedAddreseses } from "../common/useFixedAddresses";
import { isSwapOrderType } from "../orders";
import { getSwapPathOutputAddresses } from "../trade/utils";
import { PositionTradeAction, RawTradeAction, SwapTradeAction, TradeAction } from "./types";

export type TradeHistoryResult = {
  tradeActions?: TradeAction[];
  isLoading: boolean;
};

export function useTradeHistory(chainId: number, p: { pageIndex: number; pageSize: number }) {
  const { pageIndex, pageSize } = p;
  const { account } = useWeb3React();
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const fixedAddresses = useFixedAddreseses(marketsInfoData, tokensData);

  const client = getSyntheticsGraphClient(chainId);

  const key = chainId && client && account ? [chainId, "useTradeHistory", account, pageIndex, pageSize] : null;

  const { data, error } = useSWR<RawTradeAction[]>(key, {
    fetcher: async () => {
      const skip = pageIndex * pageSize;
      const first = pageSize;

      const query = gql(`{
        tradeActions(
            skip: ${skip},
            first: ${first},
            orderBy: transaction__timestamp,
            orderDirection: desc,
            where: { account: "${account!.toLowerCase()}" }
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

            priceImpactDiffUsd
            positionFeeAmount
            borrowingFeeAmount
            fundingFeeAmount
            pnlUsd

            collateralTokenPriceMax
            collateralTokenPriceMin
            
            orderType
            isLong
            shouldUnwrapNativeToken
            
            reason
            
            transaction {
                timestamp
                hash
            }
        }
      }`);

      const { data } = await client!.query({ query });

      return data?.tradeActions;
    },
  });

  const isLoading = (!error && !data) || !marketsInfoData || !tokensData || !fixedAddresses;

  const tradeActions = useMemo(() => {
    if (!data || !marketsInfoData || !tokensData || !fixedAddresses) {
      return undefined;
    }

    const wrappedToken = getWrappedToken(chainId);

    return data
      .map((rawAction) => {
        const orderType = Number(rawAction.orderType);

        if (isSwapOrderType(orderType)) {
          const initialCollateralTokenAddress = fixedAddresses[rawAction.initialCollateralTokenAddress!];
          const swapPath = rawAction.swapPath!.map((address) => fixedAddresses[address]);
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
          const marketAddress = fixedAddresses[rawAction.marketAddress!];
          const marketInfo = getByKey(marketsInfoData, marketAddress);
          const indexToken = marketInfo?.indexToken;
          const initialCollateralTokenAddress = fixedAddresses[rawAction.initialCollateralTokenAddress!];
          const swapPath = rawAction.swapPath!.map((address) => fixedAddresses[address]);
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

            orderType,
            isLong: rawAction.isLong!,

            priceImpactDiffUsd: rawAction.priceImpactDiffUsd ? bigNumberify(rawAction.priceImpactDiffUsd) : undefined,
            positionFeeAmount: rawAction.positionFeeAmount ? bigNumberify(rawAction.positionFeeAmount) : undefined,
            borrowingFeeAmount: rawAction.borrowingFeeAmount ? bigNumberify(rawAction.borrowingFeeAmount) : undefined,
            fundingFeeAmount: rawAction.fundingFeeAmount ? bigNumberify(rawAction.fundingFeeAmount) : undefined,

            reason: rawAction.reason,
            transaction: rawAction.transaction,
          };

          return tradeAction;
        }
      })
      .filter(Boolean) as TradeAction[];
  }, [chainId, data, fixedAddresses, marketsInfoData, tokensData]);

  return {
    tradeActions,
    isLoading,
  };
}
