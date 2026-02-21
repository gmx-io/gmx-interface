import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import { SourceChainId } from "config/chains";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxFocusedInput,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarkPrice,
  selectTradeboxState,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { calculateDisplayDecimals, formatAmountFree, limitDecimals, parseValue, USD_DECIMALS } from "lib/numbers";
import { getByKey } from "lib/objects";
import { bigMath } from "sdk/utils/bigmath";

import { MarginField } from "./MarginField";
import { MarginPercentageSlider } from "./MarginPercentageSlider";
import { PriceField } from "./PriceField";
import { SizeField, SizeDisplayMode } from "./SizeField";
import { useSizeConversion } from "./useSizeConversion";
import { useTradeboxManualLeverageSizeSlider } from "./useTradeboxManualLeverageSizeSlider";

type Props = {
  onSelectFromTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
  fromTokenInputValue: string;
  setFromTokenInputValue: (value: string, resetPriceImpact?: boolean) => void;
  setFocusedInput: (input: "from" | "to") => void;
  toTokenInputValue: string;
  setToTokenInputValue: (value: string, resetPriceImpact: boolean) => void;
  triggerPriceInputValue?: string;
  onTriggerPriceInputChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onMarkPriceClick?: () => void;
};

export function TradeboxMarginFields({
  onSelectFromTokenAddress,
  onDepositTokenAddress,
  fromTokenInputValue,
  setFromTokenInputValue,
  setFocusedInput,
  toTokenInputValue,
  setToTokenInputValue,
  triggerPriceInputValue,
  onTriggerPriceInputChange,
  onMarkPriceClick,
}: Props) {
  const tokensData = useTokensData();

  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const toTokenAmount = useSelector(selectTradeboxToTokenAmount);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const focusedInput = useSelector(selectTradeboxFocusedInput);

  const { toTokenAddress } = useSelector(selectTradeboxState);

  const toToken = getByKey(tokensData, toTokenAddress);

  const [sizeDisplayMode, setSizeDisplayMode] = useState<SizeDisplayMode>("usd");
  const [sizeInputValue, setSizeInputValue] = useState<string>(toTokenInputValue);

  const { isLimit } = tradeFlags;
  const showPriceField = isLimit && triggerPriceInputValue !== undefined;
  const sizeFieldInputValue = sizeDisplayMode === "usd" ? sizeInputValue : toTokenInputValue;

  const sizeUsdDisplayDecimals = useMemo(
    () => calculateDisplayDecimals(markPrice, USD_DECIMALS, toToken?.visualMultiplier),
    [markPrice, toToken?.visualMultiplier]
  );

  const { tokensToUsd, usdToTokens, canConvert } = useSizeConversion({
    toToken,
    markPrice,
    sizeUsdDisplayDecimals,
  });

  const marginPercentage = useMemo(() => {
    if (fromToken?.balance === undefined || fromToken.balance === 0n) return 0;

    const inputAmount = parseValue(fromTokenInputValue || "0", fromToken.decimals) ?? 0n;
    if (inputAmount === 0n) return 0;

    const percentage = Number(bigMath.divRound(inputAmount * 100n, fromToken.balance));
    return Math.min(100, Math.max(0, percentage));
  }, [fromTokenInputValue, fromToken?.balance, fromToken?.decimals]);

  const { isLeverageSliderEnabled, sizePercentage, handleSizePercentageChange } = useTradeboxManualLeverageSizeSlider({
    fromToken,
    toToken,
    tradeFlags,
    tradeMode,
    markPrice,
    fromTokenAmount,
    toTokenAmount,
    increaseInitialCollateralUsd: increaseAmounts?.initialCollateralUsd,
    sizeDisplayMode,
    canConvert,
    tokensToUsd,
    setSizeInputValue,
    setFocusedInput,
    setToTokenInputValue,
  });

  useEffect(() => {
    if (sizeDisplayMode !== "usd" || !canConvert) return;

    if (focusedInput === "to") {
      const tokensValue = usdToTokens(sizeInputValue);
      if (tokensValue !== toTokenInputValue) {
        setToTokenInputValue(tokensValue, false);
      }
    } else {
      const usdValue = tokensToUsd(toTokenInputValue);
      if (usdValue !== sizeInputValue) {
        setSizeInputValue(usdValue);
      }
    }
  }, [
    focusedInput,
    sizeDisplayMode,
    sizeInputValue,
    toTokenInputValue,
    canConvert,
    tokensToUsd,
    usdToTokens,
    setToTokenInputValue,
  ]);

  const handleFromInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput("from");
      setFromTokenInputValue(e.target.value, true);
    },
    [setFocusedInput, setFromTokenInputValue]
  );

  const handleMarginPercentageChange = useCallback(
    (percentage: number) => {
      if (fromToken?.balance === undefined || fromToken.balance === 0n) return;

      const amount = (fromToken.balance * BigInt(percentage)) / 100n;
      const formatted =
        percentage === 100
          ? formatAmountFree(amount, fromToken.decimals)
          : limitDecimals(
              formatAmountFree(amount, fromToken.decimals),
              calculateDisplayDecimals(amount, fromToken.decimals, fromToken.visualMultiplier, fromToken.isStable)
            );
      setFocusedInput("from");
      setFromTokenInputValue(formatted, true);
    },
    [
      fromToken?.balance,
      fromToken?.decimals,
      fromToken?.isStable,
      fromToken?.visualMultiplier,
      setFocusedInput,
      setFromTokenInputValue,
    ]
  );

  const handlePercentageChange = useCallback(
    (percentage: number) => {
      if (isLeverageSliderEnabled) {
        handleMarginPercentageChange(percentage);
      } else {
        handleSizePercentageChange(percentage);
      }
    },
    [handleMarginPercentageChange, handleSizePercentageChange, isLeverageSliderEnabled]
  );

  const handleSizeInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput("to");
      const nextValue = e.target.value;

      if (sizeDisplayMode === "token") {
        setToTokenInputValue(nextValue, true);
      } else {
        setSizeInputValue(nextValue);
      }
    },
    [sizeDisplayMode, setFocusedInput, setToTokenInputValue]
  );

  const handleSizeDisplayModeChange = useCallback(
    (newMode: SizeDisplayMode) => {
      if (newMode === sizeDisplayMode) return;

      if (newMode === "token") {
        const tokensValue = canConvert ? usdToTokens(sizeInputValue) : toTokenInputValue;
        if (tokensValue !== toTokenInputValue) {
          setToTokenInputValue(tokensValue, false);
        }
        setSizeInputValue(tokensValue);
      } else {
        const usdValue = canConvert ? tokensToUsd(toTokenInputValue) : "";
        setSizeInputValue(usdValue);
      }

      setSizeDisplayMode(newMode);
    },
    [sizeDisplayMode, canConvert, sizeInputValue, toTokenInputValue, tokensToUsd, usdToTokens, setToTokenInputValue]
  );

  const percentageSliderValue = isLeverageSliderEnabled ? marginPercentage : sizePercentage;

  return (
    <div className="flex flex-col gap-8">
      <MarginField
        inputValue={fromTokenInputValue}
        onInputValueChange={handleFromInputChange}
        onSelectFromTokenAddress={onSelectFromTokenAddress}
        onDepositTokenAddress={onDepositTokenAddress}
        onMaxClick={() => handleMarginPercentageChange(100)}
        onFocus={() => setFocusedInput("from")}
      />

      <div className="flex flex-col gap-4">
        <SizeField
          sizeInTokens={increaseAmounts?.sizeDeltaInTokens}
          sizeInUsd={increaseAmounts?.sizeDeltaUsd}
          indexToken={toToken}
          displayMode={sizeDisplayMode}
          onDisplayModeChange={handleSizeDisplayModeChange}
          inputValue={sizeFieldInputValue}
          onInputValueChange={handleSizeInputChange}
          onFocus={() => setFocusedInput("to")}
          qa="position-size"
        />

        {showPriceField && onTriggerPriceInputChange && (
          <PriceField
            indexToken={toToken}
            markPrice={markPrice}
            inputValue={triggerPriceInputValue}
            onInputValueChange={onTriggerPriceInputChange}
            onMarkPriceClick={onMarkPriceClick}
            tradeMode={tradeMode}
            qa="trigger-price"
          />
        )}
      </div>
      <MarginPercentageSlider value={percentageSliderValue} onChange={handlePercentageChange} />
    </div>
  );
}
