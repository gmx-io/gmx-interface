import { ChangeEvent, useCallback, useEffect, useState } from "react";

import { SourceChainId } from "config/chains";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectTradeboxFromToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarkPrice,
  selectTradeboxState,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMinResidualGasPaymentTokenAmount } from "domain/synthetics/express/getMinResidualGasPaymentTokenAmount";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { formatAmountFree, parseValue, USD_DECIMALS } from "lib/numbers";
import { getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { MarginPercentageSlider } from "./MarginPercentageSlider";
import { MarginToPayField } from "./MarginToPayField";
import { PriceField, PriceDisplayMode } from "./PriceField";
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
  triggerPriceInputValue?: string;
  onTriggerPriceInputChange?: (e: ChangeEvent<HTMLInputElement>) => void;
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
  triggerPriceInputValue,
  onTriggerPriceInputChange,
}: Props) {
  const tokensData = useTokensData();

  const fromToken = useSelector(selectTradeboxFromToken);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const gasPaymentTokenData = useSelector(selectGasPaymentToken);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const markPrice = useSelector(selectTradeboxMarkPrice);

  const { fromTokenAddress, toTokenAddress } = useSelector(selectTradeboxState);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const toToken = getByKey(tokensData, toTokenAddress);

  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;

  const [sizeDisplayMode, setSizeDisplayMode] = useState<SizeDisplayMode>("token");
  const [priceDisplayMode, setPriceDisplayMode] = useState<PriceDisplayMode>("usd");
  const [marginPercentage, setMarginPercentage] = useState<number>(0);

  const { isLimit } = tradeFlags;
  const showPriceField = isLimit && triggerPriceInputValue !== undefined;

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

  const handleSizeDisplayModeChange = useCallback(
    (newMode: SizeDisplayMode) => {
      if (newMode === sizeDisplayMode || !toToken || markPrice === undefined || markPrice === 0n) {
        setSizeDisplayMode(newMode);
        return;
      }

      const visualMultiplier = BigInt(toToken.visualMultiplier ?? 1);

      if (newMode === "token") {
        const parsedUsd = parseValue(toTokenInputValue || "0", USD_DECIMALS);
        if (parsedUsd !== undefined && parsedUsd > 0n) {
          const sizeInTokens = (parsedUsd * 10n ** BigInt(toToken.decimals)) / markPrice;
          setFocusedInput("to");
          setToTokenInputValue(formatAmountFree(sizeInTokens / visualMultiplier, toToken.decimals), false);
        }
      } else {
        const parsedTokens = parseValue(toTokenInputValue || "0", toToken.decimals);
        if (parsedTokens !== undefined && parsedTokens > 0n) {
          const sizeInUsd = (parsedTokens * visualMultiplier * markPrice) / 10n ** BigInt(toToken.decimals);
          setFocusedInput("to");
          setToTokenInputValue(formatAmountFree(sizeInUsd, USD_DECIMALS), false);
        }
      }

      setSizeDisplayMode(newMode);
    },
    [sizeDisplayMode, toToken, markPrice, toTokenInputValue, setFocusedInput, setToTokenInputValue]
  );

  const handlePriceDisplayModeChange = useCallback(
    (newMode: PriceDisplayMode) => {
      if (newMode === priceDisplayMode || !toToken || markPrice === undefined || markPrice === 0n) {
        setPriceDisplayMode(newMode);
        return;
      }

      const visualMultiplier = BigInt(toToken.visualMultiplier ?? 1);

      if (newMode === "token") {
        const parsedUsd = parseValue(triggerPriceInputValue || "0", USD_DECIMALS);
        if (parsedUsd !== undefined && parsedUsd > 0n) {
          const tokenValue = (parsedUsd * visualMultiplier * 10n ** BigInt(toToken.decimals)) / markPrice;
          const newInputValue = formatAmountFree(tokenValue, toToken.decimals);
          if (onTriggerPriceInputChange) {
            onTriggerPriceInputChange({ target: { value: newInputValue } } as ChangeEvent<HTMLInputElement>);
          }
        }
      } else {
        const parsedTokens = parseValue(triggerPriceInputValue || "0", toToken.decimals);
        if (parsedTokens !== undefined && parsedTokens > 0n) {
          const usdValue = (parsedTokens * markPrice) / (10n ** BigInt(toToken.decimals) * visualMultiplier);
          const newInputValue = formatAmountFree(usdValue, USD_DECIMALS);
          if (onTriggerPriceInputChange) {
            onTriggerPriceInputChange({ target: { value: newInputValue } } as ChangeEvent<HTMLInputElement>);
          }
        }
      }

      setPriceDisplayMode(newMode);
    },
    [priceDisplayMode, toToken, markPrice, triggerPriceInputValue, onTriggerPriceInputChange]
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
        onDisplayModeChange={handleSizeDisplayModeChange}
        inputValue={toTokenInputValue}
        onInputValueChange={handleSizeInputChange}
        onFocus={() => setFocusedInput("to")}
        qa="position-size"
      />

      {showPriceField && onTriggerPriceInputChange && (
        <PriceField
          indexToken={toToken}
          markPrice={markPrice}
          displayMode={priceDisplayMode}
          onDisplayModeChange={handlePriceDisplayModeChange}
          inputValue={triggerPriceInputValue}
          onInputValueChange={onTriggerPriceInputChange}
          qa="trigger-price"
        />
      )}

      <MarginPercentageSlider
        value={marginPercentage}
        onChange={handlePercentageChange}
        onMaxClick={showClickMax ? handleMaxClick : undefined}
      />
    </div>
  );
}
