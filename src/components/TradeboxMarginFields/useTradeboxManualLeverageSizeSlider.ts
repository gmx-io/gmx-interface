import { useCallback, useEffect, useMemo } from "react";

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

  const applySizeByIndexTokenAmount = useCallback(
    (indexTokenAmount: bigint) => {
      if (!toToken) return;

      const visualMultiplier = BigInt(marketVisualMultiplier ?? 1);
      const normalizedAmount = indexTokenAmount / visualMultiplier;
      const formatted = formatAmountFree(normalizedAmount, toToken.decimals);

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
      visualMultiplier: BigInt(marketVisualMultiplier ?? 1),
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
    marketVisualMultiplier,
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
      const indexTokenAmount = calcSizeAmountByPercentage(percentage, maxSizeByMarginInTokens);
      if (indexTokenAmount === undefined) return;
      applySizeByIndexTokenAmount(indexTokenAmount);
    },
    [applySizeByIndexTokenAmount, maxSizeByMarginInTokens]
  );

  useEffect(() => {
    if (isLeverageSliderEnabled || maxSizeByMarginInTokens === undefined) return;

    if (toTokenAmount > maxSizeByMarginInTokens) {
      applySizeByIndexTokenAmount(maxSizeByMarginInTokens);
    }
  }, [applySizeByIndexTokenAmount, isLeverageSliderEnabled, maxSizeByMarginInTokens, toTokenAmount]);

  return {
    isLeverageSliderEnabled,
    sizePercentage,
    handleSizePercentageChange,
  };
}
