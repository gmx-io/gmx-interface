import { gql } from "@apollo/client";
import merge from "lodash/merge";
import { useMemo } from "react";
import { SWRConfiguration } from "swr";
import useInfiniteSwr, { SWRInfiniteResponse } from "swr/infinite";
import type { Address } from "viem";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { OrderType } from "domain/synthetics/orders";
import { definedOrThrow } from "lib/guards";
import { getSubsquidGraphClient } from "lib/indexers";
import { EMPTY_ARRAY } from "lib/objects";
import { TradeAction as SubsquidTradeAction } from "sdk/codegen/subsquid";
import { GraphQlFilters, buildFiltersBody } from "sdk/utils/indexers";
import { TradeAction, TradeActionType } from "sdk/utils/tradeHistory/types";

import { MarketFilterLongShortItemData } from "components/TableMarketFilter/MarketFilterLongShort";

import { processRawTradeActions } from "./processTradeActions";

export type TradeHistoryResult = {
  tradeActions?: TradeAction[];
  totalCount?: number;
  isLoading: boolean;
  error: Error | undefined;
  hasMorePages: boolean;
  isFetchingNextPage: boolean;
  pageIndex: number;
  setPageIndex: (...args: Parameters<SWRInfiniteResponse["setSize"]>) => void;
};

export type RawTradeActionsResult = {
  tradeActions: SubsquidTradeAction[];
  totalCount?: number;
};

export function useTradeHistory(
  chainId: number,
  p: {
    account: string | null | undefined;
    forAllAccounts?: boolean;
    pageSize: number;
    pageOffset?: number;
    fromTxTimestamp?: number;
    toTxTimestamp?: number;
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
    refreshInterval?: number;
    positionKey?: string;
    orderEventCombinations?: {
      eventName?: TradeActionType;
      orderType?: OrderType[];
      isDepositOrWithdraw?: boolean;
      isTwap?: boolean;
    }[];
  }
): TradeHistoryResult {
  const {
    pageSize,
    pageOffset,
    account,
    forAllAccounts,
    fromTxTimestamp,
    toTxTimestamp,
    marketsDirectionsFilter,
    orderEventCombinations,
    refreshInterval,
    positionKey,
  } = p;
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();
  const { showDebugValues } = useSettings();

  const client = getSubsquidGraphClient(chainId);

  const getKey = (index: number) => {
    if (chainId && client && (account || forAllAccounts)) {
      return [
        chainId,
        "useTradeHistory",
        account,
        forAllAccounts,
        fromTxTimestamp,
        toTxTimestamp,
        orderEventCombinations,
        positionKey,
        marketsDirectionsFilter,
        pageOffset,
        index,
        pageSize,
      ] as const;
    }
    return null;
  };

  const swrParams: SWRConfiguration = {};
  // SWR resets global options if pass undefined explicitly
  if (refreshInterval) {
    swrParams.refreshInterval = refreshInterval;
  }

  const {
    data,
    error,
    size: pageIndex,
    setSize: setPageIndex,
  } = useInfiniteSwr(getKey, {
    fetcher: async (key) => {
      const pageIndex = key.at(-2) as number;

      const actions = await fetchRawTradeActions({
        chainId,
        pageIndex,
        pageSize,
        pageOffset: pageOffset === undefined ? undefined : pageOffset + pageIndex * pageSize,
        marketsDirectionsFilter,
        forAllAccounts,
        account,
        fromTxTimestamp,
        toTxTimestamp,
        orderEventCombinations,
        positionKey,
        showDebugValues,
      });

      return actions;
    },
    ...swrParams,
  });

  const hasPopulatedData = data !== undefined && data.every((p) => p !== undefined);
  const isLoading = (!error && !hasPopulatedData) || !marketsInfoData || !tokensData;

  const tradeActions = useMemo(() => {
    const allRawData = data?.flatMap((page) => page?.tradeActions ?? []);

    return processRawTradeActions({
      chainId,
      rawActions: allRawData,
      marketsInfoData,
      tokensData,
    });
  }, [data, marketsInfoData, tokensData, chainId]);

  const totalCount = data?.find((page) => page?.totalCount !== undefined)?.totalCount;
  const loadedRawActionsCount = data?.reduce((count, page) => count + (page?.tradeActions.length ?? 0), 0) ?? 0;
  const hasMorePages =
    totalCount !== undefined ? loadedRawActionsCount < totalCount : data?.at(-1)?.tradeActions.length === pageSize;

  return {
    tradeActions,
    totalCount,
    isLoading,
    error,
    hasMorePages,
    // SWR keeps old pages while the next one loads.
    isFetchingNextPage: !error && data !== undefined && data.length < pageIndex,
    pageIndex,
    setPageIndex,
  };
}

export async function fetchRawTradeActions({
  chainId,
  pageIndex,
  pageSize,
  pageOffset,
  marketsDirectionsFilter = EMPTY_ARRAY,
  forAllAccounts,
  account,
  fromTxTimestamp,
  toTxTimestamp,
  orderEventCombinations,
  positionKey,
  showDebugValues,
}: {
  chainId: number;
  pageIndex: number;
  pageSize: number;
  pageOffset?: number;
  marketsDirectionsFilter: MarketFilterLongShortItemData[] | undefined;
  forAllAccounts: boolean | undefined;
  account: string | null | undefined;
  fromTxTimestamp: number | undefined;
  toTxTimestamp: number | undefined;
  orderEventCombinations:
    | {
        eventName?: TradeActionType | undefined;
        orderType?: OrderType[] | undefined;
        isDepositOrWithdraw?: boolean | undefined;
        isTwap?: boolean | undefined;
      }[]
    | undefined;
  positionKey?: string;
  showDebugValues?: boolean;
}): Promise<RawTradeActionsResult | undefined> {
  const client = getSubsquidGraphClient(chainId);
  definedOrThrow(client);

  const offset = pageOffset ?? pageIndex * pageSize;
  const limit = pageSize;

  const nonSwapRelevantDefinedFilters: MarketFilterLongShortItemData[] = marketsDirectionsFilter
    .filter((filter) => filter.direction !== "swap" && filter.marketAddress !== "any")
    .map((filter) => ({
      marketAddress: filter.marketAddress as Address,
      direction: filter.direction,
      positionKey: filter.positionKey,
    }));

  const hasNonSwapRelevantDefinedMarkets = nonSwapRelevantDefinedFilters.length > 0;

  const pureDirectionFilters = marketsDirectionsFilter
    .filter((filter) => filter.direction !== "any" && filter.marketAddress === "any")
    .map((filter) => ({
      marketAddress: filter.marketAddress.toLowerCase() as "any",
      direction: filter.direction,
    }));
  const hasPureDirectionFilters = pureDirectionFilters.length > 0;

  const swapRelevantDefinedMarkets = marketsDirectionsFilter
    .filter((filter) => (filter.direction === "any" || filter.direction === "swap") && filter.marketAddress !== "any")
    .map((filter) => filter.marketAddress as Address | "any");

  const hasSwapRelevantDefinedMarkets = swapRelevantDefinedMarkets.length > 0;

  const mergedCombinations = orderEventCombinations?.flatMap((combination) =>
    (combination.orderType || []).map((orderType) => ({ ...combination, orderType }))
  );

  const filtersStr = buildFiltersBody({
    AND: [
      {
        account_eq: forAllAccounts || positionKey ? undefined : account,
        timestamp_gte: fromTxTimestamp,
        timestamp_lte: toTxTimestamp,
        positionKey_eq: positionKey,
      },
      {
        OR: !hasPureDirectionFilters
          ? undefined
          : pureDirectionFilters.map((filter) =>
              filter.direction === "swap"
                ? {
                    orderType_in: [OrderType.LimitSwap, OrderType.MarketSwap],
                  }
                : {
                    isLong_eq: filter.direction === "long",
                    orderType_not_in: [OrderType.LimitSwap, OrderType.MarketSwap],
                  }
            ),
      },
      {
        OR: [
          // For non-swap orders
          {
            AND: !hasNonSwapRelevantDefinedMarkets
              ? undefined
              : [
                  {
                    orderType_not_in: [OrderType.LimitSwap, OrderType.MarketSwap],
                  },
                  {
                    // Open-position entries carry a positionKey (account+market+collateral+direction),
                    // so filter by it directly instead of market+direction + client-side collateral.
                    OR: nonSwapRelevantDefinedFilters.map((filter) =>
                      filter.positionKey
                        ? { positionKey_eq: filter.positionKey }
                        : {
                            marketAddress_eq: filter.marketAddress === "any" ? undefined : filter.marketAddress,
                            isLong_eq: filter.direction === "any" ? undefined : filter.direction === "long",
                          }
                    ),
                  },
                ],
          },
          // For defined markets on swap orders
          {
            AND: !hasSwapRelevantDefinedMarkets
              ? undefined
              : [
                  {
                    orderType_in: [OrderType.LimitSwap, OrderType.MarketSwap],
                  },
                  {
                    OR: [
                      // Source token is not in swap path so we add it to the or filter
                      {
                        marketAddress_in: swapRelevantDefinedMarkets,
                      } as GraphQlFilters,
                    ].concat(
                      swapRelevantDefinedMarkets.map((marketAddress) => ({
                        swapPath_containsAll: [marketAddress],
                      })) || []
                    ),
                  },
                ],
          },
        ],
      },
      {
        OR: mergedCombinations?.map((combination) => {
          let sizeDeltaUsdCondition = {};

          if (
            combination.orderType !== undefined &&
            [OrderType.MarketDecrease, OrderType.MarketIncrease].includes(combination.orderType)
          ) {
            if (combination.isDepositOrWithdraw) {
              sizeDeltaUsdCondition = { sizeDeltaUsd_eq: 0 };
            } else {
              sizeDeltaUsdCondition = { sizeDeltaUsd_not_eq: 0 };
            }
          }

          return merge(
            {
              eventName_eq: combination.eventName,
              orderType_eq: combination.orderType,
              twapGroupId_isNull: !combination.isTwap,
            },
            sizeDeltaUsdCondition
          );
        }),
      },
      {
        // We do not show create liquidation orders in the trade history, thus we filter it out
        // ... && not (liquidation && orderCreated) === ... && (not liquidation || not orderCreated)
        OR: [{ orderType_not_eq: OrderType.Liquidation }, { eventName_not_eq: TradeActionType.OrderCreated }],
      },
      // not request market increase, market decrease, market swap, (deposit, withdraw are included in increase, decrease)
      ...(showDebugValues
        ? []
        : [
            {
              OR: [{ orderType_not_eq: OrderType.MarketIncrease }, { eventName_not_eq: TradeActionType.OrderCreated }],
            },
            {
              OR: [{ orderType_not_eq: OrderType.MarketDecrease }, { eventName_not_eq: TradeActionType.OrderCreated }],
            },
            {
              OR: [{ orderType_not_eq: OrderType.MarketSwap }, { eventName_not_eq: TradeActionType.OrderCreated }],
            },
          ]),
    ],
  });

  const whereClause = `where: ${filtersStr}`;

  const query = gql(`{
        tradeActionsConnection(orderBy: [timestamp_DESC, id_DESC], ${whereClause}) {
          totalCount
        }

        tradeActions(
            offset: ${offset},
            limit: ${limit},
            orderBy: [timestamp_DESC, id_DESC],
            ${whereClause}
        ) {
            id
            eventName

            srcChainId
            account
            marketAddress
            swapPath
            initialCollateralTokenAddress
            positionKey
            positionSizeInUsd
            positionSizeInTokens

            initialCollateralDeltaAmount
            sizeDeltaUsd
            sizeDeltaInTokens
            triggerPrice
            acceptablePrice
            executionPrice
            minOutputAmount
            executionAmountOut

            swapImpactUsd
            collateralTotalCostAmount
            priceImpactUsd
            priceImpactDiffUsd
            positionFeeAmount
            traderDiscountAmount
            borrowingFeeAmount
            fundingFeeAmount
            swapFeeUsd
            liquidationFeeAmount
            pnlUsd
            basePnlUsd

            collateralTokenPriceMax
            collateralTokenPriceMin

            indexTokenPriceMin
            indexTokenPriceMax

            orderType
            orderKey
            isLong
            shouldUnwrapNativeToken
            twapGroupId
            numberOfParts
            totalImpactUsd
            proportionalPendingImpactUsd
            decreasePositionSwapType

            reason
            reasonBytes
            timestamp
            transactionHash
        }
      }`);

  const result = await client!.query({ query, fetchPolicy: "no-cache" });

  const rawTradeActions = (result.data?.tradeActions || []) as SubsquidTradeAction[];
  const totalCount = result.data?.tradeActionsConnection?.totalCount;

  return {
    tradeActions: rawTradeActions,
    totalCount,
  };
}
