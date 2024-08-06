import { useMemo } from "react";

import type { MarketInfo } from "domain/synthetics/markets/types";
import type { TokenData } from "domain/synthetics/tokens/types";
import { type ShiftAmounts, getShiftAmounts } from "domain/synthetics/trade/utils/shift";
import { parseValue } from "lib/numbers";

export function useShiftAmounts({
  selectedMarketInfo,
  selectedToken,
  toMarketInfo,
  toToken,
  selectedMarketText,
  toMarketText,
  focusedInput,
  uiFeeFactor,
}: {
  selectedMarketInfo: MarketInfo | undefined;
  selectedToken: TokenData | undefined;
  toMarketInfo: MarketInfo | undefined;
  toToken: TokenData | undefined;
  selectedMarketText: string;
  toMarketText: string;
  focusedInput: string | undefined;
  uiFeeFactor: bigint;
}): ShiftAmounts | undefined {
  return useMemo(() => {
    if (!selectedMarketInfo || !selectedToken || !toMarketInfo || !toToken) {
      return;
    }

    let fromTokenAmount = 0n;
    try {
      fromTokenAmount = parseValue(selectedMarketText, selectedToken.decimals) ?? 0n;
    } catch {
      // pass
    }

    let toTokenAmount = 0n;
    try {
      toTokenAmount = parseValue(toMarketText, toToken.decimals) ?? 0n;
    } catch {
      // pass
    }

    const amounts = getShiftAmounts({
      fromMarketInfo: selectedMarketInfo,
      fromToken: selectedToken,
      fromTokenAmount,
      toMarketInfo,
      toToken: toToken,
      toTokenAmount,
      strategy: focusedInput === "selectedMarket" ? "byFromToken" : "byToToken",
      uiFeeFactor,
    });

    return amounts;
  }, [
    focusedInput,
    selectedMarketInfo,
    selectedMarketText,
    selectedToken,
    toMarketInfo,
    toMarketText,
    toToken,
    uiFeeFactor,
  ]);
}
