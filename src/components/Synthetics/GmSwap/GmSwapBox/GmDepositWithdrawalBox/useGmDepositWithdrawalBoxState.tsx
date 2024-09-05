import { useState } from "react";

import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useSafeState } from "lib/useSafeState";

import { Mode, Operation } from "../types";
import { useDepositWithdrawalSetFirstTokenAddress } from "../useDepositWithdrawalSetFirstTokenAddress";

export function useGmDepositWithdrawalBoxState(operation: Operation, mode: Mode, marketAddress: string | undefined) {
  const isDeposit = operation === Operation.Deposit;

  const chainId = useSelector(selectChainId);

  const [focusedInput, setFocusedInput] = useState<"longCollateral" | "shortCollateral" | "market">("market");
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);

  console.log("-----------> marketAddress", marketAddress);
  const [firstTokenAddress, setFirstTokenAddress] = useDepositWithdrawalSetFirstTokenAddress(isDeposit, marketAddress);

  console.log("-----------> FIRST", firstTokenAddress);

  const [secondTokenAddress, setSecondTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, marketAddress, "second"],
    undefined
  );
  const [firstTokenInputValue, setFirstTokenInputValue] = useSafeState<string>("");
  const [secondTokenInputValue, setSecondTokenInputValue] = useSafeState<string>("");
  const [marketTokenInputValue, setMarketTokenInputValue] = useSafeState<string>("");

  return {
    focusedInput,
    setFocusedInput,

    isHighPriceImpactAccepted,
    setIsHighPriceImpactAccepted,

    firstTokenAddress,
    setFirstTokenAddress,

    secondTokenAddress,
    setSecondTokenAddress,

    firstTokenInputValue,
    setFirstTokenInputValue,

    secondTokenInputValue,
    setSecondTokenInputValue,

    marketTokenInputValue,
    setMarketTokenInputValue,
  };
}
