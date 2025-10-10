import { type Dispatch, type SetStateAction, useEffect } from "react";

import type { TokenData } from "domain/synthetics/tokens/types";
import type { ShiftAmounts } from "domain/synthetics/trade/utils/shift";
import { formatAmountFree } from "lib/numbers";

export function useUpdateTokens({
  amounts,
  selectedToken,
  toToken,
  focusedInput,
  setToMarketText,
  setSelectedMarketText,
}: {
  amounts: ShiftAmounts | undefined;
  selectedToken: TokenData | undefined;
  toToken: TokenData | undefined;
  focusedInput: string | undefined;
  setToMarketText: Dispatch<SetStateAction<string>>;
  setSelectedMarketText: Dispatch<SetStateAction<string>>;
}): void {
  useEffect(
    function updateTokens() {
      if (!amounts || !selectedToken || !toToken) {
        return;
      }

      if (focusedInput === "selectedMarket") {
        if (amounts.toTokenAmount === 0n) {
          setToMarketText("");
        } else {
          setToMarketText(formatAmountFree(amounts.toTokenAmount, toToken.decimals));
        }
      } else {
        if (amounts.fromTokenAmount === 0n) {
          setSelectedMarketText("");
        } else {
          setSelectedMarketText(formatAmountFree(amounts.fromTokenAmount, selectedToken.decimals));
        }
      }
    },
    [amounts, focusedInput, selectedToken, setSelectedMarketText, setToMarketText, toToken]
  );
}
