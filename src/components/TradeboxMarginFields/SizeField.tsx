import { Trans } from "@lingui/macro";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatAmount, formatUsd } from "lib/numbers";

import { TradeInputField, DisplayMode } from "./TradeInputField";

export type SizeDisplayMode = DisplayMode;

type Props = {
  sizeInTokens: bigint | undefined;
  sizeInUsd: bigint | undefined;
  indexToken: TokenData | undefined;
  displayMode: SizeDisplayMode;
  onDisplayModeChange: (mode: SizeDisplayMode) => void;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  qa?: string;
};

export function SizeField({
  sizeInTokens,
  sizeInUsd,
  indexToken,
  displayMode,
  onDisplayModeChange,
  inputValue,
  onInputValueChange,
  onFocus,
  qa,
}: Props) {
  // Value shown above the toggle (opposite of current display mode)
  const alternateValue = useMemo(() => {
    if (displayMode === "token") {
      // Currently showing tokens, so show USD equivalent above
      return formatUsd(sizeInUsd ?? 0n, { fallbackToZero: true });
    } else {
      // Currently showing USD, so show token equivalent above
      if (sizeInTokens === undefined || !indexToken) return "0";
      const visualMultiplier = BigInt(indexToken.visualMultiplier ?? 1);
      return `${formatAmount(sizeInTokens / visualMultiplier, indexToken.decimals)} ${indexToken.symbol}`;
    }
  }, [displayMode, sizeInUsd, sizeInTokens, indexToken]);

  return (
    <TradeInputField
      label={<Trans>Size</Trans>}
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
