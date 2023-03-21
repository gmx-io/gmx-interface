import { gql } from "@apollo/client";
import { useWeb3React } from "@web3-react/core";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { getTokenData, parseContractPrice, useAvailableTokensData } from "domain/synthetics/tokens";
import { useMemo } from "react";
import { RawTradeAction, TradeAction } from "./types";
import { getToTokenFromSwapPath } from "../orders";
import { bigNumberify } from "lib/numbers";

export function useTradeHistory(chainId: number, p: { pageIndex: number; pageSize: number }) {
  const { pageIndex, pageSize } = p;
  const { account } = useWeb3React();
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);

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

  const isTradesLoading = key && !error && !data;

  const tradeActions = useMemo(() => {
    if (!data) return undefined;

    const fixedAddresses = Object.keys(marketsData)
      .concat(Object.keys(tokensData))
      .reduce((acc, address) => {
        acc[address.toLowerCase()] = address;

        return acc;
      }, {});

    return data
      .map((rawAction) => {
        const tradeAction: TradeAction = { ...(rawAction as any) };

        tradeAction.marketAddress = fixedAddresses[tradeAction.marketAddress!];
        tradeAction.initialCollateralTokenAddress = fixedAddresses[tradeAction.initialCollateralTokenAddress!];
        tradeAction.swapPath = tradeAction.swapPath?.map((address) => fixedAddresses[address]);

        tradeAction.market = getMarket(marketsData, tradeAction.marketAddress!);
        tradeAction.indexToken = getTokenData(tokensData, tradeAction.market?.indexTokenAddress, "native");
        tradeAction.initialCollateralToken = getTokenData(tokensData, tradeAction.initialCollateralTokenAddress);

        if (!tradeAction.market || !tradeAction.indexToken || !tradeAction.initialCollateralToken) {
          return undefined;
        }

        const targetCollateralAddress = getToTokenFromSwapPath(
          marketsData,
          tradeAction.initialCollateralTokenAddress,
          tradeAction.swapPath
        );

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
  }, [data, marketsData, tokensData]);

  return {
    tradeActions,
    isLoading: isMarketsLoading || isTokensLoading || isTradesLoading,
  };
}
