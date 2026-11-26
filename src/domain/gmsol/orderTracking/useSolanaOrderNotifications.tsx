import { useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "react-toastify";

import { SOLANA_NETWORK_ID } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { helperToast } from "lib/helperToast";
import { reportHandledRejection } from "lib/metrics/reportHandledRejection";
import {
  getActiveSolanaSession,
  subscribeActiveSolanaSession,
  type ActiveSolanaSession,
} from "lib/solana/activeSession";
import type { GmxApiSdk } from "sdk/clients/v2";

import {
  SolanaOrderStatusNotification,
  type SolanaOrderNotificationState,
} from "components/StatusNotification/SolanaOrderStatusNotification";

import { GmsolTransactionError } from "../transactions/sendOrderTransactions";
import { refreshGmsolAccountDataAfterTransaction } from "../useGmsolAccountData";
import { classifyOrderFailure } from "./classifyOrderFailure";
import type { TrackedOrderAction } from "./reduceOrderLifecycle";
import { watchSubmittedOrders, type OrderTrackingRequest } from "./watchSubmittedOrders";

export type SolanaSubmittedOrders = {
  signatures: readonly string[];
  orders?: readonly TrackedOrderAction[];
  trackingRequests?: readonly OrderTrackingRequest[];
};

type SolanaOrderNotificationRequest = Pick<SolanaOrderNotificationState, "operation" | "orders" | "trackExecution"> & {
  owner: string;
};

type Notification = { session: ActiveSolanaSession; state: SolanaOrderNotificationState };

// Module state: toasts and tracking outlive the TradeBox or order list that started them, as EVM order toasts do.
const notifications = new Map<number, Notification>();
const trackers = new Map<AbortController, ActiveSolanaSession>();
const listeners = new Set<() => void>();
let lastToastId = 0;
let isWatchingSession = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// A network switch remounts the ToastContainer without calling onClose, so the store ends that session itself.
function endInactiveSessions() {
  const session = getActiveSolanaSession();
  for (const [controller, trackedSession] of trackers) {
    if (trackedSession === session) continue;
    controller.abort();
    trackers.delete(controller);
  }
  for (const [toastId, notification] of notifications) {
    if (notification.session === session) continue;
    notifications.delete(toastId);
    toast.dismiss(toastId);
  }
  emit();
}

function SolanaOrderNotificationToast({ toastId }: { toastId: number }) {
  const notification = useSyncExternalStore(subscribe, () => notifications.get(toastId));
  const isEnded = !notification;

  // A queued toast is not closed by toast.dismiss, so one whose session ended closes itself once shown.
  useEffect(() => {
    if (isEnded) toast.dismiss(toastId);
  }, [isEnded, toastId]);

  return notification ? <SolanaOrderStatusNotification state={notification.state} toastId={toastId} /> : null;
}

function beginNotification({
  session,
  sdk,
  operation,
  orders,
  trackExecution,
}: Omit<SolanaOrderNotificationRequest, "owner"> & { session: ActiveSolanaSession; sdk: GmxApiSdk }) {
  if (!isWatchingSession) {
    isWatchingSession = true;
    subscribeActiveSolanaSession(endInactiveSessions);
  }
  const toastId = (lastToastId = Math.max(Date.now(), lastToastId + 1));
  let state: SolanaOrderNotificationState = {
    operation,
    orders,
    trackExecution,
    isTracking: false,
    submission: "sending",
    signatures: [],
    execution: "unresolved",
    cancelledBy: undefined,
    executionSignature: undefined,
    failure: undefined,
    debug: undefined,
  };
  notifications.set(toastId, { session, state });
  helperToast.info(<SolanaOrderNotificationToast toastId={toastId} />, {
    autoClose: false,
    closeOnClick: false,
    toastId,
    // The close button or another toast only hides it: tracking and the account refresh go on.
    onClose: () => {
      if (notifications.delete(toastId)) emit();
    },
  });
  const { owner } = session;
  const isActive = () => getActiveSolanaSession() === session;
  const update = (next: Partial<SolanaOrderNotificationState>) => {
    state = { ...state, ...next };
    if (!notifications.has(toastId)) return;
    notifications.set(toastId, { session, state });
    emit();
  };
  let submitted = false;
  const onSubmitted = (result: SolanaSubmittedOrders) => {
    if (submitted || !isActive()) return;
    submitted = true;
    if (!result.signatures.length) {
      update({ submission: "unknown" });
      return;
    }
    update({ submission: "submitted", signatures: result.signatures, isTracking: trackExecution });
    if (!trackExecution) return;
    const orders = (result.orders ?? []).filter(
      (action) => action.owner === owner && result.signatures.includes(action.creationSignature)
    );
    const requests = (result.trackingRequests ?? []).filter(
      (request) => request.owner === owner && result.signatures.includes(request.signature)
    );
    const controller = new AbortController();
    trackers.set(controller, session);

    void watchSubmittedOrders({
      orders,
      requests,
      signal: controller.signal,
      onUpdate: (outcome) => {
        if (
          controller.signal.aborted ||
          !isActive() ||
          (outcome.execution !== "executed" && outcome.execution !== "cancelled")
        )
          return;
        const evidence = outcome.trade ?? outcome.removed;
        const slot = evidence?.event.fields.slot;
        const execution = outcome.execution === "cancelled" ? "cancelled" : "executed";
        // outcome.reason is the close_order_v2 label, which the keeper always sets to "executed", not a failure cause.
        update({
          submission: "submitted",
          execution,
          cancelledBy: outcome.cancelledBy,
          executionSignature: evidence?.signature,
        });
        if (typeof slot === "bigint" && slot <= BigInt(Number.MAX_SAFE_INTEGER)) {
          refreshGmsolAccountDataAfterTransaction(sdk, owner, Number(slot)).catch(() => undefined);
        }
      },
    })
      .catch(() => undefined)
      .finally(() => {
        trackers.delete(controller);
        update({ isTracking: false });
      });
  };
  return {
    submitted: onSubmitted,
    failed: (error: unknown) => {
      reportHandledRejection("solana.order")(error);
      if (!isActive()) return;
      const sendError = error instanceof GmsolTransactionError ? error : undefined;
      const signatures = sendError?.submittedSignatures ?? [];
      if (sendError && signatures.length && (sendError.orders.length || sendError.trackingRequests.length)) {
        onSubmitted({ signatures, orders: sendError.orders, trackingRequests: sendError.trackingRequests });
      }
      update(classifyOrderFailure(error));
    },
  };
}

/** Toasts render from the store because react-toastify drops toast.update calls for a toast still in its queue. */
export function useSolanaOrderNotifications() {
  const sdk = useGmxSdk(SOLANA_NETWORK_ID);

  const begin = useCallback(
    ({ owner, ...request }: SolanaOrderNotificationRequest) => {
      const session = getActiveSolanaSession();
      if (!sdk || session?.owner !== owner) throw new Error("Connect a Solana wallet before submitting an order");
      return beginNotification({ ...request, session, sdk });
    },
    [sdk]
  );

  return { begin };
}
