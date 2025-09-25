import { useEffect, useState } from "react";

import type { SourceChainId } from "config/chains";
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

function fallbackPaySource({
  operation,
  mode,
  paySource,
  srcChainId,
}: {
  operation: Operation;
  mode: Mode;
  paySource: GmPaySource | undefined;
  srcChainId: SourceChainId | undefined;
}) {
  if (!isValidPaySource(paySource)) {
    return "gmxAccount";
  } else if (paySource === "sourceChain" && srcChainId === undefined) {
    return "settlementChain";
  } else if (paySource === "settlementChain" && srcChainId !== undefined) {
    return "sourceChain";
  } else if (operation === Operation.Deposit && paySource === "sourceChain" && mode === Mode.Pair) {
    return "gmxAccount";
  }

  return paySource;
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

  let paySource = fallbackPaySource({ operation, mode, paySource: rawPaySource, srcChainId });

  useEffect(
    function fallbackSourceChainPaySource() {
      const newPaySource = fallbackPaySource({ operation, mode, paySource: rawPaySource, srcChainId });
      if (newPaySource !== rawPaySource) {
        setPaySource(newPaySource);
      }
    },
    [mode, operation, rawPaySource, setPaySource, srcChainId]
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
