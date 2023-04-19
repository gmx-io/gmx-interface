import { getWrappedToken } from "config/tokens";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { useMarketsInfo } from "../markets";
import { parseContractPrice, useAvailableTokensData } from "../tokens";
import { getSwapPathOutputAddresses, getTriggerThresholdType } from "../trade";
import { OrdersInfoData, PositionOrderInfo, SwapOrderInfo } from "./types";
import { useOrders } from "./useOrders";
import { getPositionOrderTitle, getSwapOrderTitle, isSwapOrderType, isVisibleOrder } from "./utils";

type AggregatedOrdersDataResult = {
  ordersInfoData?: OrdersInfoData;
  isLoading: boolean;
};

export function useOrdersInfo(chainId: number): AggregatedOrdersDataResult {
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { ordersData } = useOrders(chainId);

  const wrappedToken = getWrappedToken(chainId);

  return useMemo(() => {
    if (!marketsInfoData || !ordersData || !tokensData) {
      return {
        isLoading: true,
      };
    }

    const ordersInfoData = Object.keys(ordersData)
      .filter((orderKey) => isVisibleOrder(ordersData[orderKey].orderType))
      .reduce((acc: OrdersInfoData, orderKey: string) => {
        const order = getByKey(ordersData, orderKey)!;

        if (isSwapOrderType(order.orderType)) {
          const initialCollateralToken = getByKey(tokensData, order.initialCollateralTokenAddress);
          const { outTokenAddress } = getSwapPathOutputAddresses({
            marketsInfoData,
            swapPath: order.swapPath,
            initialCollateralAddress: order.initialCollateralTokenAddress,
            wrappedNativeTokenAddress: wrappedToken.address,
            shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
          });
          const targetCollateralToken = getByKey(tokensData, outTokenAddress);

          if (!initialCollateralToken || !targetCollateralToken) {
            return acc;
          }

          const title = getSwapOrderTitle({
            initialCollateralToken,
            targetCollateralToken,
            minOutputAmount: order.minOutputAmount,
            initialCollateralAmount: order.initialCollateralDeltaAmount,
          });

          const orderInfo: SwapOrderInfo = {
            ...order,
            title,
            initialCollateralToken,
            targetCollateralToken,
          };

          acc[orderKey] = orderInfo;

          return acc;
        } else {
          const marketInfo = getByKey(marketsInfoData, order.marketAddress);
          const indexToken = marketInfo?.indexToken;
          const initialCollateralToken = getByKey(tokensData, order.initialCollateralTokenAddress);
          const { outTokenAddress } = getSwapPathOutputAddresses({
            marketsInfoData,
            swapPath: order.swapPath,
            initialCollateralAddress: order.initialCollateralTokenAddress,
            wrappedNativeTokenAddress: wrappedToken.address,
            shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
          });
          const targetCollateralToken = getByKey(tokensData, outTokenAddress);

          if (!marketInfo || !indexToken || !targetCollateralToken || !initialCollateralToken) {
            return acc;
          }

          const title = getPositionOrderTitle({
            orderType: order.orderType,
            isLong: order.isLong,
            indexToken,
            sizeDeltaUsd: order.sizeDeltaUsd,
          });

          const triggerThresholdType = getTriggerThresholdType(order.orderType, order.isLong);

          const orderInfo: PositionOrderInfo = {
            ...order,
            title,
            marketInfo,
            indexToken,
            initialCollateralToken,
            targetCollateralToken,
            triggerThresholdType,
            triggerPrice: parseContractPrice(order.contractTriggerPrice, indexToken.decimals),
            acceptablePrice: parseContractPrice(order.contractAcceptablePrice, indexToken.decimals),
          };

          acc[orderKey] = orderInfo;

          return acc;
        }
      }, {} as OrdersInfoData);

    return {
      ordersInfoData,
      isLoading: false,
    };
  }, [marketsInfoData, ordersData, tokensData, wrappedToken.address]);
}
