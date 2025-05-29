import { gql } from "@apollo/client";
import merge from "lodash/merge";
import { useMemo } from "react";
import useInfiniteSwr, { SWRInfiniteResponse } from "swr/infinite";
import type { Address } from "viem";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import {
  OrderType,
  isIncreaseOrderType,
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { TokensData } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade/utils";
import { definedOrThrow } from "lib/guards";
import { EMPTY_ARRAY } from "lib/objects";
import { getSubsquidGraphClient } from "lib/subgraph";
import { getWrappedToken } from "sdk/configs/tokens";
import { TradeAction as SubsquidTradeAction } from "sdk/types/subsquid";
import { PositionTradeAction, TradeAction, TradeActionType } from "sdk/types/tradeHistory";
import { GraphQlFilters, buildFiltersBody } from "sdk/utils/subgraph";
import { createRawTradeActionTransformer } from "sdk/utils/tradeHistory";

import { MarketFilterLongShortItemData } from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";

export type TradeHistoryResult = {
  tradeActions?: TradeAction[];
  isLoading: boolean;
  pageIndex: number;
  setPageIndex: (...args: Parameters<SWRInfiniteResponse["setSize"]>) => void;
};

export function useTradeHistory(
  chainId: number,
  p: {
    account: string | null | undefined;
    forAllAccounts?: boolean;
    pageSize: number;
    fromTxTimestamp?: number;
    toTxTimestamp?: number;
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
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
    account,
    forAllAccounts,
    fromTxTimestamp,
    toTxTimestamp,
    marketsDirectionsFilter,
    orderEventCombinations,
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
        marketsDirectionsFilter,
        index,
        pageSize,
      ] as const;
    }
    return null;
  };

  const {
    data,
    error,
    size: pageIndex,
    setSize: setPageIndex,
  } = useInfiniteSwr(getKey, {
    fetcher: async (key) => {
      const pageIndex = key.at(-2) as number;

      return await fetchTradeActions({
        chainId,
        pageIndex,
        pageSize,
        marketsDirectionsFilter,
        forAllAccounts,
        account,
        fromTxTimestamp,
        toTxTimestamp,
        orderEventCombinations,
        marketsInfoData,
        tokensData,
        showDebugValues,
      });
    },
  });

  const hasPopulatedData = data !== undefined && data.every((p) => p !== undefined);
  const isLoading = (!error && !hasPopulatedData) || !marketsInfoData || !tokensData;

  const tradeActions = useMemo(() => {
    const allData = data?.flat().filter(Boolean) as TradeAction[];
    return allData;
  }, [data]);

  return {
    tradeActions,
    isLoading,
    pageIndex,
    setPageIndex,
  };
}

export async function fetchTradeActions({
  chainId,
  pageIndex,
  pageSize,
  marketsDirectionsFilter = EMPTY_ARRAY,
  forAllAccounts,
  account,
  fromTxTimestamp,
  toTxTimestamp,
  orderEventCombinations,
  marketsInfoData,
  tokensData,
  showDebugValues,
}: {
  chainId: number;
  pageIndex: number;
  pageSize: number;
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
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
  showDebugValues?: boolean;
}): Promise<TradeAction[] | undefined> {
  const client = getSubsquidGraphClient(chainId);
  definedOrThrow(client);

  const offset = pageIndex * pageSize;
  const limit = pageSize;

  const nonSwapRelevantDefinedFilters: MarketFilterLongShortItemData[] = marketsDirectionsFilter
    .filter((filter) => filter.direction !== "swap" && filter.marketAddress !== "any")
    .map((filter) => ({
      marketAddress: filter.marketAddress as Address,
      direction: filter.direction,
      collateralAddress: filter.collateralAddress as Address,
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
        account_eq: forAllAccounts ? undefined : account,
        timestamp_gte: fromTxTimestamp,
        timestamp_lte: toTxTimestamp,
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
                    OR: nonSwapRelevantDefinedFilters.map((filter) => ({
                      marketAddress_eq: filter.marketAddress === "any" ? undefined : filter.marketAddress,
                      isLong_eq: filter.direction === "any" ? undefined : filter.direction === "long",
                      // Collateral filtering is done outside of graphql on the client
                    })),
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
        tradeActions(
            offset: ${offset},
            limit: ${limit},
            orderBy: transaction_timestamp_DESC,
            ${whereClause}
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

            reason
            reasonBytes
            timestamp
            transaction {
                hash
            }
        }
      }`);

  const result = await client!.query({ query, fetchPolicy: "no-cache" });

  const rawTradeActions = (result.data?.tradeActions || []) as SubsquidTradeAction[];

  if (!marketsInfoData || !tokensData) {
    return undefined;
  }

  const wrappedToken = getWrappedToken(chainId);

  const transformer = createRawTradeActionTransformer(marketsInfoData, wrappedToken, tokensData);

  let tradeActions = rawTradeActions.map(transformer).filter(Boolean) as TradeAction[];

  const collateralFilterTree: {
    [direction in "long" | "short"]: {
      [marketAddress: string]: {
        [collateralAddress: string]: boolean;
      };
    };
  } = {
    long: {},
    short: {},
  };
  let hasCollateralFilter = false;

  marketsDirectionsFilter.forEach((filter) => {
    if (filter.direction === "any" || filter.direction === "swap" || !filter.collateralAddress) {
      return;
    }

    if (!collateralFilterTree[filter.direction]) {
      collateralFilterTree[filter.direction] = {};
    }

    if (!collateralFilterTree[filter.direction][filter.marketAddress]) {
      collateralFilterTree[filter.direction][filter.marketAddress] = {};
    }

    hasCollateralFilter = true;
    collateralFilterTree[filter.direction][filter.marketAddress][filter.collateralAddress] = true;
  });

  // Filter out trade actions that do not match the collateral filter
  // We do this on the client side because the collateral filtering is too complex to be done in the graphql query
  if (hasCollateralFilter) {
    tradeActions = tradeActions.filter((tradeAction) => {
      // All necessary filters for swaps are already applied in the graphql query
      if (isSwapOrderType(tradeAction.orderType)) {
        return true;
      }

      const positionTradeAction = tradeAction as PositionTradeAction;

      let collateralMatch = true;

      const desiredCollateralAddresses =
        collateralFilterTree[positionTradeAction.isLong ? "long" : "short"]?.[positionTradeAction.marketAddress];

      if (isLimitOrderType(tradeAction.orderType)) {
        const wrappedToken = getWrappedToken(chainId);

        if (!marketsInfoData) {
          collateralMatch = true;
        } else {
          const { outTokenAddress } = getSwapPathOutputAddresses({
            marketsInfoData,
            initialCollateralAddress: positionTradeAction.initialCollateralTokenAddress,
            isIncrease: isIncreaseOrderType(tradeAction.orderType),
            shouldUnwrapNativeToken: positionTradeAction.shouldUnwrapNativeToken,
            swapPath: tradeAction.swapPath,
            wrappedNativeTokenAddress: wrappedToken.address,
          });

          collateralMatch =
            outTokenAddress !== undefined && Boolean(desiredCollateralAddresses?.[outTokenAddress as Address]);
        }
      } else if (isTriggerDecreaseOrderType(tradeAction.orderType)) {
        collateralMatch = Boolean(desiredCollateralAddresses?.[positionTradeAction.initialCollateralTokenAddress]);
      }

      return collateralMatch;
    });
  }

  return tradeActions;
}
