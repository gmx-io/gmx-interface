import { useEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "react-use";

import { getOrderAutoSubmitStep } from "domain/synthetics/usdgPools/orderAutoSubmit";

// the button has to hold its state this long, so a render that hasn't caught up with the new margin is skipped
const SETTLE_MS = 1000;

/**
 * After a convert-first swap executes, presses the order button for the trader: approval first when the wallet
 * needs it, then the order. Any interaction with the trade box hands the button back.
 */
export function useOrderAutoSubmitAfterConversion({
  isPending,
  stop,
  buttonState,
  isDepositButtonShown,
  onSubmit,
}: {
  isPending: boolean;
  stop: () => void;
  buttonState: {
    disabled: boolean;
    isExpressLoading: boolean;
    approvalTokenAddress: string | undefined;
    isApproving: boolean;
  };
  isDepositButtonShown: boolean;
  onSubmit: () => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestedApprovalsRef = useRef(new Set<string>());
  const { disabled, isExpressLoading, approvalTokenAddress, isApproving } = buttonState;
  // price ticks recreate both on every render, which would keep restarting the settle timer
  const latestOnSubmit = useLatest(onSubmit);
  const latestStop = useLatest(stop);

  useEffect(
    function placeOrderAfterConversion() {
      if (!isPending) {
        requestedApprovalsRef.current = new Set();
        return;
      }

      const step = getOrderAutoSubmitStep({
        isSubmitting,
        isButtonLoading: isExpressLoading || isApproving,
        isButtonDisabled: disabled,
        isDepositButtonShown,
        approvalTokenAddress,
        isApprovalRequested:
          approvalTokenAddress !== undefined && requestedApprovalsRef.current.has(approvalTokenAddress),
      });

      if (step === "wait") {
        return;
      }

      const timerId = setTimeout(() => {
        if (step === "approve" && approvalTokenAddress !== undefined) {
          requestedApprovalsRef.current.add(approvalTokenAddress);
        } else {
          latestStop.current();
        }

        if (step === "stop") {
          return;
        }

        setIsSubmitting(true);
        latestOnSubmit
          .current()
          .catch(() => undefined)
          .finally(() => setIsSubmitting(false));
      }, SETTLE_MS);

      return () => clearTimeout(timerId);
    },
    [
      approvalTokenAddress,
      disabled,
      isApproving,
      isDepositButtonShown,
      isExpressLoading,
      isPending,
      isSubmitting,
      latestOnSubmit,
      latestStop,
    ]
  );

  return useMemo(
    () => (isPending ? { onPointerDownCapture: stop, onKeyDownCapture: stop } : undefined),
    [isPending, stop]
  );
}
