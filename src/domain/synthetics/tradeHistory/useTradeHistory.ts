import { gql } from "@apollo/client";
import { ethers } from "ethers";
import merge from "lodash/merge";
import { useMemo } from "react";
import useInfiniteSwr, { SWRInfiniteResponse } from "swr/infinite";
import type { Address } from "viem";

import { MarketFilterLongShortItemData } from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";
import { getWrappedToken } from "sdk/configs/tokens";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import {
  OrderType,
  isIncreaseOrderType,
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { TokensData, parseContractPrice } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade/utils";
import { Token } from "domain/tokens";
import { definedOrThrow } from "lib/guards";
import { bigNumberify } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { GraphQlFilters, buildFiltersBody, getSyntheticsGraphClient } from "lib/subgraph";
import { PositionTradeAction, RawTradeAction, SwapTradeAction, TradeAction, TradeActionType } from "./types";

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
      orderType?: OrderType;
      isDepositOrWithdraw?: boolean;
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

  const client = getSyntheticsGraphClient(chainId);

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

function createRawTradeActionTransformer(
  marketsInfoData: MarketsInfoData,
  wrappedToken: Token,
  tokensData: TokensData
): (
  value: RawTradeAction,
  index: number,
  array: RawTradeAction[]
) => SwapTradeAction | PositionTradeAction | undefined {
  return (rawAction) => {
    const orderType = Number(rawAction.orderType);

    if (isSwapOrderType(orderType)) {
      const initialCollateralTokenAddress = ethers.getAddress(rawAction.initialCollateralTokenAddress!);
      const swapPath = rawAction.swapPath!.map((address) => ethers.getAddress(address));

      const swapPathOutputAddresses = getSwapPathOutputAddresses({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: initialCollateralTokenAddress,
        wrappedNativeTokenAddress: wrappedToken.address,
        shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
        isIncrease: false,
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
        reason: rawAction.reason,
        reasonBytes: rawAction.reasonBytes,
      };

      return tradeAction;
    } else {
      const marketAddress = ethers.getAddress(rawAction.marketAddress!);
      const marketInfo = getByKey(marketsInfoData, marketAddress);
      const indexToken = marketInfo?.indexToken;
      const initialCollateralTokenAddress = ethers.getAddress(rawAction.initialCollateralTokenAddress!);
      const swapPath = rawAction.swapPath!.map((address) => ethers.getAddress(address));
      const swapPathOutputAddresses = getSwapPathOutputAddresses({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: initialCollateralTokenAddress,
        wrappedNativeTokenAddress: wrappedToken.address,
        shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
        isIncrease: isIncreaseOrderType(rawAction.orderType),
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
          ? parseContractPrice(BigInt(rawAction.indexTokenPriceMin), indexToken.decimals)
          : undefined,
        indexTokenPriceMax: rawAction.indexTokenPriceMax
          ? parseContractPrice(BigInt(rawAction.indexTokenPriceMax), indexToken.decimals)
          : undefined,

        orderType,
        orderKey: rawAction.orderKey,
        isLong: rawAction.isLong!,
        pnlUsd: rawAction.pnlUsd ? BigInt(rawAction.pnlUsd) : undefined,
        basePnlUsd: rawAction.basePnlUsd ? BigInt(rawAction.basePnlUsd) : undefined,

        priceImpactDiffUsd: rawAction.priceImpactDiffUsd ? BigInt(rawAction.priceImpactDiffUsd) : undefined,
        priceImpactUsd: rawAction.priceImpactUsd ? BigInt(rawAction.priceImpactUsd) : undefined,
        positionFeeAmount: rawAction.positionFeeAmount ? BigInt(rawAction.positionFeeAmount) : undefined,
        borrowingFeeAmount: rawAction.borrowingFeeAmount ? BigInt(rawAction.borrowingFeeAmount) : undefined,
        fundingFeeAmount: rawAction.fundingFeeAmount ? BigInt(rawAction.fundingFeeAmount) : undefined,
        liquidationFeeAmount: rawAction.liquidationFeeAmount ? BigInt(rawAction.liquidationFeeAmount) : undefined,

        reason: rawAction.reason,
        reasonBytes: rawAction.reasonBytes,

        transaction: rawAction.transaction,
        shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
      };

      return tradeAction;
    }
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
        orderType?: OrderType | undefined;
        isDepositOrWithdraw?: boolean | undefined;
      }[]
    | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}): Promise<TradeAction[] | undefined> {
  const client = getSyntheticsGraphClient(chainId);
  definedOrThrow(client);

  const skip = pageIndex * pageSize;
  const first = pageSize;

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
    and: [
      {
        account: forAllAccounts ? undefined : account!.toLowerCase(),
        transaction: {
          timestamp_gte: fromTxTimestamp,
          timestamp_lte: toTxTimestamp,
        },
      },
      {
        or: !hasPureDirectionFilters
          ? undefined
          : pureDirectionFilters.map((filter) =>
              filter.direction === "swap"
                ? {
                    orderType_in: [OrderType.LimitSwap, OrderType.MarketSwap],
                  }
                : {
                    isLong: filter.direction === "long",
                    orderType_not_in: [OrderType.LimitSwap, OrderType.MarketSwap],
                  }
            ),
      },
      {
        or: [
          // For non-swap orders
          {
            and: !hasNonSwapRelevantDefinedMarkets
              ? undefined
              : [
                  {
                    orderType_not_in: [OrderType.LimitSwap, OrderType.MarketSwap],
                  },
                  {
                    or: nonSwapRelevantDefinedFiltersLowercased.map((filter) => ({
                      marketAddress: filter.marketAddress === "any" ? undefined : filter.marketAddress,
                      isLong: filter.direction === "any" ? undefined : filter.direction === "long",
                      // Collateral filtering is done outside of graphql on the client
                    })),
                  },
                ],
          },
          // For defined markets on swap orders
          {
            and: !hasSwapRelevantDefinedMarkets
              ? undefined
              : [
                  {
                    orderType_in: [OrderType.LimitSwap, OrderType.MarketSwap],
                  },
                  {
                    or: [
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
        or: orderEventCombinations?.map((combination) => {
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
              eventName: combination.eventName,
              orderType: combination.orderType,
            },
            sizeDeltaUsdCondition
          );
        }),
      },
      {
        // We do not show create liquidation orders in the trade history, thus we filter it out
        // ... && not (liquidation && orderCreated) === ... && (not liquidation || not orderCreated)
        or: [{ orderType_not: OrderType.Liquidation }, { eventName_not: TradeActionType.OrderCreated }],
      },
    ],
  });

  const whereClause = `where: ${filtersStr}`;

  const query = gql(`{
        tradeActions(
            skip: ${skip},
            first: ${first},
            orderBy: transaction__timestamp,
            orderDirection: desc,
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

            reason
            reasonBytes

            transaction {
                timestamp
                hash
            }
        }
      }`);

  const result = await client!.query({ query, fetchPolicy: "no-cache" });

  const rawTradeActions = (result.data?.tradeActions || []) as RawTradeAction[];

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
