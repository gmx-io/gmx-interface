import { gql } from "@apollo/client";
import { BigNumber, ethers } from "ethers";
import { useMemo } from "react";
import useInfiniteSwr, { SWRInfiniteResponse } from "swr/infinite";

import { getWrappedToken } from "config/tokens";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import { isSwapOrderType, OrderType } from "domain/synthetics/orders";
import { parseContractPrice, TokensData } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade/utils";
import { Token } from "domain/tokens";
import { definedOrThrow } from "lib/guards";
import { bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { buildFiltersBody, getSyntheticsGraphClient, GraphQlFilters } from "lib/subgraph";

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
    marketAddresses?: string[];
    orderEventCombinations?: {
      eventName?: TradeActionType;
      orderType?: OrderType;
      isDepositOrWithdraw?: boolean;
    }[];
  }
): TradeHistoryResult {
  const { pageSize, account, forAllAccounts, fromTxTimestamp, toTxTimestamp, marketAddresses, orderEventCombinations } =
    p;
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
        JSON.stringify(orderEventCombinations),
        structuredClone(marketAddresses)?.sort().join(","),
        index,
        pageSize,
      ];
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
        marketAddresses,
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

  const isLoading = (!error && !data) || !marketsInfoData || !tokensData;

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
        reason: rawAction.reason,
        reasonBytes: rawAction.reasonBytes,
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
        basePnlUsd: rawAction.basePnlUsd ? BigNumber.from(rawAction.basePnlUsd) : undefined,

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
  };
}

export async function fetchTradeActions({
  chainId,
  pageIndex,
  pageSize,
  marketAddresses,
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
  marketAddresses: string[] | undefined;
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
  const client = getSyntheticsGraphClient(chainId);
  definedOrThrow(client);

  const skip = pageIndex * pageSize;
  const first = pageSize;

  const maybeLowercaseMarketAddresses = marketAddresses?.map((s) => s.toLowerCase());

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
        or: [
          // For non-swap orders
          {
            orderType_not_in: [OrderType.LimitSwap, OrderType.MarketSwap],
            marketAddress_in: maybeLowercaseMarketAddresses,
          },
          // For swap orders
          {
            and: [
              {
                orderType_in: [OrderType.LimitSwap, OrderType.MarketSwap],
              },
              {
                or: [
                  // Source token is not in swap path so we add it to the or filter
                  {
                    marketAddress_in: maybeLowercaseMarketAddresses,
                  } as GraphQlFilters,
                ].concat(
                  maybeLowercaseMarketAddresses?.map((marketAddress) => ({
                    swapPath_contains: [marketAddress],
                  })) || []
                ),
              },
            ],
          },
        ],
      },
      {
        or: orderEventCombinations?.map((combination) => ({
          eventName: combination.eventName,
          orderType: combination.orderType,
          sizeDeltaUsd: combination.isDepositOrWithdraw ? 0 : undefined,
        })),
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
    return [];
  }

  const wrappedToken = getWrappedToken(chainId);

  const transformer = createRawTradeActionTransformer(marketsInfoData, wrappedToken, tokensData);

  return rawTradeActions.map(transformer).filter(Boolean) as TradeAction[];
}
