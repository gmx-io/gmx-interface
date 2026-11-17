import { useEffect, useRef } from "react";
import { useLatest, usePrevious } from "react-use";

import type { MaxActionSelection } from "domain/tokens/useMaxAvailableAmount";

// Max picked before the fee moved to another token was computed with the old holdback, so fill it again
export function useRefillMaxOnFeeTokenChange({
  feeTokenAddress,
  payTokenAddress,
  inputValue,
  selected,
  isReady,
  maxAvailableAmount,
  onMaxClick,
}: {
  feeTokenAddress: string | undefined;
  payTokenAddress: string | undefined;
  inputValue: string;
  selected: MaxActionSelection | undefined;
  isReady: boolean;
  maxAvailableAmount: bigint;
  onMaxClick: () => void;
}) {
  const prevFeeTokenAddress = usePrevious(feeTokenAddress);
  const prevPayTokenAddress = usePrevious(payTokenAddress);
  const prevSelected = usePrevious(selected);
  const isRefillPendingRef = useRef(false);
  const pendingInputValueRef = useRef<string | undefined>(undefined);
  const latestInputValue = useLatest(inputValue);

  useEffect(
    function markMaxRefill() {
      if (prevFeeTokenAddress === undefined || prevFeeTokenAddress === feeTokenAddress) return;

      // a new pay token keeps the amount the user had, only a fee token change on its own refills Max
      isRefillPendingRef.current = prevSelected === "max" && prevPayTokenAddress === payTokenAddress;
      pendingInputValueRef.current = latestInputValue.current;
    },
    [feeTokenAddress, latestInputValue, payTokenAddress, prevFeeTokenAddress, prevPayTokenAddress, prevSelected]
  );

  useEffect(
    function refillMax() {
      if (!isRefillPendingRef.current) return;

      // the user typed an amount while the new fee was being estimated
      if (inputValue !== pendingInputValueRef.current) {
        isRefillPendingRef.current = false;
        return;
      }

      if (!isReady) return;

      isRefillPendingRef.current = false;

      if (maxAvailableAmount > 0n) {
        onMaxClick();
      }
    },
    [feeTokenAddress, inputValue, isReady, maxAvailableAmount, onMaxClick]
  );
}
