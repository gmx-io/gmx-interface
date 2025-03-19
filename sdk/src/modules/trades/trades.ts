import type { Address } from "viem";
import merge from "lodash/merge";

import type { GmxSdk } from "../..";

import { getWrappedToken } from "configs/tokens";
import { MarketsInfoData } from "types/markets";
import { OrderType } from "types/orders";
import { TokensData } from "types/tokens";
import { PositionTradeAction, RawTradeAction, TradeAction, TradeActionType } from "types/tradeHistory";
import graphqlFetcher from "utils/graphqlFetcher";
import { isIncreaseOrderType, isLimitOrderType, isSwapOrderType, isTriggerDecreaseOrderType } from "utils/orders";
import { buildFiltersBody, GraphQlFilters } from "utils/subgraph";
import { getSwapPathOutputAddresses } from "utils/swapStats";
import { createRawTradeActionTransformer } from "utils/tradeHistory";
import { Module } from "../base";

export type MarketFilterLongShortDirection = "long" | "short" | "swap" | "any";
export type MarketFilterLongShortItemData = {
  marketAddress: Address | "any";
  direction: MarketFilterLongShortDirection;
  collateralAddress?: Address;
};

export class Trades extends Module {
  async getTradeHistory(p: {
    forAllAccounts?: boolean;
    pageSize: number;
    fromTxTimestamp?: number;
    toTxTimestamp?: number;
    marketsInfoData: MarketsInfoData | undefined;
    tokensData: TokensData | undefined;
    pageIndex: number;
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
    orderEventCombinations?: {
      eventName?: TradeActionType;
      orderType?: OrderType;
      isDepositOrWithdraw?: boolean;
    }[];
  }): Promise<TradeAction[]> {
    const account = this.account;

    const {
      pageSize,
      forAllAccounts,
      fromTxTimestamp,
      toTxTimestamp,
      marketsDirectionsFilter,
      orderEventCombinations,
      marketsInfoData,
      pageIndex,
      tokensData,
    } = p;

    const data = await fetchTradeActions({
      sdk: this.sdk,
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
    });

    return data?.flat().filter(Boolean) as TradeAction[];
  }
}

export async function fetchTradeActions({
  sdk,
  pageIndex,
  pageSize,
  marketsDirectionsFilter = [],
  forAllAccounts,
  account,
  fromTxTimestamp,
  toTxTimestamp,
  orderEventCombinations,
  marketsInfoData,
  tokensData,
}: {
  sdk: GmxSdk;
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
        orderType?: OrderType | undefined;
        isDepositOrWithdraw?: boolean | undefined;
      }[]
    | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}): Promise<TradeAction[]> {
  const endpoint = sdk.config.subsquidUrl;
  const chainId = sdk.chainId;

  if (!endpoint) {
    return [];
  }

  const offset = pageIndex * pageSize;
  const limit = pageSize;

  const nonSwapRelevantDefinedFiltersLowercased: MarketFilterLongShortItemData[] = marketsDirectionsFilter
    .filter((filter) => filter.direction !== "swap" && filter.marketAddress !== "any")
    .map((filter) => ({
      marketAddress: filter.marketAddress.toLowerCase() as Address,
      direction: filter.direction,
      collateralAddress: filter.collateralAddress?.toLowerCase() as Address,
    }));

  const hasNonSwapRelevantDefinedMarkets = nonSwapRelevantDefinedFiltersLowercased.length > 0;

  const pureDirectionFilters = marketsDirectionsFilter
    .filter((filter) => filter.direction !== "any" && filter.marketAddress === "any")
    .map((filter) => ({
      marketAddress: filter.marketAddress.toLowerCase() as "any",
      direction: filter.direction,
    }));
  const hasPureDirectionFilters = pureDirectionFilters.length > 0;

  const swapRelevantDefinedMarketsLowercased = marketsDirectionsFilter
    .filter((filter) => (filter.direction === "any" || filter.direction === "swap") && filter.marketAddress !== "any")
    .map((filter) => filter.marketAddress.toLowerCase() as Address | "any");

  const hasSwapRelevantDefinedMarkets = swapRelevantDefinedMarketsLowercased.length > 0;

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
                    OR: nonSwapRelevantDefinedFiltersLowercased.map((filter) => ({
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
                        marketAddress_in: swapRelevantDefinedMarketsLowercased,
                      } as GraphQlFilters,
                    ].concat(
                      swapRelevantDefinedMarketsLowercased.map((marketAddress) => ({
                        swapPath_contains: [marketAddress],
                      })) || []
                    ),
                  },
                ],
          },
        ],
      },
      {
        OR: orderEventCombinations?.map((combination) => {
          let sizeDeltaUsdCondition = {};

          if (
            combination.orderType !== undefined &&
            [OrderType.MarketDecrease, OrderType.MarketIncrease].includes(combination.orderType)
          ) {
            if (combination.isDepositOrWithdraw) {
              sizeDeltaUsdCondition = { sizeDeltaUsd: 0 };
            } else {
              sizeDeltaUsdCondition = { sizeDeltaUsd_not: 0 };
            }
          }

          return merge(
            {
              eventName_eq: combination.eventName,
              orderType_eq: combination.orderType,
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
    ],
  });

  const whereClause = `where: ${filtersStr}`;

  const query = `{
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

            reason
            reasonBytes
            timestamp

            transaction {
                timestamp
                hash
            }
        }
      }`;

  const result = await graphqlFetcher<{ tradeActions: RawTradeAction[] }>(endpoint, query);

  const rawTradeActions = result?.tradeActions || [];

  if (!marketsInfoData || !tokensData) {
    return [];
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
