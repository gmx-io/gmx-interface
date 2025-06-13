import { useMemo } from "react";

import { Token } from "domain/tokens";
import { getByKey } from "lib/objects";
import type { ContractsChainId } from "sdk/configs/chains";
import { getWrappedToken } from "sdk/configs/tokens";
import { getOrderInfo, isPositionOrder, isSwapOrder, isTwapPositionOrder, isTwapSwapOrder } from "sdk/utils/orders";
import { getTwapOrderKey } from "sdk/utils/twap/index";
import { decodeTwapUiFeeReceiver } from "sdk/utils/twap/uiFeeReceiver";

import { MarketFilterLongShortItemData } from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";

import { useOrders } from "./useOrders";
import { MarketsInfoData } from "../markets";
import { TokensData } from "../tokens";
import { OrderTypeFilterValue } from "./ordersFilters";
import { Order, OrdersInfoData, TwapOrderInfo } from "./types";
import { setOrderInfoTitle } from "./utils";

export type AggregatedOrdersDataResult = {
  ordersInfoData?: OrdersInfoData;
  count?: number;
  isLoading: boolean;
};

export function useOrdersInfoRequest(
  chainId: ContractsChainId,
  p: {
    marketsInfoData?: MarketsInfoData;
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
    orderTypesFilter?: OrderTypeFilterValue[];
    tokensData?: TokensData;
    account: string | null | undefined;
  }
): AggregatedOrdersDataResult {
  const { marketsInfoData, tokensData, account, marketsDirectionsFilter, orderTypesFilter } = p;
  const { ordersData, count } = useOrders(chainId, {
    account,
    marketsDirectionsFilter,
    orderTypesFilter,
    marketsInfoData,
  });

  const wrappedToken = getWrappedToken(chainId);

  return useMemo(() => {
    if (!account) {
      return {
        isLoading: false,
      };
    }

    if (!marketsInfoData || !ordersData || !tokensData) {
      return {
        isLoading: true,
      };
    }

    const ordersInfoData = Object.keys(ordersData).reduce((acc: OrdersInfoData, orderKey: string) => {
      const order = getByKey(ordersData, orderKey)!;

      const orderInfo = createOrderInfo({
        marketsInfoData,
        tokensData,
        wrappedNativeToken: wrappedToken,
        order,
        acc,
      });

      if (!orderInfo) {
        // eslint-disable-next-line no-console
        console.warn(`OrderInfo parsing error`, order);

        return acc;
      }

      const marketInfo = getByKey(marketsInfoData, order.marketAddress);
      const indexToken = marketInfo?.indexToken;

      setOrderInfoTitle(orderInfo, indexToken);

      acc[orderInfo.key] = orderInfo;

      return acc;
    }, {} as OrdersInfoData);

    return {
      count: count,
      ordersInfoData,
      isLoading: false,
    };
  }, [account, count, marketsInfoData, ordersData, tokensData, wrappedToken]);
}

const createOrderInfo = ({
  order,
  marketsInfoData,
  tokensData,
  wrappedNativeToken,
  acc,
}: {
  order: Order;
  marketsInfoData: MarketsInfoData;
  tokensData: TokensData;
  wrappedNativeToken: Token;
  acc: OrdersInfoData;
}) => {
  const twapParams = decodeTwapUiFeeReceiver(order.uiFeeReceiver);

  const orderInfo = getOrderInfo({
    marketsInfoData,
    tokensData,
    wrappedNativeToken,
    order,
  });

  if (twapParams && orderInfo) {
    const twapOrderKey = getTwapOrderKey({
      twapId: twapParams.twapId,
      orderType: order.orderType,
      pool: order.marketAddress,
      collateralTokenSymbol: orderInfo.targetCollateralToken.symbol,
      isLong: order.isLong,
      swapPath: order.swapPath,
      account: order.account,
      initialCollateralToken: orderInfo.initialCollateralToken.address,
    });

    let twapOrderInfo = getByKey(acc, twapOrderKey);

    if (!twapOrderInfo) {
      const twap: TwapOrderInfo = {
        ...orderInfo,
        isTwap: true,
        key: twapOrderKey,
        orders: [],
        twapId: twapParams.twapId,
        numberOfParts: twapParams.numberOfParts,
        initialCollateralDeltaAmount: orderInfo.initialCollateralDeltaAmount * BigInt(twapParams.numberOfParts),
        sizeDeltaUsd: orderInfo.sizeDeltaUsd * BigInt(twapParams.numberOfParts),
        executionFee: orderInfo.executionFee * BigInt(twapParams.numberOfParts),
      };

      twapOrderInfo = twap;
    }

    if (twapOrderInfo && isTwapSwapOrder(twapOrderInfo) && isSwapOrder(orderInfo)) {
      twapOrderInfo.orders.push(orderInfo);
    }

    if (twapOrderInfo && isTwapPositionOrder(twapOrderInfo) && isPositionOrder(orderInfo)) {
      twapOrderInfo.orders.push(orderInfo);
    }

    return twapOrderInfo;
  }

  return orderInfo;
};
