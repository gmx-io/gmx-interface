import { useEffect, useMemo, useRef } from "react";

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
  const isSubmittingRef = useRef(false);
  const requestedApprovalsRef = useRef(new Set<string>());
  const { disabled, isExpressLoading, approvalTokenAddress, isApproving } = buttonState;

  useEffect(
    function placeOrderAfterConversion() {
      if (!isPending) {
        requestedApprovalsRef.current = new Set();
        return;
      }

      const step = getOrderAutoSubmitStep({
        isSubmitting: isSubmittingRef.current,
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
          stop();
        }

        if (step === "stop") {
          return;
        }

        isSubmittingRef.current = true;
        onSubmit()
          .catch(() => undefined)
          .finally(() => {
            isSubmittingRef.current = false;
          });
      }, SETTLE_MS);

      return () => clearTimeout(timerId);
    },
    [approvalTokenAddress, disabled, isApproving, isDepositButtonShown, isExpressLoading, isPending, onSubmit, stop]
  );

  return useMemo(
    () => (isPending ? { onPointerDownCapture: stop, onKeyDownCapture: stop } : undefined),
    [isPending, stop]
  );
}
