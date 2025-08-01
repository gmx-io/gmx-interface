import { useState } from "react";

import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useSafeState } from "lib/useSafeState";

import { Mode, Operation } from "../types";
import { useDepositWithdrawalSetFirstTokenAddress } from "../useDepositWithdrawalSetFirstTokenAddress";
import type { GmOrGlvPaySource } from "./types";

function isValidPaySource(paySource: string | undefined): paySource is GmOrGlvPaySource {
  return (
    (paySource as GmOrGlvPaySource) === "settlementChain" ||
    (paySource as GmOrGlvPaySource) === "sourceChain" ||
    (paySource as GmOrGlvPaySource) === "gmxAccount"
  );
}

export function useGmDepositWithdrawalBoxState(operation: Operation, mode: Mode, marketAddress: string | undefined) {
  const isDeposit = operation === Operation.Deposit;

  const chainId = useSelector(selectChainId);

  const [focusedInput, setFocusedInput] = useState<"longCollateral" | "shortCollateral" | "market">("market");

  let [paySource, setPaySource] = useLocalStorageSerializeKey<GmOrGlvPaySource>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, "paySource"],
    "settlementChain"
  );

  if (!isValidPaySource(paySource)) {
    paySource = "gmxAccount";
  }

  let [isSendBackToSourceChain, setIsSendBackToSourceChain] = useLocalStorageSerializeKey<boolean>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, "isSendBackToSourceChain"],
    false
  );

  if (isSendBackToSourceChain === undefined) {
    isSendBackToSourceChain = false;
  }

  const [firstTokenAddress, setFirstTokenAddress] = useDepositWithdrawalSetFirstTokenAddress(isDeposit, marketAddress);
  const [secondTokenAddress, setSecondTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, marketAddress, "second"],
    undefined
  );
  const [firstTokenInputValue, setFirstTokenInputValue] = useSafeState<string>("");
  const [secondTokenInputValue, setSecondTokenInputValue] = useSafeState<string>("");
  const [marketOrGlvTokenInputValue, setMarketOrGlvTokenInputValue] = useSafeState<string>("");

  return {
    focusedInput,
    setFocusedInput,

    paySource,
    setPaySource,

    isSendBackToSourceChain,
    setIsSendBackToSourceChain,

    firstTokenAddress,
    setFirstTokenAddress,

    secondTokenAddress,
    setSecondTokenAddress,

    firstTokenInputValue,
    setFirstTokenInputValue,

    secondTokenInputValue,
    setSecondTokenInputValue,

    marketOrGlvTokenInputValue,
    setMarketOrGlvTokenInputValue,
  };
}
