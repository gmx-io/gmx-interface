import { useCallback, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatAmount, formatAmountFree, parseValue, USD_DECIMALS } from "lib/numbers";

type UseSizeConversionParams = {
  toToken: TokenData | undefined;
  markPrice: bigint | undefined;
  sizeUsdDisplayDecimals: number;
};

export function useSizeConversion({ toToken, markPrice, sizeUsdDisplayDecimals }: UseSizeConversionParams) {
  const canConvert = toToken !== undefined && markPrice !== undefined && markPrice !== 0n;
  const visualMultiplier = BigInt(toToken?.visualMultiplier ?? 1);
  const decimals = toToken?.decimals ?? 18;

  const tokensToUsd = useCallback(
    (tokensValue: string): string => {
      if (!canConvert) return "";

      const parsedTokens = parseValue(tokensValue, decimals);
      if (parsedTokens === undefined) return "";

      const sizeInUsd = (parsedTokens * visualMultiplier * markPrice) / 10n ** BigInt(decimals);
      return formatAmount(sizeInUsd, USD_DECIMALS, sizeUsdDisplayDecimals);
    },
    [canConvert, decimals, markPrice, sizeUsdDisplayDecimals, visualMultiplier]
  );

  const usdToTokens = useCallback(
    (usdValue: string): string => {
      if (!canConvert) return "";

      const parsedUsd = parseValue(usdValue || "0", USD_DECIMALS);
      if (parsedUsd === undefined) return "";

      const sizeInTokens = (parsedUsd * 10n ** BigInt(decimals)) / markPrice;
      return formatAmountFree(sizeInTokens / visualMultiplier, decimals);
    },
    [canConvert, decimals, markPrice, visualMultiplier]
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
