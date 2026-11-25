import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "react-toastify";

import { SOLANA_NETWORK_ID } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { helperToast } from "lib/helperToast";
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

import { refreshGmsolAccountDataAfterTransaction } from "../useGmsolAccountData";
import type { TrackedOrderAction } from "./reduceOrderLifecycle";
import { watchSubmittedOrders, type OrderTrackingRequest } from "./watchSubmittedOrders";

export type SolanaSubmittedOrders = {
  signatures: readonly string[];
  orders?: readonly TrackedOrderAction[];
  trackingRequests?: readonly OrderTrackingRequest[];
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
  title,
  trackExecution,
}: {
  session: ActiveSolanaSession;
  sdk: GmxApiSdk;
  title: ReactNode;
  trackExecution: boolean;
}) {
  if (!isWatchingSession) {
    isWatchingSession = true;
    subscribeActiveSolanaSession(endInactiveSessions);
  }
  const toastId = (lastToastId = Math.max(Date.now(), lastToastId + 1));
  let state: SolanaOrderNotificationState = {
    title,
    trackExecution,
    isTracking: false,
    submission: "sending",
    signatures: [],
    execution: "unresolved",
    executionSignature: undefined,
    reason: undefined,
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
        update({
          submission: "submitted",
          execution,
          executionSignature: evidence?.signature,
          reason: outcome.execution === "cancelled" ? outcome.reason : undefined,
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
      if (!isActive()) return;
      const detail =
        error && typeof error === "object"
          ? (error as {
              message?: unknown;
              submittedSignatures?: unknown;
              confirmedSignatures?: readonly string[];
              pendingSignature?: unknown;
              failedSignature?: unknown;
              orders?: readonly TrackedOrderAction[];
              trackingRequests?: readonly OrderTrackingRequest[];
            })
          : undefined;
      const signatures = Array.isArray(detail?.submittedSignatures)
        ? detail.submittedSignatures.filter((value): value is string => typeof value === "string")
        : [];
      const pending = typeof detail?.pendingSignature === "string" ? detail.pendingSignature : undefined;
      const failed = typeof detail?.failedSignature === "string" ? detail.failedSignature : undefined;
      const confirmed = detail?.confirmedSignatures ?? [];
      const ambiguous =
        failed === undefined && (pending !== undefined || signatures.some((value) => !confirmed.includes(value)));
      if (signatures.length && (detail?.orders?.length || detail?.trackingRequests?.length)) {
        onSubmitted({ signatures, orders: detail.orders, trackingRequests: detail.trackingRequests });
      }
      update({
        submission: ambiguous ? "unknown" : "failed",
        signatures: failed ? [failed] : pending ? [...signatures, pending] : signatures,
        reason: typeof error === "string" ? error : typeof detail?.message === "string" ? detail.message : undefined,
      });
    },
  };
}

/** Toasts render from the store because react-toastify drops toast.update calls for a toast still in its queue. */
export function useSolanaOrderNotifications() {
  const sdk = useGmxSdk(SOLANA_NETWORK_ID);

  const begin = useCallback(
    ({ owner, title, trackExecution }: { owner: string; title: ReactNode; trackExecution: boolean }) => {
      const session = getActiveSolanaSession();
      if (!sdk || session?.owner !== owner) throw new Error("Connect a Solana wallet before submitting an order");
      return beginNotification({ session, sdk, title, trackExecution });
    },
    [sdk]
  );

  return { begin };
}
