import { useCallback, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatAmount, formatAmountFree, parseValue, USD_DECIMALS } from "lib/numbers";
import { convertToTokenAmount } from "sdk/utils/tokens";

export const TOKEN_INPUT_DISPLAY_DECIMALS = 8;
const USD_DISPLAY_DECIMALS = 2;

type UseSizeConversionParams = {
  toToken: TokenData | undefined;
  markPrice: bigint | undefined;
};

export function useSizeConversion({ toToken, markPrice }: UseSizeConversionParams) {
  const canConvert = toToken !== undefined && markPrice !== undefined && markPrice !== 0n;
  const visualMultiplier = BigInt(toToken?.visualMultiplier ?? 1);
  const decimals = toToken?.decimals ?? 18;

  const tokensToUsd = useCallback(
    (tokensValue: string): string => {
      if (!canConvert) return "";

      const parsedTokens = parseValue(tokensValue, decimals);
      if (parsedTokens === undefined) return "";

      const sizeInUsd = (parsedTokens * visualMultiplier * markPrice) / 10n ** BigInt(decimals);
      return formatAmount(sizeInUsd, USD_DECIMALS, USD_DISPLAY_DECIMALS);
    },
    [canConvert, decimals, markPrice, visualMultiplier]
  );

  const usdToTokens = useCallback(
    (usdValue: string): string => {
      if (!canConvert) return "";

      const parsedUsd = parseValue(usdValue || "0", USD_DECIMALS);
      if (parsedUsd === undefined) return "";

      const sizeInTokens = convertToTokenAmount(parsedUsd, decimals, markPrice);
      if (sizeInTokens === undefined) return "";

      return formatAmountFree(sizeInTokens, decimals, TOKEN_INPUT_DISPLAY_DECIMALS, toToken?.visualMultiplier);
    },
    [canConvert, decimals, markPrice, toToken?.visualMultiplier]
  );

  return useMemo(
    () => ({
      tokensToUsd,
      usdToTokens,
      canConvert,
    }),
    [tokensToUsd, usdToTokens, canConvert]
  );
}
