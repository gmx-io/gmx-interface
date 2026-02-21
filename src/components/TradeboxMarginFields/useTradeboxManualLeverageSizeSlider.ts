import { useCallback, useEffect, useMemo } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { selectIsLeverageSliderEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectSelectedMarketVisualMultiplier } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxLiquidity,
  selectTradeboxMarkPrice,
  selectTradeboxToToken,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxState,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMaxAllowedLeverageByMinCollateralFactor } from "domain/synthetics/markets";
import { formatAmountFree, PRECISION } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { getPriceImpactForPosition } from "sdk/utils/fees/priceImpact";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";

import { SizeDisplayMode } from "./SizeField";

type Params = {
  sizeDisplayMode: SizeDisplayMode;
  canConvert: boolean;
  tokensToUsd: (tokensValue: string) => string;
  setSizeInputValue: (value: string) => void;
  setToTokenInputValue: (value: string, resetPriceImpact: boolean) => void;
};

const clampPercentage = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
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

    const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo.minCollateralFactor);
    if (!maxAllowedLeverage || maxAllowedLeverage <= 0) {
      return undefined;
    }

    const visualMultiplier = BigInt(marketVisualMultiplier ?? 1);
    const initialCollateralUsd = convertToUsd(fromTokenAmount, fromToken.decimals, fromToken.prices.minPrice) ?? 0n;
    if (initialCollateralUsd <= 0n) {
      return undefined;
    }

    const leverageBigInt = BigInt(maxAllowedLeverage);

    const conservativeBound = bigMath.mulDiv(
      initialCollateralUsd,
      leverageBigInt * PRECISION,
      BASIS_POINTS_DIVISOR_BIGINT * PRECISION + leverageBigInt * marketInfo.positionFeeFactorForBalanceWasNotImproved
    );

    const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, conservativeBound, tradeFlags.isLong);
    const positionFeeFactor = balanceWasImproved
      ? marketInfo.positionFeeFactorForBalanceWasImproved
      : marketInfo.positionFeeFactorForBalanceWasNotImproved;

    const leverageBoundUsd = bigMath.mulDiv(
      initialCollateralUsd,
      leverageBigInt * PRECISION,
      BASIS_POINTS_DIVISOR_BIGINT * PRECISION + leverageBigInt * positionFeeFactor
    );
    const toIndexTokenAmount = (amountUsd: bigint | undefined) => {
      if (amountUsd === undefined || amountUsd <= 0n) {
        return undefined;
      }

      const tokenAmount = convertToTokenAmount(amountUsd, toToken.decimals, markPrice);
      if (tokenAmount === undefined || tokenAmount <= 0n) {
        return undefined;
      }

      return tokenAmount * visualMultiplier;
    };

    const leverageBound = toIndexTokenAmount(leverageBoundUsd);
    const liquidityBound = toIndexTokenAmount(tradeFlags.isLong ? longLiquidity : shortLiquidity);

    if (leverageBound === undefined) {
      return liquidityBound;
    }

    if (liquidityBound === undefined) {
      return leverageBound;
    }

    return leverageBound < liquidityBound ? leverageBound : liquidityBound;
  }, [
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

  const sizePercentage = useMemo(() => {
    if (maxSizeByMarginInTokens === undefined || maxSizeByMarginInTokens <= 0n) {
      return 0;
    }

    const raw = Number(bigMath.mulDiv(toTokenAmount, BASIS_POINTS_DIVISOR_BIGINT, maxSizeByMarginInTokens));

    return clampPercentage(raw / 100);
  }, [maxSizeByMarginInTokens, toTokenAmount]);

  const handleSizePercentageChange = useCallback(
    (percentage: number) => {
      if (maxSizeByMarginInTokens === undefined || maxSizeByMarginInTokens <= 0n) return;

      const normalizedPercentage = Math.round(clampPercentage(percentage));
      const indexTokenAmount =
        normalizedPercentage === 100
          ? maxSizeByMarginInTokens
          : bigMath.mulDiv(maxSizeByMarginInTokens, BigInt(normalizedPercentage), 100n);

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
