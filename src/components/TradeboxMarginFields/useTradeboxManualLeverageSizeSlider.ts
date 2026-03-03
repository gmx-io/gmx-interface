import { useCallback, useEffect, useMemo, useRef } from "react";

import { selectIsLeverageSliderEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectSelectedMarketVisualMultiplier } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxLiquidity,
  selectTradeboxMarkPrice,
  selectTradeboxSelectedPosition,
  selectTradeboxToToken,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxState,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  calcMaxSizeDeltaInUsdByLeverage,
  calcSizeAmountByPercentage,
  calcSizePercentage,
} from "domain/synthetics/trade";
import { formatAmountFree } from "lib/numbers";
import { convertToUsd } from "sdk/utils/tokens";

import { SizeDisplayMode } from "./SizeField";
import { TOKEN_INPUT_DISPLAY_DECIMALS } from "./useSizeConversion";

type Params = {
  sizeDisplayMode: SizeDisplayMode;
  canConvert: boolean;
  tokensToUsd: (tokensValue: string) => string;
  setSizeInputValue: (value: string) => void;
  setToTokenInputValue: (value: string, resetPriceImpact: boolean) => void;
};

export function useTradeboxManualLeverageSizeSlider({
  sizeDisplayMode,
  canConvert,
  tokensToUsd,
  setSizeInputValue,
  setToTokenInputValue,
}: Params) {
  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = useSelector(selectTradeboxToToken);
  const marketVisualMultiplier = useSelector(selectSelectedMarketVisualMultiplier);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const toTokenAmount = useSelector(selectTradeboxToTokenAmount);
  const isLeverageSliderEnabled = useSelector(selectIsLeverageSliderEnabled);
  const { marketInfo } = useSelector(selectTradeboxState);
  const { longLiquidity, shortLiquidity } = useSelector(selectTradeboxLiquidity);
  const existingPosition = useSelector(selectTradeboxSelectedPosition);

  const lastInteractionRef = useRef<"slider" | "field">("field");
  const fixedPercentageRef = useRef<number>(0);

  const markFieldInteraction = useCallback(() => {
    lastInteractionRef.current = "field";
  }, []);

  const applySizeByIndexTokenAmount = useCallback(
    (indexTokenAmount: bigint) => {
      if (!toToken) return;

      const formatted = formatAmountFree(
        indexTokenAmount,
        toToken.decimals,
        TOKEN_INPUT_DISPLAY_DECIMALS,
        marketVisualMultiplier ?? undefined
      );

      setToTokenInputValue(formatted, true);

      if (sizeDisplayMode === "usd") {
        setSizeInputValue(canConvert ? tokensToUsd(formatted) : "");
      } else {
        setSizeInputValue(formatted);
      }
    },
    [canConvert, marketVisualMultiplier, setSizeInputValue, setToTokenInputValue, sizeDisplayMode, toToken, tokensToUsd]
  );

  const maxSizeByMarginInTokens = useMemo(() => {
    if (
      isLeverageSliderEnabled ||
      !tradeFlags.isIncrease ||
      !toToken ||
      !fromToken ||
      !marketInfo ||
      markPrice === undefined ||
      fromTokenAmount <= 0n
    ) {
      return undefined;
    }

    const initialCollateralUsd = convertToUsd(fromTokenAmount, fromToken.decimals, fromToken.prices.minPrice) ?? 0n;

    return calcMaxSizeDeltaInUsdByLeverage({
      marketInfo,
      initialCollateralUsd,
      markPrice,
      toTokenDecimals: toToken.decimals,
      isLong: tradeFlags.isLong,
      longLiquidity,
      shortLiquidity,
      existingPosition: existingPosition ?? undefined,
    });
  }, [
    existingPosition,
    fromToken,
    fromTokenAmount,
    isLeverageSliderEnabled,
    longLiquidity,
    markPrice,
    marketInfo,
    shortLiquidity,
    toToken,
    tradeFlags.isIncrease,
    tradeFlags.isLong,
  ]);

  const sizePercentage = useMemo(
    () => calcSizePercentage(toTokenAmount, maxSizeByMarginInTokens),
    [maxSizeByMarginInTokens, toTokenAmount]
  );

  const handleSizePercentageChange = useCallback(
    (percentage: number) => {
      lastInteractionRef.current = "slider";
      fixedPercentageRef.current = percentage;

      const indexTokenAmount = calcSizeAmountByPercentage(percentage, maxSizeByMarginInTokens);
      if (indexTokenAmount === undefined) return;
      applySizeByIndexTokenAmount(indexTokenAmount);
    },
    [applySizeByIndexTokenAmount, maxSizeByMarginInTokens]
  );

  // When slider was last used, keep the size field in sync with the fixed percentage
  useEffect(() => {
    if (isLeverageSliderEnabled) return;
    if (lastInteractionRef.current !== "slider") return;

    const indexTokenAmount = calcSizeAmountByPercentage(fixedPercentageRef.current, maxSizeByMarginInTokens);
    if (indexTokenAmount === undefined) return;

    applySizeByIndexTokenAmount(indexTokenAmount);
  }, [isLeverageSliderEnabled, maxSizeByMarginInTokens, applySizeByIndexTokenAmount]);

  return {
    isLeverageSliderEnabled,
    sizePercentage,
    handleSizePercentageChange,
    markFieldInteraction,
  };
}
