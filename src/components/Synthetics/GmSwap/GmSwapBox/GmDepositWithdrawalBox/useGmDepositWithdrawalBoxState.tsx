import { useState } from "react";

import { getSyntheticsDepositIndexTokenKey, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useSafeState } from "lib/useSafeState";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";

import { Operation, Mode } from "../types";

export function useGmDepositWithdrawalBoxState(operation: Operation, mode: Mode, marketAddress: string | undefined) {
  const isDeposit = operation === Operation.Deposit;

  const chainId = useSelector(selectChainId);

  const [focusedInput, setFocusedInput] = useState<"longCollateral" | "shortCollateral" | "market">("market");
  const [stage, setStage] = useState<"swap" | "confirmation" | "processing">();
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const [indexName, setIndexName] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsDepositIndexTokenKey(chainId),
    undefined
  );
  const [firstTokenAddress, setFirstTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, marketAddress, "first"],
    undefined
  );
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

    stage,
    setStage,

    isHighPriceImpactAccepted,
    setIsHighPriceImpactAccepted,

    indexName,
    setIndexName,

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
