import { Trans } from "@lingui/macro";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatAmount, formatUsd, parseValue, USD_DECIMALS } from "lib/numbers";

import { TradeInputField, DisplayMode } from "./TradeInputField";

export type PriceDisplayMode = DisplayMode;

const ZERO_ALTERNATE_VALUE: Record<DisplayMode, string> = {
  token: "$0.00",
  usd: "0",
};
const DEFAULT_TOKEN_DISPLAY_DECIMALS = 4;
const DEFAULT_TOKEN_DECIMALS = 18;
const USD_BASE = 10n ** BigInt(USD_DECIMALS);

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

  return (
    <TradeInputField
      label={<Trans>Price</Trans>}
      alternateValue={alternateValue}
      tokenSymbol={indexToken?.symbol}
      displayMode={displayMode}
      onDisplayModeChange={onDisplayModeChange}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange}
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
  if (!inputValue || markPrice === undefined || markPrice === 0n) {
    return ZERO_ALTERNATE_VALUE[displayMode];
  }

  const parsedInput = parseValue(inputValue, USD_DECIMALS);
  if (parsedInput === undefined || parsedInput === 0n) {
    return ZERO_ALTERNATE_VALUE[displayMode];
  }

  const visualMultiplier = BigInt(indexToken?.visualMultiplier ?? 1);
  const tokenDecimals = indexToken?.decimals ?? DEFAULT_TOKEN_DECIMALS;

  if (displayMode === "token") {
    return formatUsdFromTokenValue({ parsedInput, markPrice, visualMultiplier });
  }

  return formatTokenFromUsdValue({
    parsedInput,
    markPrice,
    visualMultiplier,
    tokenDecimals,
    tokenSymbol: indexToken?.symbol,
    tokenPriceDecimals: indexToken?.priceDecimals ?? DEFAULT_TOKEN_DISPLAY_DECIMALS,
  });
}

function formatUsdFromTokenValue(p: { parsedInput: bigint; markPrice: bigint; visualMultiplier: bigint }) {
  const usdValue = (p.parsedInput * p.markPrice) / (USD_BASE * p.visualMultiplier);
  return formatUsd(usdValue, { fallbackToZero: true }) ?? ZERO_ALTERNATE_VALUE.token;
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
