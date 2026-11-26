import { Trans } from "@lingui/macro";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

import { formatTokenAmountHint, formatUsdHintParts } from "./approxHints";
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
  const tokenLabel = indexToken ? `${getTokenVisualMultiplier(indexToken)}${indexToken.symbol}` : undefined;

  const alternateValue = useMemo(() => {
    if (displayMode === "token") {
      return formatUsdHintParts(sizeInUsd ?? 0n);
    } else {
      if (sizeInTokens === undefined || !indexToken) return "0";
      return formatTokenAmountHint(sizeInTokens, indexToken);
    }
  }, [displayMode, sizeInUsd, sizeInTokens, indexToken]);

  return (
    <TradeInputField
      label={<Trans>Size</Trans>}
      alternateValue={alternateValue}
      tokenSymbol={indexToken?.symbol}
      tokenLabel={tokenLabel}
      displayMode={displayMode}
      onDisplayModeChange={onDisplayModeChange}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange}
      onFocus={onFocus}
      qa={qa}
    />
  );
}
