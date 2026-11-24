import { ChangeEvent, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { TRADEBOX_SIZE_DENOMINATION_KEY } from "config/localStorage";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxFocusedInput,
  selectTradeboxFromToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarkPrice,
  selectTradeboxState,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { calcMarginAmountByPercentage, calcMarginPercentage } from "domain/synthetics/trade";
import type { TypedSizeUsd } from "domain/synthetics/trade/useTradeboxState";
import { MaxActionsState } from "domain/tokens/useMaxAvailableAmount";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";

import { MarginField } from "./MarginField";
import { MarginPercentageSlider } from "./MarginPercentageSlider";
import { PriceField } from "./PriceField";
import { SizeDisplayMode, SizeField } from "./SizeField";
import { useSizeConversion } from "./useSizeConversion";
import { useTradeboxManualLeverageSizeSlider } from "./useTradeboxManualLeverageSizeSlider";

type Props = {
  maxAvailableAmount: bigint;
  maxActions?: MaxActionsState;
  onKeepGasClick?: () => void;
  onSelectFromTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
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
  maxAvailableAmount,
  maxActions,
  onKeepGasClick,
  onSelectFromTokenAddress,
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
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const focusedInput = useSelector(selectTradeboxFocusedInput);

  const { toTokenAddress, marketAddress, typedSizeUsd, setTypedSizeUsd } = useSelector(selectTradeboxState);

  const prevSizeSyncContextRef = useRef<string>();
  const prevSizeTriggerPriceRef = useRef<bigint | undefined | null>(null);
  const shouldForceSizeUsdSyncRef = useRef(false);
  // Mirrors the trade box copy for reads within a render; a remount restores it while the token input still matches
  const typedSizeUsdRef = useRef<TypedSizeUsd | undefined>(
    typedSizeUsd?.toTokenInputValue === toTokenInputValue
      ? typedSizeUsd
      : toTokenInputValue === ""
        ? { sizeInputValue: "", toTokenInputValue: "" }
        : undefined
  );
  const previousToTokenInputValue = usePrevious(toTokenInputValue);

  const toToken = getByKey(tokensData, toTokenAddress);

  const [sizeDisplayModeRaw, setSizeDisplayMode] = useLocalStorageSerializeKey<SizeDisplayMode>(
    TRADEBOX_SIZE_DENOMINATION_KEY,
    "usd"
  );
  const sizeDisplayMode: SizeDisplayMode = sizeDisplayModeRaw ?? "usd";
  const [sizeInputValue, setSizeInputValue] = useState<string>(
    typedSizeUsdRef.current?.sizeInputValue ?? toTokenInputValue
  );

  const { isLimit } = tradeFlags;
  const showPriceField = isLimit && triggerPriceInputValue !== undefined;
  const sizeFieldInputValue = sizeDisplayMode === "usd" ? sizeInputValue : toTokenInputValue;

  // For limit orders, use trigger price for USD↔token conversion so the displayed
  // position size reflects the limit fill price.
  const sizeTriggerPrice = isLimit ? triggerPrice : undefined;
  const sizeConversionPrice = sizeTriggerPrice ?? markPrice;
  const previousSizeConversionPrice = usePrevious(sizeConversionPrice);
  const { tokensToUsd, usdToTokens, canConvert } = useSizeConversion({
    toToken,
    markPrice: sizeConversionPrice,
  });

  const keepTypedSizeUsd = useCallback(
    (next: TypedSizeUsd | undefined) => {
      typedSizeUsdRef.current = next;
      setTypedSizeUsd((prev) =>
        prev?.sizeInputValue === next?.sizeInputValue && prev?.toTokenInputValue === next?.toTokenInputValue
          ? prev
          : next
      );
    },
    [setTypedSizeUsd]
  );

  const marginPercentage = useMemo(
    () => calcMarginPercentage(fromTokenInputValue, maxAvailableAmount, fromToken?.decimals),
    [fromTokenInputValue, maxAvailableAmount, fromToken?.decimals]
  );

  const {
    isLeverageSliderEnabled,
    isSizeSliderDisabled,
    sizePercentage,
    handleSizePercentageChange,
    markFieldInteraction,
  } = useTradeboxManualLeverageSizeSlider({
    sizeDisplayMode,
    canConvert,
    maxAvailableAmount,
    tokensToUsd,
    setSizeInputValue,
    setToTokenInputValue,
  });

  // Sync size input value to USD when market/token context changes
  // USD value calculated separately from increase/decrease amounts
  // so we need to force a sync when the context changes
  useLayoutEffect(() => {
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

  // Keep USD size anchored when the trigger price changes or stops pricing the size (Limit to Market):
  // the order is sized by the token amount, which would otherwise stay priced at the old limit.
  useLayoutEffect(() => {
    if (
      prevSizeTriggerPriceRef.current !== null &&
      prevSizeTriggerPriceRef.current !== sizeTriggerPrice &&
      sizeDisplayMode === "usd"
    ) {
      shouldForceSizeUsdSyncRef.current = true;
    }

    prevSizeTriggerPriceRef.current = sizeTriggerPrice;
  }, [sizeTriggerPrice, sizeDisplayMode]);

  // Runs on sizeTriggerPrice too, so a force is consumed in the same commit even when the conversion price
  // didn't move (limit equal to mark) instead of firing on a later unrelated run.
  useLayoutEffect(() => {
    if (sizeDisplayMode !== "usd" || !canConvert) return;

    const isTokensInputValueFromUsd = toTokenInputValue === typedSizeUsdRef.current?.toTokenInputValue;

    // A typed USD size stays the order size: its token amount follows every move of the conversion price.
    if (shouldForceSizeUsdSyncRef.current || (focusedInput === "to" && isTokensInputValueFromUsd)) {
      shouldForceSizeUsdSyncRef.current = false;
      const tokensValue = usdToTokens(sizeInputValue);
      keepTypedSizeUsd({ sizeInputValue, toTokenInputValue: tokensValue });
      if (tokensValue !== toTokenInputValue) {
        setToTokenInputValue(tokensValue, false);
      }
      return;
    }

    const isTokensInputValueSetElsewhere =
      !isTokensInputValueFromUsd && toTokenInputValue !== previousToTokenInputValue;

    // A token amount set elsewhere ends the USD size's lead, so a later chance match (an empty input) can't restore it.
    if (isTokensInputValueSetElsewhere) {
      keepTypedSizeUsd(undefined);
    }

    // Size focus only guards the text being typed; a size led by its token amount shows it at the new price.
    const isSizeConversionPriceMoved =
      previousSizeConversionPrice !== undefined && sizeConversionPrice !== previousSizeConversionPrice;

    if (focusedInput === "to" && !isTokensInputValueSetElsewhere && !isSizeConversionPriceMoved) return;

    const usdValue = tokensToUsd(toTokenInputValue);
    if (usdValue !== sizeInputValue) {
      setSizeInputValue(usdValue);
    }
  }, [
    sizeTriggerPrice,
    sizeConversionPrice,
    previousSizeConversionPrice,
    focusedInput,
    sizeDisplayMode,
    sizeInputValue,
    toTokenInputValue,
    previousToTokenInputValue,
    canConvert,
    tokensToUsd,
    usdToTokens,
    setToTokenInputValue,
    keepTypedSizeUsd,
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
      // maxAvailableAmount is pre-bounded to wallet balance by the parent (via useMaxAvailableAmount);
      // 0n means the user has no available margin to commit
      if (fromToken?.decimals === undefined || maxAvailableAmount === 0n) return;

      const formatted = calcMarginAmountByPercentage(
        percentage,
        maxAvailableAmount,
        fromToken.decimals,
        fromToken.visualMultiplier,
        fromToken.isStable
      );
      setFocusedInput("from");
      setFromTokenInputValue(formatted, true);
    },
    [
      fromToken?.decimals,
      fromToken?.isStable,
      fromToken?.visualMultiplier,
      maxAvailableAmount,
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
          keepTypedSizeUsd({ sizeInputValue: nextValue, toTokenInputValue: tokensValue });
          if (tokensValue !== toTokenInputValue) {
            setToTokenInputValue(tokensValue, false);
          }
        }
      }
    },
    [
      canConvert,
      keepTypedSizeUsd,
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

      // The token amount leads after a switch: Token → USD keeps the typed tokens and shows them at the current price.
      keepTypedSizeUsd(undefined);

      const currentValue = sizeDisplayMode === "usd" ? sizeInputValue : toTokenInputValue;
      if (!currentValue) {
        setSizeDisplayMode(newMode);
        return;
      }

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
    [
      sizeDisplayMode,
      canConvert,
      keepTypedSizeUsd,
      sizeInputValue,
      toTokenInputValue,
      tokensToUsd,
      usdToTokens,
      setToTokenInputValue,
      setSizeDisplayMode,
    ]
  );

  const percentageSliderValue = isLeverageSliderEnabled ? marginPercentage : sizePercentage;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <MarginField
          inputValue={fromTokenInputValue}
          onInputValueChange={handleFromInputChange}
          onSelectFromTokenAddress={onSelectFromTokenAddress}
          onMaxClick={() => handleMarginPercentageChange(100)}
          onKeepGasClick={onKeepGasClick}
          maxActions={maxActions}
          onFocus={() => setFocusedInput("from")}
          qa="margin"
        />

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
      <MarginPercentageSlider
        value={percentageSliderValue}
        onChange={handlePercentageChange}
        disabled={isSizeSliderDisabled}
      />
    </div>
  );
}
