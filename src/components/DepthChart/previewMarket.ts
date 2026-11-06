import { applyExponentFactor, expandDecimals } from "lib/numbers";
import type { MarketInfo } from "sdk/utils/markets/types";

// Development preview only: these parameters must never feed order quotes.
export const SOLANA_DEPTH_PREVIEW_EXPONENT = expandDecimals(17, 29);
const REFERENCE_SIZE_USD = expandDecimals(1_000_000, 30);

export function getDepthChartPreviewMarket(marketInfo: MarketInfo, enabled: boolean): MarketInfo {
  if (!enabled) {
    return marketInfo;
  }

  // Keep the impact potential at $1m unchanged when changing the exponent.
  // Otherwise lowering 2 to 1.7 also shrinks the price range by roughly 63x.
  const previewPower = applyExponentFactor(REFERENCE_SIZE_USD, SOLANA_DEPTH_PREVIEW_EXPONENT);
  const rescaleFactor = (factor: bigint, exponent: bigint) =>
    (factor * applyExponentFactor(REFERENCE_SIZE_USD, exponent)) / previewPower;

  return {
    ...marketInfo,
    positionImpactFactorPositive: rescaleFactor(
      marketInfo.positionImpactFactorPositive,
      marketInfo.positionImpactExponentFactorPositive
    ),
    positionImpactFactorNegative: rescaleFactor(
      marketInfo.positionImpactFactorNegative,
      marketInfo.positionImpactExponentFactorNegative
    ),
    positionImpactExponentFactorPositive: SOLANA_DEPTH_PREVIEW_EXPONENT,
    positionImpactExponentFactorNegative: SOLANA_DEPTH_PREVIEW_EXPONENT,
  };
}
