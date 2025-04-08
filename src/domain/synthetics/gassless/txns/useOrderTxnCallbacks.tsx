import { t } from "@lingui/macro";
import { AdditionalErrorParams, getTxnErrorToast } from "components/Errors/errorToasts";
import {
  PendingTransaction,
  PendingTransactionData,
  usePendingTxns,
} from "context/PendingTxnsContext/PendingTxnsContext";
import { PendingOrderData, PendingPositionUpdate, useSyntheticsEvents } from "context/SyntheticsEvents";
import { getPositionKey } from "domain/synthetics/positions/utils";
import { useChainId } from "lib/chains";
import { ErrorLike, parseError } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { makeTxnSentMetricsHandler, OrderMetricId, sendTxnErrorMetric } from "lib/metrics";
import { ReactNode, useCallback } from "react";
import { isIncreaseOrderType } from "sdk/utils/orders";
import { OrderCreatePayload, SecondaryCancelOrderParams, SecondaryUpdateOrderParams } from "./createOrderBuilders";
import { OnSentParams } from "./walletTxnBuilder";

type TxnCallbacksInput = {
  successSent?: boolean;
  error?: ErrorLike;
  pendingTxn?: PendingTransaction;
};

export function combineCallbacks<T>(cbcs: ((p: T) => void)[]) {
  return (p: T) => {
    cbcs.forEach((c) => c(p));
  };
}

export function getPendingCancelOrder(params: SecondaryCancelOrderParams): PendingOrderData {
  return {
    txnType: "cancel",
    account: params.account,
    marketAddress: params.marketAddress,
    initialCollateralTokenAddress: params.initialCollateralAddress,
    initialCollateralDeltaAmount: params.initialCollateralDeltaAmount,
    swapPath: params.swapPath,
    sizeDeltaUsd: params.sizeDeltaUsd,
    isLong: params.isLong,
    orderType: params.orderType,
    shouldUnwrapNativeToken: false,
    externalSwapQuote: undefined,
    orderKey: params.orderKey,
    minOutputAmount: 0n,
  };
}

export function getPendingPositionFromParams({ createOrderPayload }: { createOrderPayload: OrderCreatePayload }) {
  const positionKey = getPositionKey(
    createOrderPayload.orderPayload.addresses.receiver,
    createOrderPayload.orderPayload.addresses.market,
    createOrderPayload.orderPayload.addresses.initialCollateralToken,
    createOrderPayload.orderPayload.isLong
  );

  return {
    isIncrease: isIncreaseOrderType(createOrderPayload.orderPayload.orderType),
    positionKey,
    collateralDeltaAmount: createOrderPayload.orderPayload.numbers.initialCollateralDeltaAmount,
    sizeDeltaUsd: createOrderPayload.orderPayload.numbers.sizeDeltaUsd,
    sizeDeltaInTokens: createOrderPayload.sizeDeltaInTokens,
  };
}

export function getPendingUpdateOrder(params: SecondaryUpdateOrderParams): PendingOrderData {
  return {
    txnType: "update",
    account: params.account,
    marketAddress: params.marketAddress,
    initialCollateralTokenAddress: params.initialCollateralAddress,
    initialCollateralDeltaAmount: params.initialCollateralDeltaAmount,
    swapPath: params.swapPath,
    sizeDeltaUsd: params.sizeDeltaUsd,
    minOutputAmount: params.minOutputAmount,
    isLong: params.isLong,
    orderType: params.orderType,
    shouldUnwrapNativeToken: false,
    externalSwapQuote: undefined,
    orderKey: params.orderKey,
  };
}

export function getPedningCreateOrder(createOrderPayload: OrderCreatePayload): PendingOrderData {
  return {
    account: createOrderPayload.orderPayload.addresses.receiver,
    marketAddress: createOrderPayload.orderPayload.addresses.market,
    initialCollateralTokenAddress: createOrderPayload.orderPayload.addresses.initialCollateralToken,
    initialCollateralDeltaAmount: createOrderPayload.orderPayload.numbers.initialCollateralDeltaAmount,
    swapPath: createOrderPayload.orderPayload.addresses.swapPath,
    sizeDeltaUsd: createOrderPayload.orderPayload.numbers.sizeDeltaUsd,
    minOutputAmount: createOrderPayload.orderPayload.numbers.minOutputAmount,
    isLong: createOrderPayload.orderPayload.isLong,
    orderType: createOrderPayload.orderPayload.orderType,
    shouldUnwrapNativeToken: createOrderPayload.orderPayload.shouldUnwrapNativeToken,
    externalSwapQuote: createOrderPayload.collateralTransferParams.externalSwapQuote,
    txnType: "create",
  };
}

export function useOrderTxnCallbacks() {
  const commonTxnCallbacks = useTxnCallbacks();
  const { setPendingOrder, setPendingPosition } = useSyntheticsEvents();

  const handlePendingOrderFactory = useCallback(
    (orders: PendingOrderData[]) => () => {
      setPendingOrder(orders);
    },
    [setPendingOrder]
  );

  const handlePendingPositionFactory = useCallback(
    (position: Omit<PendingPositionUpdate, "updatedAtBlock" | "updatedAt">) => (p: OnSentParams) => {
      setPendingPosition({ ...position, updatedAtBlock: p.blockNumber, updatedAt: p.createdAt });
    },
    [setPendingPosition]
  );

  return {
    ...commonTxnCallbacks,
    handlePendingOrderFactory,
    handlePendingPositionFactory,
  };
}

export function useTxnCallbacks() {
  const { chainId } = useChainId();

  const { setPendingTxns } = usePendingTxns();

  const handleErrorFactory = useCallback(
    (p: AdditionalErrorParams, metricId?: OrderMetricId) =>
      ({ error }: TxnCallbacksInput) => {
        if (!error) {
          return;
        }

        const errorData = parseError(error);

        const toastParams = getTxnErrorToast(chainId, errorData, p);

        helperToast.error(toastParams.errorContent, {
          autoClose: toastParams.autoCloseToast,
        });

        if (metricId && errorData?.errorContext) {
          sendTxnErrorMetric(metricId, error, errorData.errorContext);
        }
      },
    [chainId]
  );

  const notifyTxnSentFactory = useCallback(
    (p: { message: ReactNode; autoClose: false | number } | undefined) => () => {
      if (!p) {
        return;
      }

      helperToast.success(p.message, { autoClose: p.autoClose });
    },
    []
  );

  const registerPendingTxnFactory = useCallback(
    (data: PendingTransactionData) =>
      ({ txnHash, metricId }: { txnHash: string; metricId: OrderMetricId | undefined }) => {
        setPendingTxns((txns) => [...txns, { hash: txnHash, message: t`Transaction sent.`, metricId, data }]);
      },
    [setPendingTxns]
  );

  const txnSentMetricFactory = makeTxnSentMetricsHandler;

  return {
    handleErrorFactory,
    notifyTxnSentFactory,
    registerPendingTxnFactory,
    txnSentMetricFactory,
  };
}
