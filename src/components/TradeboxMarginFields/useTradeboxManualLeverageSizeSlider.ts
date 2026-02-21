import { useCallback, useEffect, useMemo } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectIsLeverageSliderEnabled,
  selectIsPnlInLeverage,
  selectIsSetAcceptablePriceImpactEnabled,
  selectSavedAcceptablePriceImpactBuffer,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectExternalSwapQuote,
  selectTradeboxCollateralToken,
  selectTradeboxFindSwapPath,
  selectTradeboxMaxLiquidityPath,
  selectTradeboxSelectedPosition,
  selectTradeboxState,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectExternalSwapQuoteParams } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  getAvailableUsdLiquidityForPosition,
  getMaxAllowedLeverageByMinCollateralFactor,
} from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { getTradeFees } from "domain/synthetics/trade";
import { getIncreasePositionAmounts } from "domain/synthetics/trade/utils/increase";
import { getIncreaseError } from "domain/synthetics/trade/utils/validation";
import { bigNumberBinarySearch } from "lib/binarySearch";
import { formatAmountFree } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount } from "sdk/utils/tokens";
import { TokenData } from "sdk/utils/tokens/types";
import { TradeMode } from "sdk/utils/trade";
import { getNextPositionValuesForIncreaseTrade } from "sdk/utils/trade/increase";

import { SizeDisplayMode } from "./SizeField";

type Params = {
  fromToken: TokenData | undefined;
  toToken: TokenData | undefined;
  tradeFlags: {
    isIncrease: boolean;
    isLong: boolean;
    isLimit: boolean;
    isTwap: boolean;
  };
  tradeMode: TradeMode;
  markPrice: bigint | undefined;
  fromTokenAmount: bigint;
  toTokenAmount: bigint;
  increaseInitialCollateralUsd: bigint | undefined;
  sizeDisplayMode: SizeDisplayMode;
  canConvert: boolean;
  tokensToUsd: (tokensValue: string) => string;
  setSizeInputValue: (value: string) => void;
  setFocusedInput: (input: "from" | "to") => void;
  setToTokenInputValue: (value: string, resetPriceImpact: boolean) => void;
};

export function useTradeboxManualLeverageSizeSlider({
  fromToken,
  toToken,
  tradeFlags,
  tradeMode,
  markPrice,
  fromTokenAmount,
  toTokenAmount,
  increaseInitialCollateralUsd,
  sizeDisplayMode,
  canConvert,
  tokensToUsd,
  setSizeInputValue,
  setFocusedInput,
  setToTokenInputValue,
}: Params) {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const maxLiquidityPath = useSelector(selectTradeboxMaxLiquidityPath);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const externalSwapQuote = useSelector(selectExternalSwapQuote);
  const externalSwapQuoteParams = useSelector(selectExternalSwapQuoteParams);
  const savedAcceptablePriceImpactBuffer = useSelector(selectSavedAcceptablePriceImpactBuffer);
  const isSetAcceptablePriceImpactEnabled = useSelector(selectIsSetAcceptablePriceImpactEnabled);
  const isLeverageSliderEnabled = useSelector(selectIsLeverageSliderEnabled);
  const isPnlInLeverage = useSelector(selectIsPnlInLeverage);
  const uiFeeFactor = useUiFeeFactor();
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const { selectedTriggerAcceptablePriceImpactBps, numberOfParts, marketInfo } = useSelector(selectTradeboxState);

  const limitOrderType = useMemo(() => {
    if (!tradeFlags.isLimit) return undefined;

    if (tradeMode === TradeMode.Limit) {
      return OrderType.LimitIncrease;
    }

    if (tradeMode === TradeMode.StopMarket) {
      return OrderType.StopIncrease;
    }

    return undefined;
  }, [tradeFlags.isLimit, tradeMode]);

  const { longLiquidity, shortLiquidity } = useMemo(() => {
    if (!marketInfo) {
      return {
        longLiquidity: undefined,
        shortLiquidity: undefined,
      };
    }

    return {
      longLiquidity: getAvailableUsdLiquidityForPosition(marketInfo, true),
      shortLiquidity: getAvailableUsdLiquidityForPosition(marketInfo, false),
    };
  }, [marketInfo]);

  const applySizeByIndexTokenAmount = useCallback(
    (indexTokenAmount: bigint) => {
      if (!toToken) return;

      const visualMultiplier = BigInt(toToken.visualMultiplier ?? 1);
      const normalizedAmount = indexTokenAmount / visualMultiplier;
      const formatted = formatAmountFree(normalizedAmount, toToken.decimals);

      setFocusedInput("to");
      setToTokenInputValue(formatted, true);

      if (sizeDisplayMode === "usd") {
        setSizeInputValue(canConvert ? tokensToUsd(formatted) : "");
      } else {
        setSizeInputValue(formatted);
      }
    },
    [canConvert, setFocusedInput, setSizeInputValue, setToTokenInputValue, sizeDisplayMode, toToken, tokensToUsd]
  );

  const maxSizeByMarginInTokens = useMemo(() => {
    if (
      isLeverageSliderEnabled ||
      !tradeFlags.isIncrease ||
      !fromToken ||
      !toToken ||
      !marketInfo ||
      !collateralToken ||
      !findSwapPath ||
      markPrice === undefined ||
      minCollateralUsd === undefined ||
      minPositionSizeUsd === undefined ||
      fromTokenAmount <= 0n
    ) {
      return undefined;
    }

    const visualMultiplier = BigInt(toToken.visualMultiplier ?? 1);
    const liquidityUsd = tradeFlags.isLong ? longLiquidity : shortLiquidity;
    const liquidityBound =
      liquidityUsd === undefined
        ? undefined
        : (convertToTokenAmount(liquidityUsd, toToken.decimals, markPrice) ?? 0n) * visualMultiplier;

    const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo.minCollateralFactor);
    const initialCollateralUsd = increaseInitialCollateralUsd ?? 0n;
    const leverageBoundUsd = bigMath.mulDiv(
      initialCollateralUsd,
      BigInt(maxAllowedLeverage),
      BASIS_POINTS_DIVISOR_BIGINT
    );
    const leverageBound =
      (convertToTokenAmount(leverageBoundUsd, toToken.decimals, markPrice) ?? 0n) * visualMultiplier;

    const validateSize = (indexTokenAmount: bigint) => {
      const candidateIncreaseAmounts = getIncreasePositionAmounts({
        marketInfo,
        indexToken: toToken,
        initialCollateralToken: fromToken,
        collateralToken,
        isLong: tradeFlags.isLong,
        initialCollateralAmount: fromTokenAmount,
        position: selectedPosition,
        externalSwapQuote,
        indexTokenAmount,
        leverage: undefined,
        triggerPrice: tradeFlags.isLimit ? triggerPrice : undefined,
        limitOrderType,
        fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
        acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
        userReferralInfo,
        strategy: "independent",
        findSwapPath,
        uiFeeFactor,
        marketsInfoData,
        chainId,
        externalSwapQuoteParams,
        isSetAcceptablePriceImpactEnabled,
      });

      const nextPositionValuesWithoutPnl =
        candidateIncreaseAmounts.acceptablePrice !== undefined && fromTokenAmount > 0n
          ? getNextPositionValuesForIncreaseTrade({
              marketInfo,
              collateralToken,
              existingPosition: selectedPosition,
              isLong: tradeFlags.isLong,
              collateralDeltaUsd: candidateIncreaseAmounts.collateralDeltaUsd,
              collateralDeltaAmount: candidateIncreaseAmounts.collateralDeltaAmount,
              sizeDeltaUsd: candidateIncreaseAmounts.sizeDeltaUsd,
              sizeDeltaInTokens: candidateIncreaseAmounts.sizeDeltaInTokens,
              positionPriceImpactDeltaUsd: candidateIncreaseAmounts.positionPriceImpactDeltaUsd,
              indexPrice: candidateIncreaseAmounts.indexPrice,
              showPnlInLeverage: false,
              minCollateralUsd,
              userReferralInfo,
            })
          : undefined;

      const nextPositionValues =
        isPnlInLeverage && nextPositionValuesWithoutPnl
          ? getNextPositionValuesForIncreaseTrade({
              marketInfo,
              collateralToken,
              existingPosition: selectedPosition,
              isLong: tradeFlags.isLong,
              collateralDeltaUsd: candidateIncreaseAmounts.collateralDeltaUsd,
              collateralDeltaAmount: candidateIncreaseAmounts.collateralDeltaAmount,
              sizeDeltaUsd: candidateIncreaseAmounts.sizeDeltaUsd,
              sizeDeltaInTokens: candidateIncreaseAmounts.sizeDeltaInTokens,
              positionPriceImpactDeltaUsd: candidateIncreaseAmounts.positionPriceImpactDeltaUsd,
              indexPrice: candidateIncreaseAmounts.indexPrice,
              showPnlInLeverage: true,
              minCollateralUsd,
              userReferralInfo,
            })
          : nextPositionValuesWithoutPnl;

      const candidateFees = getTradeFees({
        sizeInUsd: selectedPosition?.sizeInUsd || 0n,
        initialCollateralUsd: candidateIncreaseAmounts.initialCollateralUsd,
        collateralDeltaUsd: candidateIncreaseAmounts.initialCollateralUsd,
        sizeDeltaUsd: candidateIncreaseAmounts.sizeDeltaUsd,
        swapSteps: candidateIncreaseAmounts.swapStrategy.swapPathStats?.swapSteps || [],
        externalSwapQuote: candidateIncreaseAmounts.swapStrategy.externalSwapQuote,
        positionFeeUsd: candidateIncreaseAmounts.positionFeeUsd,
        swapPriceImpactDeltaUsd:
          candidateIncreaseAmounts.swapStrategy.swapPathStats?.totalSwapPriceImpactDeltaUsd || 0n,
        increasePositionPriceImpactDeltaUsd: candidateIncreaseAmounts.positionPriceImpactDeltaUsd,
        decreasePositionPriceImpactDeltaUsd: 0n,
        priceImpactDiffUsd: candidateIncreaseAmounts.potentialPriceImpactDiffUsd,
        totalPendingImpactDeltaUsd: 0n,
        proportionalPendingImpactDeltaUsd: 0n,
        borrowingFeeUsd: selectedPosition?.pendingBorrowingFeesUsd || 0n,
        fundingFeeUsd: selectedPosition?.pendingFundingFeesUsd || 0n,
        feeDiscountUsd: candidateIncreaseAmounts.feeDiscountUsd,
        swapProfitFeeUsd: 0n,
        uiFeeFactor,
        type: "increase",
      });

      const error = getIncreaseError({
        marketInfo,
        indexToken: toToken,
        initialCollateralToken: fromToken,
        initialCollateralAmount: fromTokenAmount,
        initialCollateralUsd: candidateIncreaseAmounts.initialCollateralUsd,
        targetCollateralToken: collateralToken,
        collateralUsd: candidateIncreaseAmounts.collateralDeltaUsd,
        sizeDeltaUsd: candidateIncreaseAmounts.sizeDeltaUsd,
        nextPositionValues,
        existingPosition: selectedPosition,
        fees: candidateFees,
        markPrice,
        triggerPrice,
        externalSwapQuote: candidateIncreaseAmounts.swapStrategy.externalSwapQuote,
        swapPathStats: candidateIncreaseAmounts.swapStrategy.swapPathStats,
        collateralLiquidity: maxLiquidityPath?.maxLiquidity,
        longLiquidity,
        shortLiquidity,
        minCollateralUsd,
        isLong: tradeFlags.isLong,
        isLimit: tradeFlags.isLimit,
        isTwap: tradeFlags.isTwap,
        nextLeverageWithoutPnl: nextPositionValuesWithoutPnl?.nextLeverage,
        thresholdType: candidateIncreaseAmounts.triggerThresholdType,
        numberOfParts,
        minPositionSizeUsd,
        chainId,
      });

      return !error.buttonErrorMessage;
    };

    let upperBound = 1n;
    if (leverageBound > upperBound) upperBound = leverageBound;
    if (liquidityBound !== undefined && liquidityBound > upperBound) upperBound = liquidityBound;
    if (upperBound < 1n) upperBound = 1n;

    let hasInvalidUpper = !validateSize(upperBound);
    for (let i = 0; i < 20 && !hasInvalidUpper; i++) {
      upperBound *= 2n;
      hasInvalidUpper = !validateSize(upperBound);
    }

    const precision = toToken.decimals > 4 ? BigInt(10) ** BigInt(toToken.decimals - 4) : 1n;
    const search = bigNumberBinarySearch(0n, upperBound, precision, (indexTokenAmount) => ({
      isValid: validateSize(indexTokenAmount),
      returnValue: indexTokenAmount,
    }));

    const maxSize = search.returnValue ?? (validateSize(search.result) ? search.result : 0n);

    return maxSize > 0n ? maxSize : undefined;
  }, [
    chainId,
    collateralToken,
    externalSwapQuote,
    externalSwapQuoteParams,
    findSwapPath,
    fromToken,
    fromTokenAmount,
    increaseInitialCollateralUsd,
    isLeverageSliderEnabled,
    isPnlInLeverage,
    isSetAcceptablePriceImpactEnabled,
    limitOrderType,
    longLiquidity,
    markPrice,
    marketInfo,
    marketsInfoData,
    maxLiquidityPath?.maxLiquidity,
    minCollateralUsd,
    minPositionSizeUsd,
    numberOfParts,
    savedAcceptablePriceImpactBuffer,
    selectedPosition,
    selectedTriggerAcceptablePriceImpactBps,
    shortLiquidity,
    toToken,
    tradeFlags.isIncrease,
    tradeFlags.isLimit,
    tradeFlags.isLong,
    tradeFlags.isTwap,
    triggerPrice,
    uiFeeFactor,
    userReferralInfo,
  ]);

  const sizePercentage = useMemo(() => {
    if (maxSizeByMarginInTokens === undefined || maxSizeByMarginInTokens <= 0n) {
      return 0;
    }

    const raw = Number(bigMath.mulDiv(toTokenAmount, 10000n, maxSizeByMarginInTokens));

    return Math.min(100, Math.max(0, raw / 100));
  }, [maxSizeByMarginInTokens, toTokenAmount]);

  const handleSizePercentageChange = useCallback(
    (percentage: number) => {
      if (maxSizeByMarginInTokens === undefined || maxSizeByMarginInTokens <= 0n) return;

      const indexTokenAmount =
        percentage === 100
          ? maxSizeByMarginInTokens
          : bigMath.mulDiv(maxSizeByMarginInTokens, BigInt(percentage), 100n);

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
