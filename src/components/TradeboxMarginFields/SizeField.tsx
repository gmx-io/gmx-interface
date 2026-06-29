import { Trans } from "@lingui/macro";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

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
      return formatUsd(sizeInUsd ?? 0n, { fallbackToZero: true });
    } else {
      if (sizeInTokens === undefined || !indexToken) return "0";
      const visualMultiplier = BigInt(indexToken.visualMultiplier ?? 1);
      return formatTokenAmount(sizeInTokens / visualMultiplier, indexToken.decimals, tokenLabel);
    }
  }, [displayMode, sizeInUsd, sizeInTokens, indexToken, tokenLabel]);

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
