import { BASIS_POINTS_DIVISOR } from "config/factors";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "config/tokens";
import { isSwapOrderType } from "domain/synthetics/orders";
import { PositionInfo } from "domain/synthetics/positions";
import {
  SwapAmounts,
  TradeFlags,
  TradeMode,
  TradeType,
  createSwapEstimator,
  findAllPaths,
  getBestSwapPath,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
  getMarkPrice,
  getMarketsGraph,
  getMaxSwapPathLiquidity,
  getNextPositionValuesForDecreaseTrade,
  getNextPositionValuesForIncreaseTrade,
  getSwapAmountsByFromValue,
  getSwapAmountsByToValue,
  getSwapPathStats,
} from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { createSelector as createSelectorCommon } from "lib/selectors";
import { useMemo } from "react";
import { SyntheticsState, useSyntheticsStateSelector as useSelector } from "./SyntheticsStateContextProvider";
import { TokensRatio, convertToUsd, getTokensRatioByPrice } from "domain/synthetics/tokens";

const createSelector = createSelectorCommon.withTypes<SyntheticsState>();

// globals
const selectAccount = (s: SyntheticsState) => s.globals.account;
const selectOrdersInfoData = (s: SyntheticsState) => s.globals.ordersInfo.ordersInfoData;
const selectIsOrdersLoading = (s: SyntheticsState) => s.globals.ordersInfo.isLoading;
const selectPositionsInfoData = (s: SyntheticsState) => s.globals.positionsInfo.positionsInfoData;
const selectIsPositionsLoading = (s: SyntheticsState) => s.globals.positionsInfo.isLoading;
const selectMarketsInfoData = (s: SyntheticsState) => s.globals.marketsInfo.marketsInfoData;
const selectTokensData = (s: SyntheticsState) => s.globals.marketsInfo.tokensData;
const selectPricesUpdatedAt = (s: SyntheticsState) => s.globals.marketsInfo.pricesUpdatedAt;
const selectUiFeeFactor = (s: SyntheticsState) => s.globals.uiFeeFactor;
const selectUserReferralInfo = (s: SyntheticsState) => s.globals.userReferralInfo;
const selectChainId = (s: SyntheticsState) => s.globals.chainId;
const selectSavedIsPnlInLeverage = (s: SyntheticsState) => s.globals.savedIsPnlInLeverage;
const selectSavedShowPnlAfterFees = (s: SyntheticsState) => s.globals.savedShowPnlAfterFees;

// settings
// const selectShowDebugValues = (s: SyntheticsState) => s.settings.showDebugValues;
// const selectSetShowDebugValues = (s: SyntheticsState) => s.settings.setShowDebugValues;
// const selectSavedAllowedSlippage = (s: SyntheticsState) => s.settings.savedAllowedSlippage;
// const selectSetSavedAllowedSlippage = (s: SyntheticsState) => s.settings.setSavedAllowedSlippage;
// const selectSetExecutionFeeBufferBps = (s: SyntheticsState) => s.settings.setExecutionFeeBufferBps;
const selectSavedAcceptablePriceImpactBuffer = (s: SyntheticsState) => s.settings.savedAcceptablePriceImpactBuffer;
// const selectSetSavedAcceptablePriceImpactBuffer = (s: SyntheticsState) =>
//   s.settings.setSavedAcceptablePriceImpactBuffer;
// const selectExecutionFeeBufferBps = (s: SyntheticsState) => s.settings.executionFeeBufferBps;
// const selectShouldUseExecutionFeeBuffer = (s: SyntheticsState) => s.settings.shouldUseExecutionFeeBuffer;
// const selectOracleKeeperInstancesConfig = (s: SyntheticsState) => s.settings.oracleKeeperInstancesConfig;
// const selectSetOracleKeeperInstancesConfig = (s: SyntheticsState) => s.settings.setOracleKeeperInstancesConfig;

const selectMinCollateralUsd = (s: SyntheticsState) => s.globals.positionsConstants.minCollateralUsd;
const selectMinPositionSizeUsd = (s: SyntheticsState) => s.globals.positionsConstants.minPositionSizeUsd;
const selectPositionConstants = createSelector(
  [selectMinCollateralUsd, selectMinPositionSizeUsd],
  (minCollateralUsd, minPositionSizeUsd) => ({
    minCollateralUsd,
    minPositionSizeUsd,
  })
);

export const createTradeFlags = (tradeType: TradeType, tradeMode: TradeMode): TradeFlags => {
  const isLong = tradeType === TradeType.Long;
  const isShort = tradeType === TradeType.Short;
  const isSwap = tradeType === TradeType.Swap;
  const isPosition = isLong || isShort;
  const isMarket = tradeMode === TradeMode.Market;
  const isLimit = tradeMode === TradeMode.Limit;
  const isTrigger = tradeMode === TradeMode.Trigger;
  const isIncrease = isPosition && (isMarket || isLimit);

  const tradeFlags: TradeFlags = {
    isLong,
    isShort,
    isSwap,
    isPosition,
    isIncrease,
    isMarket,
    isLimit,
    isTrigger,
  };

  return tradeFlags;
};

// TODO split on two selectors
const makeSelectSwapRoutes = (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) =>
  createSelector([selectChainId, selectMarketsInfoData], (chainId, marketsInfoData) => {
    const wrappedToken = getWrappedToken(chainId);

    const isWrap = fromTokenAddress === NATIVE_TOKEN_ADDRESS && toTokenAddress === wrappedToken.address;
    const isUnwrap = fromTokenAddress === wrappedToken.address && toTokenAddress === NATIVE_TOKEN_ADDRESS;
    const isSameToken = fromTokenAddress === toTokenAddress;

    const wrappedFromAddress = fromTokenAddress ? convertTokenAddress(chainId, fromTokenAddress, "wrapped") : undefined;
    const wrappedToAddress = toTokenAddress ? convertTokenAddress(chainId, toTokenAddress, "wrapped") : undefined;

    const { graph, estimator } = (() => {
      if (!marketsInfoData) {
        return {
          graph: undefined,
          estimator: undefined,
        };
      }

      return {
        graph: getMarketsGraph(Object.values(marketsInfoData)),
        estimator: createSwapEstimator(marketsInfoData),
      };
    })();

    const allRoutes = (() => {
      if (!marketsInfoData || !graph || !wrappedFromAddress || !wrappedToAddress || isWrap || isUnwrap || isSameToken) {
        return undefined;
      }

      const paths = findAllPaths(marketsInfoData, graph, wrappedFromAddress, wrappedToAddress)
        ?.sort((a, b) => {
          return b.liquidity.sub(a.liquidity).gt(0) ? 1 : -1;
        })
        .slice(0, 5);

      return paths;
    })();

    const { maxLiquidity, maxLiquidityPath } = (() => {
      let maxLiquidity = BigNumber.from(0);
      let maxLiquidityPath: string[] | undefined = undefined;

      if (!allRoutes || !marketsInfoData || !wrappedFromAddress) {
        return { maxLiquidity, maxLiquidityPath };
      }

      for (const route of allRoutes) {
        const liquidity = getMaxSwapPathLiquidity({
          marketsInfoData,
          swapPath: route.path,
          initialCollateralAddress: wrappedFromAddress,
        });

        if (liquidity.gt(maxLiquidity)) {
          maxLiquidity = liquidity;
          maxLiquidityPath = route.path;
        }
      }

      return { maxLiquidity, maxLiquidityPath };
    })();

    const findSwapPath = (usdIn: BigNumber, opts: { byLiquidity?: boolean }) => {
      if (!allRoutes?.length || !estimator || !marketsInfoData || !fromTokenAddress) {
        return undefined;
      }

      let swapPath: string[] | undefined = undefined;

      if (opts.byLiquidity) {
        swapPath = allRoutes[0].path;
      } else {
        swapPath = getBestSwapPath(allRoutes, usdIn, estimator);
      }

      if (!swapPath) {
        return undefined;
      }

      const swapPathStats = getSwapPathStats({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: fromTokenAddress,
        wrappedNativeTokenAddress: wrappedToken.address,
        shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
        shouldApplyPriceImpact: true,
        usdIn,
      });

      if (!swapPathStats) {
        return undefined;
      }

      return swapPathStats;
    };

    return {
      maxSwapLiquidity: maxLiquidity,
      maxLiquiditySwapPath: maxLiquidityPath,
      findSwapPath,
    };
  });

const makeSelectIncreasePositionAmounts = (
  fromTokenAddress: string | undefined,
  toTokenAddress: string | undefined,
  position: PositionInfo | undefined
) =>
  createSelector([], () => {
    if (!tradeFlags.isIncrease || !toToken || !fromToken || !collateralToken || !marketInfo) {
      return undefined;
    }

    return getIncreasePositionAmounts({
      marketInfo,
      indexToken: toToken,
      initialCollateralToken: fromToken,
      collateralToken,
      isLong: tradeFlags.isLong,
      initialCollateralAmount: fromTokenAmount,
      indexTokenAmount: toTokenAmount,
      leverage,
      triggerPrice: tradeFlags.isLimit ? triggerPrice : undefined,
      position,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
      findSwapPath: swapRoute.findSwapPath,
      userReferralInfo,
      uiFeeFactor,
      strategy: isLeverageEnabled
        ? focusedInput === "from"
          ? "leverageByCollateral"
          : "leverageBySize"
        : "independent",
    });
  });

const makeSelectDecreasePositionAmounts = (position: PositionInfo | undefined) =>
  createSelector([], () => {
    const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
    if (
      !tradeFlags.isTrigger ||
      !closeSizeUsd ||
      !marketInfo ||
      !collateralToken ||
      !minCollateralUsd ||
      !minPositionSizeUsd
    ) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo,
      collateralToken,
      isLong: tradeFlags.isLong,
      position,
      closeSizeUsd: closeSizeUsd,
      keepLeverage: keepLeverage!,
      triggerPrice,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
    });
  });

const selectMarkPrice = createSelector([selectToToken, selectTradeFlags], (toToken, tradeFlags) => {
  if (!toToken) {
    return undefined;
  }

  if (tradeFlags.isSwap) {
    return toToken.prices.minPrice;
  }

  return getMarkPrice({ prices: toToken.prices, isIncrease: tradeFlags.isIncrease, isLong: tradeFlags.isLong });
});

const selectRatios = createSelector([], () => {
  const fromTokenPrice = fromToken?.prices.minPrice;
  if (!tradeFlags.isSwap || !fromToken || !toToken || !fromTokenPrice || !markPrice) {
    return {};
  }
  const markRatio = getTokensRatioByPrice({
    fromToken,
    toToken,
    fromPrice: fromTokenPrice,
    toPrice: markPrice,
  });
  const triggerRatioValue = parseValue(triggerRatioInputValue, USD_DECIMALS);
  if (!triggerRatioValue) {
    return { markRatio };
  }
  const triggerRatio: TokensRatio = {
    ratio: triggerRatioValue?.gt(0) ? triggerRatioValue : markRatio.ratio,
    largestToken: markRatio.largestToken,
    smallestToken: markRatio.smallestToken,
  };
  return {
    markRatio,
    triggerRatio,
  };
});

const makeSelectSwapAmounts = (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) =>
  createSelector([], () => {
    const fromTokenPrice = fromToken?.prices.minPrice;

    if (!isSwap || !fromToken || !toToken || !fromTokenPrice) {
      return undefined;
    }

    if (isWrapOrUnwrap) {
      const tokenAmount = focusedInput === "from" ? fromTokenAmount : toTokenAmount;
      const usdAmount = convertToUsd(tokenAmount, fromToken.decimals, fromTokenPrice)!;
      const price = fromTokenPrice;

      const swapAmounts: SwapAmounts = {
        amountIn: tokenAmount,
        usdIn: usdAmount!,
        amountOut: tokenAmount,
        usdOut: usdAmount!,
        swapPathStats: undefined,
        priceIn: price,
        priceOut: price,
        minOutputAmount: tokenAmount,
      };

      return swapAmounts;
    } else if (focusedInput === "from") {
      return getSwapAmountsByFromValue({
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: fromTokenAmount,
        triggerRatio: triggerRatio || markRatio,
        isLimit,
        findSwapPath: swapRoute.findSwapPath,
        uiFeeFactor,
      });
    } else {
      return getSwapAmountsByToValue({
        tokenIn: fromToken,
        tokenOut: toToken,
        amountOut: toTokenAmount,
        triggerRatio: triggerRatio || markRatio,
        isLimit,
        findSwapPath: swapRoute.findSwapPath,
        uiFeeFactor,
      });
    }
  });

// TODO move to tradebox folder?
const makeSelectNextPositionValues = (
  fromTokenAddress: string | undefined,
  toTokenAddress: string | undefined,
  position: PositionInfo | undefined
) =>
  createSelector([], () => {
    if (!tradeFlags.isPosition || !minCollateralUsd || !marketInfo || !collateralToken) {
      return undefined;
    }

    const closeSizeUsd = parseValue(closeSizeInputValue ?? "0", USD_DECIMALS)!;

    if (tradeFlags.isIncrease && increaseAmounts?.acceptablePrice && fromTokenAmount.gt(0)) {
      return getNextPositionValuesForIncreaseTrade({
        marketInfo,
        collateralToken,
        existingPosition: position,
        isLong: tradeFlags.isLong,
        collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
        collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
        indexPrice: increaseAmounts.indexPrice,
        showPnlInLeverage: savedIsPnlInLeverage,
        minCollateralUsd,
        userReferralInfo,
      });
    }

    if (tradeFlags.isTrigger && decreaseAmounts?.acceptablePrice && closeSizeUsd.gt(0)) {
      return getNextPositionValuesForDecreaseTrade({
        existingPosition: position,
        marketInfo,
        collateralToken,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
        estimatedPnl: decreaseAmounts.estimatedPnl,
        realizedPnl: decreaseAmounts.realizedPnl,
        collateralDeltaUsd: decreaseAmounts.collateralDeltaUsd,
        collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
        payedRemainingCollateralUsd: decreaseAmounts.payedRemainingCollateralUsd,
        payedRemainingCollateralAmount: decreaseAmounts.payedRemainingCollateralAmount,
        showPnlInLeverage: savedIsPnlInLeverage,
        isLong: tradeFlags.isLong,
        minCollateralUsd,
        userReferralInfo,
      });
    }
  });

export const useMarketsInfoData = () => useSelector(selectMarketsInfoData);
export const useTokensData = () => useSelector(selectTokensData);
export const useOrdersInfoData = () => useSelector(selectOrdersInfoData);
export const useIsOrdersLoading = () => useSelector(selectIsOrdersLoading);
export const usePricesUpdatedAt = () => useSelector(selectPricesUpdatedAt);
export const useUserReferralInfo = () => useSelector(selectUserReferralInfo);
export const useSavedIsPnlInLeverage = () => useSelector(selectSavedIsPnlInLeverage);
export const useSavedShowPnlAfterFees = () => useSelector(selectSavedShowPnlAfterFees);

export const usePositionsInfoData = () => useSelector(selectPositionsInfoData);
export const useIsPositionsLoading = () => useSelector(selectIsPositionsLoading);

export const useLeverage = () => useSelector(selectLeverage);
export const useTradeboxState = () => useSelector((s) => s.tradebox);
export const useSelectedPositionKey = () => useSelector(selectSelectedPositionKey);
export const useSelectedPosition = () => useSelector(selectSelectedPosition);
export const useTradeFlags = () => useSelector(selectTradeFlags);
export const useExistingOrder = () => useSelector(selectExistingOrder);
export const useHasExistingOrder = () => useSelector(selectHasExistingOrder);

export const useUiFeeFactor = () => useSelector(selectUiFeeFactor);
export const usePositionsConstants = () => useSelector(selectPositionConstants);

export const useIncreasePositionAmounts = (
  fromTokenAddress: string | undefined,
  toTokenAddress: string | undefined,
  position: PositionInfo | undefined
) => {
  const selector = useMemo(
    () => makeSelectIncreasePositionAmounts(fromTokenAddress, toTokenAddress, position),
    [fromTokenAddress, position, toTokenAddress]
  );
  return useSelector(selector);
};

export const useDecreasePositionAmounts = (position: PositionInfo | undefined) => {
  const selector = useMemo(() => makeSelectDecreasePositionAmounts(position), [position]);
  return useSelector(selector);
};

export const useNextPositionValues = (
  fromTokenAddress: string | undefined,
  toTokenAddress: string | undefined,
  position: PositionInfo | undefined
) => {
  const selector = useMemo(
    () => makeSelectNextPositionValues(fromTokenAddress, toTokenAddress, position),
    [fromTokenAddress, position, toTokenAddress]
  );
  return useSelector(selector);
};

export const useSwapRoutes = (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) => {
  const selector = useMemo(
    () => makeSelectSwapRoutes(fromTokenAddress, toTokenAddress),
    [fromTokenAddress, toTokenAddress]
  );
  return useSelector(selector);
};

export const useSwapAmounts = (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) => {
  const selector = useMemo(
    () => makeSelectSwapAmounts(fromTokenAddress, toTokenAddress),
    [fromTokenAddress, toTokenAddress]
  );
  return useSelector(selector);
};
