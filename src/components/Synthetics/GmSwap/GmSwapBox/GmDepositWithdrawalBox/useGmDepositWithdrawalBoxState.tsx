import { useEffect, useState } from "react";

import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useSafeState } from "lib/useSafeState";

import { Mode, Operation } from "../types";
import { useDepositWithdrawalSetFirstTokenAddress } from "../useDepositWithdrawalSetFirstTokenAddress";
import type { GmPaySource } from "./types";

function isValidPaySource(paySource: string | undefined): paySource is GmPaySource {
  return (
    (paySource as GmPaySource) === "settlementChain" ||
    (paySource as GmPaySource) === "sourceChain" ||
    (paySource as GmPaySource) === "gmxAccount"
  );
}

export function useGmDepositWithdrawalBoxState(operation: Operation, mode: Mode, marketAddress: string | undefined) {
  const isDeposit = operation === Operation.Deposit;

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);

  const [focusedInput, setFocusedInput] = useState<"longCollateral" | "shortCollateral" | "market">("market");

  let [rawPaySource, setPaySource] = useLocalStorageSerializeKey<GmPaySource>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, "paySource"],
    "settlementChain"
  );

  let paySource = rawPaySource;

  if (!isValidPaySource(paySource)) {
    paySource = "gmxAccount";
  } else if (rawPaySource === "sourceChain" && srcChainId === undefined) {
    paySource = "settlementChain";
  } else if (rawPaySource === "settlementChain" && srcChainId !== undefined) {
    paySource = "sourceChain";
  } else if (paySource === "sourceChain" && mode === Mode.Pair) {
    paySource = "gmxAccount";
  }

  useEffect(
    function fallbackSourceChainPaySource() {
      if (rawPaySource === "sourceChain" && srcChainId === undefined) {
        setPaySource("settlementChain");
      } else if (rawPaySource === "settlementChain" && srcChainId !== undefined) {
        setPaySource("sourceChain");
      } else if (rawPaySource === "sourceChain" && mode === Mode.Pair) {
        setPaySource("gmxAccount");
      }
    },
    [mode, rawPaySource, setPaySource, srcChainId]
  );

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
