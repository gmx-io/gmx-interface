import { plural, t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { PendingTransaction, usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  getPendingOrderKey,
  PendingOrderData,
  PendingPositionUpdate,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { selectOrdersInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getPositionKey } from "domain/synthetics/positions/utils";
import { parseError } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendOrderSimulatedMetric, sendTxnErrorMetric, sendTxnSentMetric } from "lib/metrics";
import { getByKey } from "lib/objects";
import { OrderInfo, OrdersInfoData } from "sdk/types/orders";
import { isIncreaseOrderType } from "sdk/utils/orders";
import {
  BatchOrderTxnParams,
  CancelOrderTxnParams,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
  getTotalExecutionFeeForOrders,
  IncreasePositionOrderParams,
  SwapOrderParams,
  UpdateOrderTxnParams,
} from "sdk/utils/orderTransactions";

import { getTxnErrorToast } from "components/Errors/errorToasts";

import { BatchOrderTxnEventParams, TxnEvent, TxnEventName } from "./walletTxnBuilder";

export type OrderTxnCallbackCtx = {
  metricId: OrderMetricId | undefined;
  slippageInputId: string | undefined;
  additionalErrorContent?: React.ReactNode;
  showPreliminaryMsg?: boolean;
  detailsMsg?: React.ReactNode;
};

export function useOrderTxnCallbacks() {
  const { setPendingTxns } = usePendingTxns();
  const { setPendingOrder, setPendingPosition, setPendingOrderUpdate, setPendingExpressTxn } = useSyntheticsEvents();
  const ordersInfoData = useSelector(selectOrdersInfoData);

  const orderTxnCallback = useCallback(
    (ctx: OrderTxnCallbackCtx, e: TxnEvent<BatchOrderTxnEventParams>) => {
      // TEMP DEBUG
      // eslint-disable-next-line no-console
      console.log("TXN EVENT", e, ctx);

      switch (e.event) {
        case TxnEventName.TxnSimulated: {
          if (ctx.metricId) {
            sendOrderSimulatedMetric(ctx.metricId);
          }
          return;
        }

        case TxnEventName.TxnSent: {
          const pendingOrders = getBatchPendingOrders(e.txnParams.params, ordersInfoData);

          const pendingPositions = e.txnParams.params.createOrderParams.map((cp) =>
            getPendingPositionFromParams({
              createOrderParams: cp,
              blockNumber: e.data.blockNumber,
              timestamp: e.data.createdAt,
            })
          );

          if (pendingOrders.length > 0) {
            setPendingOrder(pendingOrders);
          }

          if (pendingPositions.length > 0) {
            setPendingPosition(pendingPositions[0]);
          }

          if (ctx.metricId) {
            sendTxnSentMetric(ctx.metricId);
          }

          if (e.txnParams.mode === "wallet") {
            const { totalExecutionFeeAmount, totalExecutionGasLimit } = getTotalExecutionFeeForOrders(
              e.txnParams.params
            );

            const pendingTxn: PendingTransaction = {
              hash: e.data.txnHash,
              message: undefined,
              metricId: ctx.metricId,
              data: {
                estimatedExecutionFee: totalExecutionFeeAmount,
                estimatedExecutionGasLimit: totalExecutionGasLimit,
              },
            };

            setPendingTxns((txns) => [...txns, pendingTxn]);
          } else if (e.txnParams.mode === "express") {
            const pendingExpressTxnParams = e.txnParams.pendingExpressTxnParams;

            if (pendingExpressTxnParams) {
              setPendingExpressTxn({
                ...pendingExpressTxnParams,
                pendingOrdersKeys: pendingOrders.map(getPendingOrderKey),
                pendingPositionsKeys: pendingPositions.map((p) => p.positionKey),
                metricId: ctx.metricId,
              });
            }
          }

          return;
        }

        case TxnEventName.TxnError: {
          const { error } = e.data;
          const { chainId } = e.txnParams;
          const { metricId } = ctx;

          const errorData = parseError(error);

          const toastParams = getTxnErrorToast(chainId, errorData, {
            defaultMessage: t`Order error.`,
            slippageInputId: ctx.slippageInputId,
            additionalContent: ctx.additionalErrorContent,
          });

          helperToast.error(toastParams.errorContent, {
            autoClose: toastParams.autoCloseToast,
          });

          if (metricId) {
            sendTxnErrorMetric(metricId, error, errorData?.errorContext ?? "unknown");
          }

          return;
        }
      }
    },
    [ordersInfoData, setPendingExpressTxn, setPendingOrder, setPendingPosition, setPendingTxns]
  );

  const cancelOrderTxnCallback = useCallback(
    (ctx: OrderTxnCallbackCtx, e: TxnEvent<BatchOrderTxnEventParams>) => {
      const count = e.txnParams.params.cancelOrderParams.length;

      const ordersText = plural(count, {
        one: "Order",
        other: "# Orders",
      });

      switch (e.event) {
        case TxnEventName.TxnPrepared: {
          if (ctx.showPreliminaryMsg) {
            helperToast.success(
              <div>
                {t`Cancelling ${ordersText}.`}
                {ctx.detailsMsg && <br />}
                {ctx.detailsMsg}
              </div>
            );
          }
          return;
        }

        case TxnEventName.TxnSent: {
          if (!ctx.showPreliminaryMsg) {
            helperToast.success(t`Cancelling ${ordersText}.`);
          }

          if (e.txnParams.mode === "wallet") {
            // TODO: for express orders flow
            const pendingTxn: PendingTransaction = {
              hash: e.data.txnHash,
              message: `${ordersText} cancelled.`,
              metricId: ctx.metricId,
              data: undefined,
            };

            setPendingTxns((txns) => [...txns, pendingTxn]);
          } else if (e.txnParams.mode === "express") {
            const pendingExpressTxnParams = e.txnParams.pendingExpressTxnParams;

            if (pendingExpressTxnParams) {
              setPendingExpressTxn(pendingExpressTxnParams);
            }
          }

          return;
        }
        case TxnEventName.TxnError: {
          const { error } = e.data;
          const { chainId } = e.txnParams;

          const errorData = parseError(error);

          const toastParams = getTxnErrorToast(chainId, errorData, {
            defaultMessage: t`Cancel ${ordersText} failed.`,
            slippageInputId: undefined,
            additionalContent: undefined,
          });

          helperToast.error(toastParams.errorContent, {
            autoClose: toastParams.autoCloseToast,
          });
        }
      }
    },
    [setPendingExpressTxn, setPendingTxns]
  );

  const updateOrderTxnCallback = useCallback(
    (ctx: OrderTxnCallbackCtx, e: TxnEvent<BatchOrderTxnEventParams>) => {
      const updateOrderParams = e.txnParams.params.updateOrderParams[0];
      const order = getByKey(ordersInfoData, updateOrderParams.params.orderKey);

      const pendingOrderUpdate =
        updateOrderParams && order ? getPendingUpdateOrder(updateOrderParams, order) : undefined;

      switch (e.event) {
        case TxnEventName.TxnPrepared: {
          if (ctx.showPreliminaryMsg) {
            helperToast.success(
              <div>
                {t`Updating order.`}
                {ctx.detailsMsg && <br />}
                {ctx.detailsMsg}
              </div>
            );
          }

          if (pendingOrderUpdate) {
            setPendingOrderUpdate(pendingOrderUpdate);
          }
          return;
        }

        case TxnEventName.TxnSent: {
          if (!ctx.showPreliminaryMsg) {
            helperToast.success(t`Updating order.`);
          }

          if (e.txnParams.mode === "wallet") {
            const pendingTxn: PendingTransaction = {
              hash: e.data.txnHash,
              message: `Update order executed.`,
              metricId: ctx.metricId,
              data: undefined,
            };

            setPendingTxns((txns) => [...txns, pendingTxn]);
          } else if (e.txnParams.mode === "express") {
            const pendingExpressTxnParams = e.txnParams.pendingExpressTxnParams;

            if (pendingExpressTxnParams) {
              setPendingExpressTxn(pendingExpressTxnParams);
            }
          }

          return;
        }

        case TxnEventName.TxnError: {
          const { error } = e.data;
          const { chainId } = e.txnParams;

          const errorData = parseError(error);
          const toastParams = getTxnErrorToast(chainId, errorData, {
            defaultMessage: t`Order error.`,
            slippageInputId: undefined,
            additionalContent: undefined,
          });

          helperToast.error(toastParams.errorContent, {
            autoClose: toastParams.autoCloseToast,
          });

          if (pendingOrderUpdate) {
            setPendingOrderUpdate(pendingOrderUpdate, "remove");
          }

          return;
        }

        default: {
          return;
        }
      }
    },
    [ordersInfoData, setPendingExpressTxn, setPendingOrderUpdate, setPendingTxns]
  );

  return useMemo(
    () => ({
      orderTxnCallback,
      cancelOrderTxnCallback,
      updateOrderTxnCallback,
      makeOrderTxnCallback: (ctx: OrderTxnCallbackCtx) => (e: TxnEvent<BatchOrderTxnEventParams>) =>
        orderTxnCallback(ctx, e),
      makeCancelOrderTxnCallback: (ctx: OrderTxnCallbackCtx) => (e: TxnEvent<BatchOrderTxnEventParams>) =>
        cancelOrderTxnCallback(ctx, e),
      makeUpdateOrderTxnCallback: (ctx: OrderTxnCallbackCtx) => (e: TxnEvent<BatchOrderTxnEventParams>) =>
        updateOrderTxnCallback(ctx, e),
    }),
    [cancelOrderTxnCallback, orderTxnCallback, updateOrderTxnCallback]
  );
}

export function getBatchPendingOrders(
  txnParams: BatchOrderTxnParams,
  ordersInfoData: OrdersInfoData | undefined
): PendingOrderData[] {
  const createPendingOrders = txnParams.createOrderParams.map(getPedningCreateOrder);

  const updatePendingOrders = txnParams.updateOrderParams
    .map((updateOrderParams) => {
      const order = getByKey(ordersInfoData, updateOrderParams.params.orderKey);
      if (!order) {
        return undefined;
      }

      return getPendingUpdateOrder(updateOrderParams, order);
    })
    .filter((o) => o !== undefined);

  const cancelPendingOrders = txnParams.cancelOrderParams
    .map((cancelOrderParams) => {
      const order = getByKey(ordersInfoData, cancelOrderParams.orderKey);
      if (!order) {
        return undefined;
      }

      return getPendingCancelOrder(cancelOrderParams, order);
    })
    .filter((o) => o !== undefined);

  return [...createPendingOrders, ...updatePendingOrders, ...cancelPendingOrders] as PendingOrderData[];
}
export function getPendingCancelOrder(params: CancelOrderTxnParams, order: OrderInfo): PendingOrderData {
  return {
    txnType: "cancel",
    account: order.account,
    marketAddress: order.marketAddress,
    initialCollateralTokenAddress: order.initialCollateralTokenAddress,
    initialCollateralDeltaAmount: order.initialCollateralDeltaAmount,
    swapPath: order.swapPath,
    triggerPrice: "triggerPrice" in order ? order.triggerPrice : 0n,
    acceptablePrice: "acceptablePrice" in order ? order.acceptablePrice : 0n,
    autoCancel: "autoCancel" in order ? order.autoCancel : false,
    sizeDeltaUsd: order.sizeDeltaUsd,
    isLong: order.isLong,
    orderType: order.orderType,
    shouldUnwrapNativeToken: false,
    externalSwapQuote: undefined,
    orderKey: params.orderKey,
    minOutputAmount: 0n,
  };
}

export function getPendingPositionFromParams({
  createOrderParams: createOrderPayload,
  blockNumber,
  timestamp,
}: {
  createOrderParams: CreateOrderTxnParams<IncreasePositionOrderParams | DecreasePositionOrderParams>;
  blockNumber: bigint;
  timestamp: number;
}): PendingPositionUpdate {
  // TODO: types magic
  const collateralAddress = isIncreaseOrderType(createOrderPayload.params.orderType)
    ? (createOrderPayload.params as IncreasePositionOrderParams).collateralTokenAddress
    : (createOrderPayload.params as DecreasePositionOrderParams).initialCollateralTokenAddress;

  const collateralDeltaAmount = createOrderPayload.params.collateralDeltaAmount;
  const sizeDeltaUsd = createOrderPayload.params.sizeDeltaUsd;
  const sizeDeltaInTokens = createOrderPayload.params.sizeDeltaInTokens;

  const positionKey = getPositionKey(
    createOrderPayload.orderPayload.addresses.receiver,
    createOrderPayload.orderPayload.addresses.market,
    collateralAddress,
    createOrderPayload.orderPayload.isLong
  );

  return {
    isIncrease: isIncreaseOrderType(createOrderPayload.orderPayload.orderType),
    positionKey,
    collateralDeltaAmount,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    updatedAtBlock: blockNumber,
    updatedAt: timestamp,
  };
}

export function getPendingUpdateOrder(updateOrderParams: UpdateOrderTxnParams, order: OrderInfo): PendingOrderData {
  return {
    txnType: "update",
    account: order.account,
    marketAddress: order.marketAddress,
    initialCollateralTokenAddress: order.initialCollateralTokenAddress,
    initialCollateralDeltaAmount: order.initialCollateralDeltaAmount,
    swapPath: order.swapPath,
    triggerPrice: "triggerPrice" in order ? order.triggerPrice : 0n,
    acceptablePrice: "acceptablePrice" in order ? order.acceptablePrice : 0n,
    autoCancel: "autoCancel" in order ? order.autoCancel : false,
    sizeDeltaUsd: order.sizeDeltaUsd,
    minOutputAmount: order.minOutputAmount,
    isLong: order.isLong,
    orderType: order.orderType,
    shouldUnwrapNativeToken: false,
    externalSwapQuote: undefined,
    orderKey: updateOrderParams.params.orderKey,
  };
}

export function getPedningCreateOrder(
  createOrderPayload: CreateOrderTxnParams<IncreasePositionOrderParams | DecreasePositionOrderParams | SwapOrderParams>
): PendingOrderData {
  return {
    account: createOrderPayload.orderPayload.addresses.receiver,
    marketAddress: createOrderPayload.orderPayload.addresses.market,
    initialCollateralTokenAddress: createOrderPayload.orderPayload.addresses.initialCollateralToken,
    initialCollateralDeltaAmount: createOrderPayload.orderPayload.numbers.initialCollateralDeltaAmount,
    swapPath: createOrderPayload.orderPayload.addresses.swapPath,
    sizeDeltaUsd: createOrderPayload.orderPayload.numbers.sizeDeltaUsd,
    minOutputAmount: createOrderPayload.orderPayload.numbers.minOutputAmount,
    triggerPrice: createOrderPayload.orderPayload.numbers.triggerPrice,
    acceptablePrice: createOrderPayload.orderPayload.numbers.acceptablePrice,
    autoCancel: createOrderPayload.orderPayload.autoCancel,
    isLong: createOrderPayload.orderPayload.isLong,
    orderType: createOrderPayload.orderPayload.orderType,
    shouldUnwrapNativeToken: createOrderPayload.orderPayload.shouldUnwrapNativeToken,
    externalSwapQuote: createOrderPayload.params.externalSwapQuote,
    txnType: "create",
  };
}
