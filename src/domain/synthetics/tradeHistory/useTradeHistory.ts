import { gql } from "@apollo/client";
import { useWeb3React } from "@web3-react/core";
import { NATIVE_TOKEN_ADDRESS, getWrappedToken } from "config/tokens";
import { useMarketsInfo } from "domain/synthetics/markets";
import { getTokenData, parseContractPrice, useAvailableTokensData } from "domain/synthetics/tokens";
import { bigNumberify } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { getToTokenFromSwapPath } from "../orders";
import { RawTradeAction, TradeAction } from "./types";
import { getByKey } from "lib/objects";
import { useFixedAddreseses } from "../common/useFixedAddresses";

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

  const tradeActions = useMemo(() => {
    if (!data || !marketsInfoData) return undefined;

    const wrappedToken = getWrappedToken(chainId);

    return data
      .map((rawAction) => {
        const tradeAction: TradeAction = { ...(rawAction as any) };

        tradeAction.marketAddress = fixedAddresses[tradeAction.marketAddress!];
        tradeAction.initialCollateralTokenAddress = fixedAddresses[tradeAction.initialCollateralTokenAddress!];
        tradeAction.swapPath = tradeAction.swapPath?.map((address) => fixedAddresses[address]);

        tradeAction.market = getByKey(marketsInfoData, tradeAction.marketAddress!);
        tradeAction.indexToken = getTokenData(tokensData, tradeAction.market?.indexTokenAddress, "native");
        tradeAction.initialCollateralToken = getTokenData(tokensData, tradeAction.initialCollateralTokenAddress);

        let targetCollateralAddress = getToTokenFromSwapPath(
          marketsInfoData,
          tradeAction.initialCollateralTokenAddress,
          tradeAction.swapPath
        );

        if (targetCollateralAddress === wrappedToken.address && tradeAction.shouldUnwrapNativeToken) {
          targetCollateralAddress = NATIVE_TOKEN_ADDRESS;
        }

        tradeAction.targetCollateralToken = getTokenData(tokensData, targetCollateralAddress);

        if (tradeAction.initialCollateralDeltaAmount) {
          tradeAction.initialCollateralDeltaAmount = bigNumberify(tradeAction.initialCollateralDeltaAmount);
        }

        if (tradeAction.sizeDeltaUsd) {
          tradeAction.sizeDeltaUsd = bigNumberify(tradeAction.sizeDeltaUsd);
        }

        if (tradeAction.minOutputAmount) {
          tradeAction.minOutputAmount = bigNumberify(tradeAction.minOutputAmount);
        }

        if (tradeAction.executionAmountOut) {
          tradeAction.executionAmountOut = bigNumberify(tradeAction.executionAmountOut);
        }

        if (tradeAction.fundingFeeAmount) {
          tradeAction.fundingFeeAmount = bigNumberify(tradeAction.fundingFeeAmount);
        }

        if (tradeAction.borrowingFeeAmount) {
          tradeAction.borrowingFeeAmount = bigNumberify(tradeAction.borrowingFeeAmount);
        }

        if (tradeAction.positionFeeAmount) {
          tradeAction.positionFeeAmount = bigNumberify(tradeAction.positionFeeAmount);
        }

        if (tradeAction.priceImpactDiffUsd) {
          tradeAction.priceImpactDiffUsd = bigNumberify(tradeAction.priceImpactDiffUsd);
        }

        if (tradeAction.pnlUsd) {
          tradeAction.pnlUsd = bigNumberify(tradeAction.pnlUsd);
        }

        if (tradeAction.collateralTokenPriceMax && tradeAction.initialCollateralToken?.decimals) {
          tradeAction.collateralTokenPriceMax = parseContractPrice(
            bigNumberify(tradeAction.collateralTokenPriceMax)!,
            tradeAction.initialCollateralToken?.decimals
          );
        }

        if (tradeAction.collateralTokenPriceMin && tradeAction.initialCollateralToken?.decimals) {
          tradeAction.collateralTokenPriceMin = parseContractPrice(
            bigNumberify(tradeAction.collateralTokenPriceMin)!,
            tradeAction.initialCollateralToken?.decimals
          );
        }

        if (rawAction.triggerPrice && tradeAction.indexToken?.decimals) {
          tradeAction.triggerPrice = parseContractPrice(
            bigNumberify(rawAction.triggerPrice)!,
            tradeAction.indexToken?.decimals
          );
        }

        if (tradeAction.executionPrice && tradeAction.indexToken?.decimals) {
          tradeAction.executionPrice = parseContractPrice(
            bigNumberify(rawAction.executionPrice)!,
            tradeAction.indexToken?.decimals
          );
        }

        if (tradeAction.acceptablePrice && tradeAction.indexToken?.decimals) {
          tradeAction.acceptablePrice = parseContractPrice(
            bigNumberify(rawAction.acceptablePrice)!,
            tradeAction.indexToken?.decimals
          );
        }

        tradeAction.orderType = Number(tradeAction.orderType);

        return tradeAction;
      })
      .filter(Boolean) as TradeAction[];
  }, [chainId, data, fixedAddresses, marketsInfoData, tokensData]);

  return {
    tradeActions,
    isLoading: key && !error && !data,
  };
}
