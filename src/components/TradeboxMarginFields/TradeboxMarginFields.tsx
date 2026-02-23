import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SourceChainId } from "config/chains";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxFocusedInput,
  selectTradeboxFromToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarkPrice,
  selectTradeboxState,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { calcMarginAmountByPercentage, calcMarginPercentage } from "domain/synthetics/trade";
import { getByKey } from "lib/objects";

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
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const focusedInput = useSelector(selectTradeboxFocusedInput);

  const { toTokenAddress, marketAddress } = useSelector(selectTradeboxState);

  const prevSizeSyncContextRef = useRef<string>();
  const shouldForceSizeUsdSyncRef = useRef(false);

  const toToken = getByKey(tokensData, toTokenAddress);

  const [sizeDisplayMode, setSizeDisplayMode] = useState<SizeDisplayMode>("usd");
  const [sizeInputValue, setSizeInputValue] = useState<string>(toTokenInputValue);

  const { isLimit } = tradeFlags;
  const showPriceField = isLimit && triggerPriceInputValue !== undefined;
  const sizeFieldInputValue = sizeDisplayMode === "usd" ? sizeInputValue : toTokenInputValue;

  const { tokensToUsd, usdToTokens, canConvert } = useSizeConversion({
    toToken,
    markPrice,
  });

  const marginPercentage = useMemo(
    () => calcMarginPercentage(fromTokenInputValue, fromToken?.balance, fromToken?.decimals ?? 0),
    [fromTokenInputValue, fromToken?.balance, fromToken?.decimals]
  );

  const { isLeverageSliderEnabled, sizePercentage, handleSizePercentageChange, markFieldInteraction } =
    useTradeboxManualLeverageSizeSlider({
      sizeDisplayMode,
      canConvert,
      tokensToUsd,
      setSizeInputValue,
      setToTokenInputValue,
    });

  // Sync size input value to USD when market/token context changes
  // USD value calculated separately from increase/decrease amounts
  // so we need to force a sync when the context changes
  useEffect(() => {
    const nextContext = `${marketAddress ?? ""}:${toTokenAddress ?? ""}`;

    if (prevSizeSyncContextRef.current === undefined) {
      prevSizeSyncContextRef.current = nextContext;
      return;
    }

    if (prevSizeSyncContextRef.current !== nextContext) {
      shouldForceSizeUsdSyncRef.current = true;
      prevSizeSyncContextRef.current = nextContext;
    }
  }, [marketAddress, toTokenAddress]);

  useEffect(() => {
    if (sizeDisplayMode !== "usd" || !canConvert) return;

    if (shouldForceSizeUsdSyncRef.current) {
      shouldForceSizeUsdSyncRef.current = false;
      const tokensValue = usdToTokens(sizeInputValue);
      if (tokensValue !== toTokenInputValue) {
        setToTokenInputValue(tokensValue, false);
      }
      return;
    }

    if (focusedInput === "to") return;

    const usdValue = tokensToUsd(toTokenInputValue);
    if (usdValue !== sizeInputValue) {
      setSizeInputValue(usdValue);
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

      const formatted = calcMarginAmountByPercentage(
        percentage,
        fromToken.balance,
        fromToken.decimals,
        fromToken.visualMultiplier,
        fromToken.isStable
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
      markFieldInteraction();
      setFocusedInput("to");
      const nextValue = e.target.value;

      if (sizeDisplayMode === "token") {
        setToTokenInputValue(nextValue, true);
      } else {
        setSizeInputValue(nextValue);
        if (canConvert) {
          const tokensValue = usdToTokens(nextValue);
          if (tokensValue !== toTokenInputValue) {
            setToTokenInputValue(tokensValue, false);
          }
        }
      }
    },
    [
      canConvert,
      markFieldInteraction,
      sizeDisplayMode,
      setFocusedInput,
      setToTokenInputValue,
      toTokenInputValue,
      usdToTokens,
    ]
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
