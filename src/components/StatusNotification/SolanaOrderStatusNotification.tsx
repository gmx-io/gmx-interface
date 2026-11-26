import { t, Trans } from "@lingui/macro";
import { useEffect } from "react";
import { toast } from "react-toastify";

import { getExplorerUrl, SOLANA_NETWORK_ID } from "config/chains";
import type { OrderTxnType } from "sdk/utils/orders/types";

import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { TransactionStatus, type TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

import { getOrderStatusTitle, type OrderStatusTitleData } from "./getOrderStatusTitle";
import { StatusNotification } from "./StatusNotification";
import { useToastAutoClose } from "./useToastAutoClose";

export type SolanaOrderNotificationState = {
  operation: OrderTxnType | "prepare";
  // Empty when the toast only checks an earlier submission.
  orders: readonly OrderStatusTitleData[];
  submission: "sending" | "submitted" | "failed" | "unknown";
  signatures: readonly string[];
  trackExecution: boolean;
  isTracking: boolean;
  execution: "unresolved" | "executed" | "cancelled";
  cancelledBy: "owner" | undefined;
  executionSignature: string | undefined;
  failure: "rejected" | "expired" | "walletTimeout" | "insufficientSol" | "prepared" | undefined;
  debug: string | undefined;
};

export function SolanaOrderStatusNotification({
  state,
  toastId,
}: {
  state: SolanaOrderNotificationState;
  toastId: number;
}) {
  const isOwnerCancel = state.execution === "cancelled" && state.cancelledBy === "owner";
  const hasError = state.submission === "failed" || (state.execution === "cancelled" && !isOwnerCancel);
  const isCompleted =
    state.submission === "failed" ||
    (state.submission === "submitted" && (!state.trackExecution || state.execution !== "unresolved"));

  useToastAutoClose(isCompleted, toastId);

  useEffect(() => {
    // An update during the exit animation would show a closed toast again.
    if (hasError && toast.isActive(toastId)) toast.update(toastId, { type: "error" });
  }, [hasError, toastId]);

  const sendingText =
    state.submission === "submitted" ? (
      state.operation === "update" ? (
        <Trans>Order updated</Trans>
      ) : state.operation === "cancel" ? (
        <Trans>Order canceled</Trans>
      ) : (
        <Trans>Order request sent</Trans>
      )
    ) : state.submission === "failed" ? (
      <Trans>Order request failed</Trans>
    ) : state.submission === "unknown" ? (
      <Trans>Order submission status unknown. Check the transaction before retrying.</Trans>
    ) : (
      <Trans>Sending order request...</Trans>
    );
  const sendingStatus: TransactionStatusType =
    state.submission === "submitted"
      ? "success"
      : state.submission === "failed"
        ? "error"
        : state.submission === "unknown"
          ? "muted"
          : "loading";
  const executionStatus: TransactionStatusType =
    state.execution === "executed"
      ? "success"
      : state.execution === "cancelled"
        ? isOwnerCancel
          ? "muted"
          : "error"
        : state.submission === "submitted" && state.isTracking
          ? "loading"
          : "muted";
  const detail =
    state.failure === "prepared" ? (
      <Trans>
        Your accounts are prepared and any wrapped SOL is now WSOL in your wallet. Submit again to place the order.
      </Trans>
    ) : state.failure === "expired" ? (
      <Trans>The transaction expired before it landed. Nothing was executed.</Trans>
    ) : state.failure === "walletTimeout" ? (
      <Trans>The wallet request timed out. Nothing was sent.</Trans>
    ) : state.failure === "rejected" ? (
      <Trans>Transaction canceled</Trans>
    ) : state.failure === "insufficientSol" ? (
      <Trans>Not enough SOL for network fees, keeper fees and account rent</Trans>
    ) : isOwnerCancel ? (
      <Trans>Canceled by you</Trans>
    ) : state.execution === "cancelled" ? (
      <Trans>The order could not be executed</Trans>
    ) : undefined;
  const signature = state.signatures[state.signatures.length - 1];
  const txUrl = (value: string | undefined) => (value ? `${getExplorerUrl(SOLANA_NETWORK_ID)}tx/${value}` : undefined);
  const titles = state.orders.length
    ? state.orders.map((order) => getOrderStatusTitle(order))
    : [t`Previous order request`];
  return (
    <div className="StatusNotification-list">
      {titles.map((title, index) => (
        <StatusNotification key={index} title={title}>
          <TransactionStatus
            status={sendingStatus}
            text={sendingText}
            txnUrl={index === 0 ? txUrl(signature) : undefined}
          />
          {index === 0 && state.trackExecution && state.submission === "submitted" && (
            <TransactionStatus
              status={executionStatus}
              text={
                state.execution === "executed" ? (
                  <Trans>Order filled</Trans>
                ) : state.execution === "cancelled" ? (
                  <Trans>Order canceled</Trans>
                ) : !state.isTracking && state.submission === "submitted" ? (
                  <Trans>Order outcome not confirmed. Check the transaction for updates.</Trans>
                ) : (
                  <Trans>Fulfilling order request...</Trans>
                )
              }
              txnUrl={txUrl(state.executionSignature)}
            />
          )}
          {index === 0 && detail && <div className="mt-8 break-words text-typography-secondary">{detail}</div>}
          {index === 0 && state.debug && <ToastifyDebug error={state.debug} />}
        </StatusNotification>
      ))}
    </div>
  );
}
