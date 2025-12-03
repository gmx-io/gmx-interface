import { Trans } from "@lingui/macro";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatAmount, formatUsd, parseValue, USD_DECIMALS } from "lib/numbers";

import { TradeInputField, DisplayMode } from "./TradeInputField";

export type PriceDisplayMode = DisplayMode;

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
  const alternateValue = useMemo(() => {
    if (!inputValue || inputValue === "" || markPrice === undefined || markPrice === 0n) {
      return displayMode === "token" ? "$0.00" : "0";
    }

    const parsedInput = parseValue(inputValue, USD_DECIMALS);
    if (parsedInput === undefined || parsedInput === 0n) {
      return displayMode === "token" ? "$0.00" : "0";
    }

    const visualMultiplier = BigInt(indexToken?.visualMultiplier ?? 1);

    if (displayMode === "token") {
      const usdValue = (parsedInput * markPrice) / (10n ** BigInt(USD_DECIMALS) * visualMultiplier);
      return formatUsd(usdValue, { fallbackToZero: true }) ?? "$0.00";
    } else {
      const tokenValue = (parsedInput * visualMultiplier * 10n ** BigInt(indexToken?.decimals ?? 18)) / markPrice;
      return `${formatAmount(tokenValue, indexToken?.decimals ?? 18, 4)} ${indexToken?.symbol ?? ""}`;
    }
  }, [displayMode, inputValue, markPrice, indexToken]);

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
