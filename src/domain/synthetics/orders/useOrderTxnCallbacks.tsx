import { plural, t, Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { PendingTransaction, usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  getPendingOrderKey,
  PendingOrderData,
  PendingPositionUpdate,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { selectOrdersInfoData, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsPossibleExternalSwapError } from "domain/synthetics/externalSwaps/utils";
import { getPositionKey } from "domain/synthetics/positions/utils";
import { getRemainingSubaccountActions, Subaccount } from "domain/synthetics/subaccount";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
import { helperToast } from "lib/helperToast";
import {
  OrderMetricId,
  sendOrderSimulatedMetric,
  sendOrderTxnSubmittedMetric,
  sendTxnErrorMetric,
  sendTxnSentMetric,
} from "lib/metrics";
import { getByKey } from "lib/objects";
import { TxnEvent, TxnEventName } from "lib/transactions";
import { OrderInfo, OrdersInfoData } from "sdk/types/orders";
import { isIncreaseOrderType, isMarketOrderType } from "sdk/utils/orders";
import {
  BatchOrderTxnParams,
  CancelOrderTxnParams,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
  getBatchRequiredActions,
  getBatchTotalExecutionFee,
  getIsTwapOrderPayload,
  IncreasePositionOrderParams,
  SwapOrderParams,
  UpdateOrderTxnParams,
} from "sdk/utils/orderTransactions";

import { getTxnErrorToast } from "components/Errors/errorToasts";

import { BatchOrderTxnCtx } from "./sendBatchOrderTxn";
import { ExpressTxnParams } from "../express/types";

export type CallbackUiCtx = {
  metricId?: OrderMetricId;
  slippageInputId?: string;
  additionalErrorContent?: React.ReactNode;
  isFundingFeeSettlement?: boolean;
  onInternalSwapFallback?: () => void;
};

export function useOrderTxnCallbacks() {
  const { setPendingTxns } = usePendingTxns();
  const {
    setPendingOrder,
    setPendingPosition,
    setPendingOrderUpdate,
    updatePendingExpressTxn,
    setPendingFundingFeeSettlement,
  } = useSyntheticsEvents();
  const { chainId } = useChainId();
  const { showDebugValues, setIsSettingsVisible } = useSettings();
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const tokensData = useSelector(selectTokensData);

  const batchTxnCallback = useCallback(
    (ctx: CallbackUiCtx, e: TxnEvent<BatchOrderTxnCtx>) => {
      if (showDebugValues) {
        // eslint-disable-next-line no-console
        console.log("TXN EVENT", e, ctx);
      }

      const { expressParams, batchParams } = e.data;

      const actionsCount = getBatchRequiredActions(batchParams);

      let mainActionType: "create" | "update" | "cancel";
      if (batchParams.createOrderParams.length > 0) {
        mainActionType = "create";
      } else if (batchParams.updateOrderParams.length > 0) {
        mainActionType = "update";
      } else if (batchParams.cancelOrderParams.length > 0) {
        mainActionType = "cancel";
      } else {
        return;
      }

      let pendingOrderUpdate: PendingOrderData | undefined = undefined;

      const handleTxnSubmitted = async () => {
        const createdAt = Date.now();
        const blockNumber = BigInt(await e.data.signer.provider.getBlockNumber());

        const pendingOrders = getBatchPendingOrders(e.data.batchParams, ordersInfoData);

        if (mainActionType === "update" && batchParams.updateOrderParams[0]) {
          const updateOrderParams = batchParams.updateOrderParams[0];
          const order = getByKey(ordersInfoData, updateOrderParams.params.orderKey);
          pendingOrderUpdate = order ? getPendingUpdateOrder(updateOrderParams, order) : undefined;
        }

        const pendingPositions = e.data.batchParams.createOrderParams
          .filter((cp) => isMarketOrderType(cp.orderPayload.orderType))
          .map((cp) =>
            getPendingPositionFromParams({
              createOrderParams: cp,
              blockNumber,
              timestamp: createdAt,
            })
          );

        if (mainActionType === "create") {
          if (ctx.isFundingFeeSettlement) {
            setPendingFundingFeeSettlement({
              orders: pendingOrders,
              positions: pendingPositions,
            });
          } else {
            if (pendingOrders.length > 0) {
              setPendingOrder(pendingOrders);
            }

            if (pendingPositions.length > 0) {
              setPendingPosition(pendingPositions[0]);
            }
          }
        } else {
          if (pendingOrderUpdate) {
            setPendingOrderUpdate(pendingOrderUpdate);
          }

          const operationMessage = getOperationMessage(
            mainActionType,
            "submitted",
            actionsCount,
            expressParams?.subaccount,
            setIsSettingsVisible
          );

          helperToast.success(operationMessage);
        }

        const successMessage = getOperationMessage(
          mainActionType,
          "success",
          actionsCount,
          undefined,
          setIsSettingsVisible
        );

        const errorMessage = getOperationMessage(
          mainActionType,
          "failed",
          actionsCount,
          undefined,
          setIsSettingsVisible
        );

        if (expressParams) {
          updatePendingExpressTxn({
            key: getExpressParamsKey(expressParams),
            subaccountApproval: expressParams.subaccount?.signedApproval,
            isSponsoredCall: expressParams.isSponsoredCall,
            tokenPermits: expressParams.relayParamsPayload.tokenPermits,
            pendingOrdersKeys: pendingOrders.map(getPendingOrderKey),
            pendingPositionsKeys: pendingPositions.map((p) => p.positionKey),
            metricId: ctx.metricId,
            createdAt: Date.now(),
            successMessage,
            errorMessage,
          });
        }
      };

      switch (e.event) {
        case TxnEventName.Simulated: {
          if (ctx.metricId) {
            sendOrderSimulatedMetric(ctx.metricId);
          }
          return;
        }

        case TxnEventName.Sending: {
          if (ctx.metricId) {
            sendOrderTxnSubmittedMetric(ctx.metricId);
          }

          if (expressParams) {
            handleTxnSubmitted();
          }
          return;
        }

        case TxnEventName.Sent: {
          if (ctx.metricId) {
            sendTxnSentMetric(ctx.metricId);
          }

          if (!expressParams) {
            handleTxnSubmitted();
          }

          if (e.data.type === "relay") {
            updatePendingExpressTxn({
              key: expressParams ? getExpressParamsKey(expressParams) : undefined,
              taskId: e.data.relayTaskId,
            });
          } else if (e.data.type === "wallet") {
            const totalExecutionFee = tokensData
              ? getBatchTotalExecutionFee({
                  batchParams: e.data.batchParams,
                  chainId,
                  tokensData,
                })
              : undefined;

            const pendingTxn: PendingTransaction = {
              hash: e.data.transactionHash,
              message: getOperationMessage(mainActionType, "success", actionsCount, undefined, setIsSettingsVisible),
              metricId: ctx.metricId,
              data: totalExecutionFee
                ? {
                    estimatedExecutionFee: totalExecutionFee.feeTokenAmount,
                    estimatedExecutionGasLimit: totalExecutionFee.gasLimit,
                  }
                : undefined,
            };

            setPendingTxns((txns) => [...txns, pendingTxn]);
          }

          return;
        }

        case TxnEventName.Error: {
          const { error } = e.data;
          const errorData = parseError(error);

          if (ctx.metricId) {
            sendTxnErrorMetric(ctx.metricId, error, errorData?.errorContext ?? "unknown");
          }

          const operationMessage = getOperationMessage(
            mainActionType,
            "failed",
            actionsCount,
            expressParams?.subaccount,
            setIsSettingsVisible
          );

          const fallbackToInternalSwap =
            hasExternalSwap(expressParams, batchParams) && getIsPossibleExternalSwapError(error)
              ? ctx.onInternalSwapFallback
              : undefined;

          const toastParams = getTxnErrorToast(chainId, errorData, {
            defaultMessage: operationMessage,
            slippageInputId: ctx.slippageInputId,
            additionalContent: ctx.additionalErrorContent,
            isInternalSwapFallback: Boolean(fallbackToInternalSwap),
          });

          helperToast.error(toastParams.errorContent, {
            autoClose: toastParams.autoCloseToast,
          });

          if (fallbackToInternalSwap) {
            fallbackToInternalSwap();
          }

          if (pendingOrderUpdate) {
            setPendingOrderUpdate(pendingOrderUpdate, "remove");
          }

          return;
        }
      }
    },
    [
      chainId,
      ordersInfoData,
      setIsSettingsVisible,
      setPendingFundingFeeSettlement,
      setPendingOrder,
      setPendingOrderUpdate,
      setPendingPosition,
      setPendingTxns,
      showDebugValues,
      tokensData,
      updatePendingExpressTxn,
    ]
  );

  return useMemo(
    () => ({
      orderTxnCallback: batchTxnCallback,
      makeOrderTxnCallback: (ctx: CallbackUiCtx) => (e: TxnEvent<BatchOrderTxnCtx>) => batchTxnCallback(ctx, e),
    }),
    [batchTxnCallback]
  );
}

export function getBatchPendingOrders(
  txnParams: BatchOrderTxnParams,
  ordersInfoData: OrdersInfoData | undefined
): PendingOrderData[] {
  const createPendingOrders = txnParams.createOrderParams
    .filter((cp) => !getIsTwapOrderPayload(cp.orderPayload))
    .map((cp) => getPendingCreateOrder(cp));

  const twapPendingOrders = getPendingCreateTwapOrders(txnParams.createOrderParams);

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

  return [
    ...twapPendingOrders,
    ...createPendingOrders,
    ...updatePendingOrders,
    ...cancelPendingOrders,
  ] as PendingOrderData[];
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
    isTwap: order.isTwap,
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
  const collateralAddress = createOrderPayload.params.collateralTokenAddress;

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
    isTwap: order.isTwap,
  };
}

export function getPendingCreateOrder(
  createOrderPayload: CreateOrderTxnParams<IncreasePositionOrderParams | DecreasePositionOrderParams | SwapOrderParams>,
  isTwap = false
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
    isTwap,
  };
}

export function getPendingCreateTwapOrders(
  createOrderPayloads: CreateOrderTxnParams<
    IncreasePositionOrderParams | DecreasePositionOrderParams | SwapOrderParams
  >[]
): PendingOrderData[] {
  const ordersByUiFeeReceiver: Record<string, PendingOrderData> = {};

  createOrderPayloads.forEach((cp) => {
    if (!getIsTwapOrderPayload(cp.orderPayload)) {
      return;
    }

    const uiFeeReceiver = cp.orderPayload.addresses.uiFeeReceiver;

    const pendingOrder = getPendingCreateOrder(cp, true);

    if (!ordersByUiFeeReceiver[uiFeeReceiver]) {
      ordersByUiFeeReceiver[uiFeeReceiver] = pendingOrder;
    } else {
      const acc = ordersByUiFeeReceiver[uiFeeReceiver];

      acc.sizeDeltaUsd += pendingOrder.sizeDeltaUsd;
      acc.minOutputAmount += pendingOrder.minOutputAmount;
      acc.initialCollateralDeltaAmount += pendingOrder.initialCollateralDeltaAmount;
    }
  });

  return Object.values(ordersByUiFeeReceiver);
}

function getOperationMessage(
  mainActionType: "create" | "update" | "cancel",
  state: "submitted" | "success" | "failed",
  actionsCount: number,
  subaccount: Subaccount | undefined,
  setIsSettingsVisible: (isVisible: boolean) => void
) {
  const isLastAction = subaccount && getRemainingSubaccountActions(subaccount) === BigInt(actionsCount);

  const lastActionsMsg = isLastAction ? (
    <Trans>
      Max Action Count Reached.{" "}
      <span onClick={() => setIsSettingsVisible(true)} className="link-underline">
        Click here
      </span>{" "}
      to update.
    </Trans>
  ) : undefined;

  const orderText = plural(actionsCount, {
    one: "Order",
    other: "# Orders",
  });

  if (mainActionType === "create") {
    return undefined;
  } else if (mainActionType === "update") {
    switch (state) {
      case "submitted": {
        return (
          <div>
            {t`Updating ${orderText}.`}
            {lastActionsMsg && <br />}
            {lastActionsMsg}
          </div>
        );
      }

      case "success": {
        return t`${orderText} updated.`;
      }

      case "failed": {
        return t`${orderText} update failed.`;
      }

      default: {
        return "";
      }
    }
  } else if (mainActionType === "cancel") {
    switch (state) {
      case "submitted": {
        return (
          <div>
            {t`Cancelling ${orderText}.`}
            {lastActionsMsg && <br />}
            {lastActionsMsg}
          </div>
        );
      }

      case "success": {
        return t`${orderText} cancelled.`;
      }

      case "failed": {
        return t`${orderText} cancel failed.`;
      }

      default: {
        return "";
      }
    }
  }
}

function hasExternalSwap(expressParams: ExpressTxnParams | undefined, batchParams: BatchOrderTxnParams) {
  return (
    expressParams?.relayParamsPayload.externalCalls.externalCallDataList.length ||
    batchParams.createOrderParams.some((cp) => cp.tokenTransfersParams?.externalCalls?.externalCallDataList.length)
  );
}

function getExpressParamsKey(expressParams: ExpressTxnParams) {
  return `${expressParams?.relayParamsPayload.deadline}:${expressParams?.relayParamsPayload.userNonce}:${expressParams.relayFeeParams.totalNetworkFeeAmount}`;
}
