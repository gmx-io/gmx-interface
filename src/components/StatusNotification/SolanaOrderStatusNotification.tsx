import { Trans } from "@lingui/macro";
import { useEffect, type ReactNode } from "react";
import { toast } from "react-toastify";

import { getExplorerUrl, SOLANA_NETWORK_ID } from "config/chains";

import { TransactionStatus, type TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

import { StatusNotification } from "./StatusNotification";
import { useToastAutoClose } from "./useToastAutoClose";

export type SolanaOrderNotificationState = {
  title: ReactNode;
  submission: "sending" | "submitted" | "failed" | "unknown";
  signatures: readonly string[];
  trackExecution: boolean;
  isTracking: boolean;
  execution: "unresolved" | "executed" | "cancelled";
  executionSignature: string | undefined;
  reason: string | undefined;
};

export function SolanaOrderStatusNotification({
  state,
  toastId,
}: {
  state: SolanaOrderNotificationState;
  toastId: number;
}) {
  const hasError = state.submission === "failed" || state.execution === "cancelled";
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
      <Trans>Order request sent</Trans>
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
        ? "error"
        : state.submission === "submitted" && state.isTracking
          ? "loading"
          : "muted";
  const signature = state.signatures[state.signatures.length - 1];
  const txUrl = (value: string | undefined) => (value ? `${getExplorerUrl(SOLANA_NETWORK_ID)}tx/${value}` : undefined);
  return (
    <StatusNotification title={state.title}>
      <TransactionStatus status={sendingStatus} text={sendingText} txnUrl={txUrl(signature)} />
      {state.trackExecution && state.submission === "submitted" && (
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
      {state.reason && <div className="mt-8 break-words text-typography-secondary">{state.reason}</div>}
    </StatusNotification>
  );
}
