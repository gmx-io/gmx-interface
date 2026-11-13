import { createElement, useCallback, useEffect, useRef, type ReactNode } from "react";
import { toast, type Id } from "react-toastify";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { SOLANA_NETWORK_ID, isSolanaNetwork } from "config/chains";
import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import type { TrackedOrderAction } from "domain/gmsol/orderTracking/reduceOrderLifecycle";
import type { OrderTrackingRequest } from "domain/gmsol/orderTracking/watchSubmittedOrders";
import { useChainId } from "lib/chains";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";

import {
  SolanaOrderStatusNotification,
  type SolanaOrderNotificationState,
} from "components/StatusNotification/SolanaOrderStatusNotification";

export type SolanaSubmittedOrders = {
  signatures: readonly string[];
  orders?: readonly TrackedOrderAction[];
  trackingRequests?: readonly OrderTrackingRequest[];
};

type Notification = { controller: AbortController; toastId: Id };

/** Shared notification UI; only receipt parsing/tracking is loaded from the Solana chunk. */
export function useSolanaOrderNotifications() {
  const { networkId } = useChainId();
  const sdk = useGmxSdk(SOLANA_NETWORK_ID);
  const { address: owner } = useSolanaWalletSession();
  const current = useRef({ owner, networkId, sdk });
  current.current = { owner, networkId, sdk };
  const notifications = useRef(new Set<Notification>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const active = notifications.current;
    return () => {
      mounted.current = false;
      for (const notification of active) {
        notification.controller.abort();
        toast.dismiss(notification.toastId);
      }
      active.clear();
    };
  }, [owner, networkId]);

  const begin = useCallback(({ title, trackExecution }: { title: ReactNode; trackExecution: boolean }) => {
    const scope = current.current;
    if (
      !mounted.current ||
      !getIsSolanaNetworkEnabled() ||
      !isSolanaNetwork(scope.networkId) ||
      !scope.owner ||
      !scope.sdk
    ) {
      throw new Error("Connect a Solana wallet before submitting an order");
    }
    const submittedOwner = scope.owner;
    const controller = new AbortController();
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
    const toastId = toast(createElement(SolanaOrderStatusNotification, { state }), {
      autoClose: false,
      closeOnClick: false,
      onClose: () => {
        controller.abort();
        notifications.current.delete(notification);
      },
    });
    const notification = { controller, toastId };
    notifications.current.add(notification);
    const valid = () =>
      !controller.signal.aborted &&
      mounted.current &&
      getIsSolanaNetworkEnabled() &&
      current.current.owner === scope.owner &&
      current.current.networkId === scope.networkId;
    const update = (next: Partial<SolanaOrderNotificationState>, autoClose?: number | false) => {
      if (!valid()) return;
      state = { ...state, ...next };
      toast.update(toastId, {
        render: createElement(SolanaOrderStatusNotification, { state }),
        type: state.submission === "failed" || state.execution === "cancelled" ? "error" : "default",
        ...(autoClose !== undefined ? { autoClose } : {}),
      });
    };
    let submitted = false;
    const onSubmitted = (result: SolanaSubmittedOrders) => {
      if (submitted || !valid()) return;
      submitted = true;
      if (!result.signatures.length) {
        update({ submission: "unknown" });
        return;
      }
      update(
        { submission: "submitted", signatures: result.signatures, isTracking: trackExecution },
        trackExecution ? false : TOAST_AUTO_CLOSE_TIME
      );
      if (!trackExecution) return;
      const orders = (result.orders ?? []).filter(
        (action) => action.owner === scope.owner && result.signatures.includes(action.creationSignature)
      );
      const requests = (result.trackingRequests ?? []).filter(
        (request) => request.owner === scope.owner && result.signatures.includes(request.signature)
      );

      void import("domain/gmsol/orderTracking/watchSubmittedOrders")
        .then(({ watchSubmittedOrders }) => {
          if (!valid()) return;
          return watchSubmittedOrders({
            orders,
            requests,
            signal: controller.signal,
            onUpdate: (outcome) => {
              if (!valid() || (outcome.execution !== "executed" && outcome.execution !== "cancelled")) return;
              const evidence = outcome.trade ?? outcome.removed;
              const slot = evidence?.event.fields.slot;
              const execution = outcome.execution === "cancelled" ? "cancelled" : "executed";
              update(
                {
                  submission: "submitted",
                  execution,
                  executionSignature: evidence?.signature,
                  reason: outcome.execution === "cancelled" ? outcome.reason : undefined,
                },
                TOAST_AUTO_CLOSE_TIME
              );
              if (typeof slot === "bigint" && slot <= BigInt(Number.MAX_SAFE_INTEGER)) {
                void import("domain/gmsol/useGmsolAccountData")
                  .then(({ refreshGmsolAccountDataAfterTransaction }) =>
                    valid()
                      ? refreshGmsolAccountDataAfterTransaction(scope.sdk!, submittedOwner, Number(slot))
                      : undefined
                  )
                  .catch(() => undefined);
              }
            },
          });
        })
        .catch(() => undefined)
        .finally(() => update({ isTracking: false }));
    };
    return {
      submitted: onSubmitted,
      failed: (error: unknown) => {
        if (!valid()) return;
        const detail =
          error && typeof error === "object"
            ? (error as {
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
        update(
          {
            submission: ambiguous ? "unknown" : "failed",
            signatures: failed ? [failed] : pending ? [...signatures, pending] : signatures,
          },
          ambiguous ? false : TOAST_AUTO_CLOSE_TIME
        );
      },
    };
  }, []);

  return { begin };
}
