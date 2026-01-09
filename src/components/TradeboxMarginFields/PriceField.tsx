import { Trans } from "@lingui/macro";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatAmount, formatAmountFree, formatUsd, parseValue, USD_DECIMALS } from "lib/numbers";

import { TradeInputField, DisplayMode } from "./TradeInputField";

export type PriceDisplayMode = DisplayMode;

const ZERO_ALTERNATE_VALUE: Record<DisplayMode, string> = {
  token: "$0.00",
  usd: "0",
};
const DEFAULT_TOKEN_DISPLAY_DECIMALS = 4;
const DEFAULT_TOKEN_DECIMALS = 18;

type Props = {
  indexToken: TokenData | undefined;
  markPrice: bigint | undefined;
  displayMode: PriceDisplayMode;
  onDisplayModeChange: (mode: PriceDisplayMode) => void;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  qa?: string;
};

export function PriceField({
  indexToken,
  markPrice,
  displayMode,
  onDisplayModeChange,
  inputValue,
  onInputValueChange,
  onFocus,
  qa,
}: Props) {
  const [tokenInputValue, setTokenInputValue] = useState<string>(() =>
    displayMode === "token"
      ? getTokenDisplayValueFromUsdInput({
          inputValue,
          indexToken,
          markPrice,
        })
      : ""
  );
  const prevDisplayModeRef = useRef<DisplayMode>(displayMode);
  const prevUsdInputRef = useRef(inputValue);
  const isTokenInputChangeRef = useRef(false);

  useEffect(() => {
    const displayModeChangedToToken = displayMode === "token" && prevDisplayModeRef.current !== "token";
    const usdInputChanged = inputValue !== prevUsdInputRef.current;

    if (displayMode === "token" && (displayModeChangedToToken || (usdInputChanged && !isTokenInputChangeRef.current))) {
      setTokenInputValue(
        getTokenDisplayValueFromUsdInput({
          inputValue,
          indexToken,
          markPrice,
        })
      );
    }

    prevDisplayModeRef.current = displayMode;
    prevUsdInputRef.current = inputValue;
    isTokenInputChangeRef.current = false;
  }, [displayMode, indexToken, inputValue, markPrice]);

  const alternateValue = useMemo(
    () =>
      getAlternatePriceDisplay({
        displayMode,
        indexToken,
        inputValue,
        markPrice,
      }),
    [displayMode, indexToken, inputValue, markPrice]
  );

  const handleInputValueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (displayMode === "usd") {
        onInputValueChange(e);
        return;
      }

      setTokenInputValue(e.target.value);

      if (!e.target.value) {
        isTokenInputChangeRef.current = true;
        onInputValueChange({ target: { value: "" } } as ChangeEvent<HTMLInputElement>);
        return;
      }

      const nextUsdValue = getUsdInputValueFromTokenInput({
        inputValue: e.target.value,
        indexToken,
        markPrice,
      });

      if (nextUsdValue === undefined) {
        return;
      }

      isTokenInputChangeRef.current = true;
      onInputValueChange({ target: { value: nextUsdValue } } as ChangeEvent<HTMLInputElement>);
    },
    [displayMode, indexToken, markPrice, onInputValueChange]
  );

  return (
    <TradeInputField
      label={<Trans>Price</Trans>}
      alternateValue={alternateValue}
      tokenSymbol={indexToken?.symbol}
      displayMode={displayMode}
      onDisplayModeChange={onDisplayModeChange}
      inputValue={displayMode === "token" ? tokenInputValue : inputValue}
      onInputValueChange={handleInputValueChange}
      onFocus={onFocus}
      qa={qa}
    />
  );
}

function getAlternatePriceDisplay({
  displayMode,
  indexToken,
  inputValue,
  markPrice,
}: {
  displayMode: DisplayMode;
  indexToken: TokenData | undefined;
  inputValue: string;
  markPrice: bigint | undefined;
}) {
  if (!inputValue) {
    return ZERO_ALTERNATE_VALUE[displayMode];
  }

  const parsedUsd = parseValue(inputValue, USD_DECIMALS);
  if (parsedUsd === undefined || parsedUsd === 0n) {
    return ZERO_ALTERNATE_VALUE[displayMode];
  }

  if (displayMode === "token") {
    return formatUsd(parsedUsd, { fallbackToZero: true }) ?? ZERO_ALTERNATE_VALUE.token;
  }

  if (markPrice === undefined || markPrice === 0n) {
    return ZERO_ALTERNATE_VALUE.usd;
  }

  const visualMultiplier = BigInt(indexToken?.visualMultiplier ?? 1);
  const tokenDecimals = indexToken?.decimals ?? DEFAULT_TOKEN_DECIMALS;

  return formatTokenFromUsdValue({
    parsedInput: parsedUsd,
    markPrice,
    visualMultiplier,
    tokenDecimals,
    tokenSymbol: indexToken?.symbol,
    tokenPriceDecimals: indexToken?.priceDecimals ?? DEFAULT_TOKEN_DISPLAY_DECIMALS,
  });
}

function getTokenDisplayValueFromUsdInput(p: {
  inputValue: string;
  indexToken: TokenData | undefined;
  markPrice: bigint | undefined;
}) {
  if (!p.inputValue) {
    return "";
  }

  if (p.markPrice === undefined || p.markPrice === 0n) {
    return p.inputValue;
  }

  const parsedUsd = parseValue(p.inputValue, USD_DECIMALS);
  if (parsedUsd === undefined) {
    return "";
  }

  const visualMultiplier = BigInt(p.indexToken?.visualMultiplier ?? 1);
  const tokenDecimals = p.indexToken?.decimals ?? DEFAULT_TOKEN_DECIMALS;
  const tokenValue = (parsedUsd * visualMultiplier * 10n ** BigInt(tokenDecimals)) / p.markPrice;

  return formatAmountFree(tokenValue, tokenDecimals);
}

function getUsdInputValueFromTokenInput(p: {
  inputValue: string;
  indexToken: TokenData | undefined;
  markPrice: bigint | undefined;
}) {
  if (p.markPrice === undefined || p.markPrice === 0n) {
    return undefined;
  }

  const tokenDecimals = p.indexToken?.decimals ?? DEFAULT_TOKEN_DECIMALS;
  const parsedTokens = parseValue(p.inputValue, tokenDecimals);
  if (parsedTokens === undefined) {
    return undefined;
  }

  const visualMultiplier = BigInt(p.indexToken?.visualMultiplier ?? 1);
  const usdValue = (parsedTokens * p.markPrice) / (10n ** BigInt(tokenDecimals) * visualMultiplier);
  return formatAmountFree(usdValue, USD_DECIMALS);
}

function formatTokenFromUsdValue(p: {
  parsedInput: bigint;
  markPrice: bigint;
  visualMultiplier: bigint;
  tokenDecimals: number;
  tokenSymbol?: string;
  tokenPriceDecimals: number;
}) {
  const tokenValue = (p.parsedInput * p.visualMultiplier * 10n ** BigInt(p.tokenDecimals)) / p.markPrice;
  const formattedValue = formatAmount(tokenValue, p.tokenDecimals, p.tokenPriceDecimals);

  return p.tokenSymbol ? `${formattedValue} ${p.tokenSymbol}` : formattedValue;
}
