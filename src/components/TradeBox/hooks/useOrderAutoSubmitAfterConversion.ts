import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useLatest } from "react-use";

import { getOrderAutoSubmitStep } from "domain/synthetics/usdgPools/orderAutoSubmit";

// the button has to hold its state this long, so a render that hasn't caught up with the new margin is skipped
const SETTLE_MS = 1000;

const NON_EDITING_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock"]);

/**
 * After a convert-first swap executes, presses the order button for the trader: approval first when the wallet
 * needs it, then the order. Any interaction with the trade box hands the button back.
 */
export function useOrderAutoSubmitAfterConversion({
  isArmed,
  isPending,
  isAwaitingBalance,
  requestedApprovals,
  markApprovalRequested,
  stop,
  buttonState,
  isDepositButtonShown,
  onApprove,
  onSubmit,
}: {
  isArmed: boolean;
  isPending: boolean;
  isAwaitingBalance: boolean;
  requestedApprovals: string[];
  markApprovalRequested: (tokenAddress: string) => void;
  stop: () => void;
  buttonState: {
    disabled: boolean;
    isExpressLoading: boolean;
    approvalTokenAddress: string | undefined;
    isApproving: boolean;
    isAllowanceLoaded: boolean;
  };
  isDepositButtonShown: boolean;
  onApprove: () => Promise<void>;
  onSubmit: () => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { disabled, isExpressLoading, approvalTokenAddress, isApproving, isAllowanceLoaded } = buttonState;
  // price ticks recreate these on every render, which would keep restarting the settle timer
  const latestOnApprove = useLatest(onApprove);
  const latestOnSubmit = useLatest(onSubmit);
  const latestStop = useLatest(stop);
  const latestMarkApprovalRequested = useLatest(markApprovalRequested);

  const step = isPending
    ? getOrderAutoSubmitStep({
        isSubmitting,
        isButtonLoading: isExpressLoading || isApproving || isAwaitingBalance,
        isAllowanceLoaded,
        isButtonDisabled: disabled,
        isDepositButtonShown,
        approvalTokenAddress,
        isApprovalRequested: approvalTokenAddress !== undefined && requestedApprovals.includes(approvalTokenAddress),
      })
    : undefined;
  const latestStep = useLatest(step);

  useEffect(
    function placeOrderAfterConversion() {
      if (step === undefined || step === "wait") {
        return;
      }

      const timerId = setTimeout(() => {
        if (latestStep.current !== step) {
          return;
        }

        if (step === "approve" && approvalTokenAddress !== undefined) {
          latestMarkApprovalRequested.current(approvalTokenAddress);
        } else {
          latestStop.current();
        }

        if (step === "stop") {
          return;
        }

        setIsSubmitting(true);
        (step === "approve" ? latestOnApprove : latestOnSubmit)
          .current()
          .catch(() => undefined)
          .finally(() => setIsSubmitting(false));
      }, SETTLE_MS);

      return () => clearTimeout(timerId);
    },
    [
      approvalTokenAddress,
      disabled,
      isAllowanceLoaded,
      isApproving,
      isAwaitingBalance,
      isDepositButtonShown,
      isExpressLoading,
      isPending,
      isSubmitting,
      latestMarkApprovalRequested,
      latestOnApprove,
      latestOnSubmit,
      latestStep,
      latestStop,
      requestedApprovals,
      step,
    ]
  );

  // armed covers the render before the converted margin lands too
  return useMemo(
    () =>
      isArmed
        ? {
            onPointerDownCapture: stop,
            onKeyDownCapture: (event: KeyboardEvent) => {
              // Cmd+Tab to the wallet or moving focus isn't taking over the trade box
              if (!NON_EDITING_KEYS.has(event.key)) {
                stop();
              }
            },
          }
        : undefined,
    [isArmed, stop]
  );
}
