import { ChangeEvent, useCallback, useEffect, useState } from "react";

import { SourceChainId } from "config/chains";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectTradeboxFromToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxState,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMinResidualGasPaymentTokenAmount } from "domain/synthetics/express/getMinResidualGasPaymentTokenAmount";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { formatAmountFree, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { MarginPercentageSlider } from "./MarginPercentageSlider";
import { MarginToPayField } from "./MarginToPayField";
import { SizeField, SizeDisplayMode } from "./SizeField";

type Props = {
  onSelectFromTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
  fromTokenInputValue: string;
  setFromTokenInputValue: (value: string, resetPriceImpact?: boolean) => void;
  setFocusedInput: (input: "from" | "to") => void;
  toTokenInputValue: string;
  setToTokenInputValue: (value: string, resetPriceImpact: boolean) => void;
  expressOrdersEnabled: boolean;
  gasPaymentTokenAmountForMax?: bigint;
  isGasPaymentTokenAmountForMaxApproximate?: boolean;
  isExpressLoading?: boolean;
};

export function TradeboxMarginFields({
  onSelectFromTokenAddress,
  onDepositTokenAddress,
  fromTokenInputValue,
  setFromTokenInputValue,
  setFocusedInput,
  toTokenInputValue,
  setToTokenInputValue,
  expressOrdersEnabled,
  gasPaymentTokenAmountForMax,
  isGasPaymentTokenAmountForMaxApproximate,
  isExpressLoading,
}: Props) {
  const tokensData = useTokensData();

  const fromToken = useSelector(selectTradeboxFromToken);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const gasPaymentTokenData = useSelector(selectGasPaymentToken);

  const { fromTokenAddress, toTokenAddress } = useSelector(selectTradeboxState);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const toToken = getByKey(tokensData, toTokenAddress);

  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;

  const [sizeDisplayMode, setSizeDisplayMode] = useState<SizeDisplayMode>("token");
  const [marginPercentage, setMarginPercentage] = useState<number>(0);

  // Calculate margin percentage from input value
  useEffect(() => {
    if (fromToken?.balance === undefined || fromToken.balance === 0n) {
      setMarginPercentage(0);
      return;
    }

    const inputAmount = parseValue(fromTokenInputValue || "0", fromToken.decimals) ?? 0n;
    if (inputAmount === 0n) {
      setMarginPercentage(0);
      return;
    }

    const percentage = Number((inputAmount * 100n) / fromToken.balance);
    setMarginPercentage(Math.min(100, Math.max(0, percentage)));
  }, [fromTokenInputValue, fromToken?.balance, fromToken?.decimals]);

  const { formattedMaxAvailableAmount, showClickMax } = useMaxAvailableAmount({
    fromToken,
    nativeToken,
    fromTokenAmount,
    fromTokenInputValue,
    minResidualAmount: getMinResidualGasPaymentTokenAmount({
      gasPaymentToken: gasPaymentTokenData,
      gasPaymentTokenAmount: gasPaymentTokenAmountForMax,
      payTokenAddress: fromTokenAddress,
      applyBuffer: !isGasPaymentTokenAmountForMaxApproximate,
    }),
    isLoading: expressOrdersEnabled && (isExpressLoading || gasPaymentTokenAmountForMax === undefined),
  });

  const handleFromInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput("from");
      setFromTokenInputValue(e.target.value, true);
    },
    [setFocusedInput, setFromTokenInputValue]
  );

  const handleMaxClick = useCallback(() => {
    if (formattedMaxAvailableAmount) {
      setFocusedInput("from");
      setFromTokenInputValue(formattedMaxAvailableAmount, true);
    }
  }, [formattedMaxAvailableAmount, setFocusedInput, setFromTokenInputValue]);

  const handlePercentageChange = useCallback(
    (percentage: number) => {
      if (fromToken?.balance === undefined || fromToken.balance === 0n) return;

      setMarginPercentage(percentage);

      const amount = (fromToken.balance * BigInt(percentage)) / 100n;
      const formatted = formatAmountFree(amount, fromToken.decimals);
      setFocusedInput("from");
      setFromTokenInputValue(formatted, true);
    },
    [fromToken?.balance, fromToken?.decimals, setFocusedInput, setFromTokenInputValue]
  );

  const handleSizeInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput("to");
      setToTokenInputValue(e.target.value, true);
    },
    [setFocusedInput, setToTokenInputValue]
  );

  return (
    <div className="flex flex-col gap-4">
      <MarginToPayField
        inputValue={fromTokenInputValue}
        onInputValueChange={handleFromInputChange}
        onSelectFromTokenAddress={onSelectFromTokenAddress}
        onDepositTokenAddress={onDepositTokenAddress}
        onFocus={() => setFocusedInput("from")}
      />

      <SizeField
        sizeInTokens={increaseAmounts?.sizeDeltaInTokens}
        sizeInUsd={increaseAmounts?.sizeDeltaUsd}
        indexToken={toToken}
        displayMode={sizeDisplayMode}
        onDisplayModeChange={setSizeDisplayMode}
        inputValue={toTokenInputValue}
        onInputValueChange={handleSizeInputChange}
        onFocus={() => setFocusedInput("to")}
        qa="position-size"
      />

      <MarginPercentageSlider
        value={marginPercentage}
        onChange={handlePercentageChange}
        onMaxClick={showClickMax ? handleMaxClick : undefined}
      />
    </div>
  );
}
