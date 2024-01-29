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

/*
    trade fields:
    tradeType,
    tradeMode,
    tradeFlags,
    isWrapOrUnwrap,
    fromTokenAddress,
    fromToken,
    toTokenAddress,
    toToken,
    marketAddress,
    marketInfo,
    collateralAddress,
    collateralToken,
    availableTokensOptions,
    avaialbleTradeModes,
    setTradeType,
    setTradeMode,
    setFromTokenAddress,
    setToTokenAddress,
    setMarketAddress,
    setCollateralAddress,
    setActivePosition,
    switchTokenAddresses,
*/

// trade
const selectTradeType = (s: SyntheticsState) => s.trade.tradeType;
const selectTradeMode = (s: SyntheticsState) => s.trade.tradeMode;
const selectIsWrapOrUnwrap = (s: SyntheticsState) => s.trade.isWrapOrUnwrap;
const selectFromTokenAddress = (s: SyntheticsState) => s.trade.fromTokenAddress;
const selectToTokenAddress = (s: SyntheticsState) => s.trade.toTokenAddress;
const selectMarketAddress = (s: SyntheticsState) => s.trade.marketAddress;
const selectMarketInfo = (s: SyntheticsState) => s.trade.marketInfo;
const selectCollateralAddress = (s: SyntheticsState) => s.trade.collateralAddress;
const selectCollateralToken = (s: SyntheticsState) => s.trade.collateralToken;
const selectAvailableTokensOptions = (s: SyntheticsState) => s.trade.availableTokensOptions;
const selectAvailableTradeModes = (s: SyntheticsState) => s.trade.avaialbleTradeModes;
const selectSetTradeType = (s: SyntheticsState) => s.trade.setTradeType;
const selectSetTradeMode = (s: SyntheticsState) => s.trade.setTradeMode;
const selectSetFromTokenAddress = (s: SyntheticsState) => s.trade.setFromTokenAddress;
const selectSetToTokenAddress = (s: SyntheticsState) => s.trade.setToTokenAddress;
const selectSetMarketAddress = (s: SyntheticsState) => s.trade.setMarketAddress;
const selectSetCollateralAddress = (s: SyntheticsState) => s.trade.setCollateralAddress;
const selectSetActivePosition = (s: SyntheticsState) => s.trade.setActivePosition;
const selectSwitchTokenAddresses = (s: SyntheticsState) => s.trade.switchTokenAddresses;
const selectSetFromTokenInputValue = (s: SyntheticsState) => s.trade.setFromTokenInputValue;
const selectSetToTokenInputValue = (s: SyntheticsState) => s.trade.setToTokenInputValue;
const selectFromTokenInputValue = (s: SyntheticsState) => s.trade.fromTokenInputValue;
const selectToTokenInputValue = (s: SyntheticsState) => s.trade.toTokenInputValue;
const selectStage = (s: SyntheticsState) => s.trade.stage;
const selectSetStage = (s: SyntheticsState) => s.trade.setStage;
const selectFocusedInput = (s: SyntheticsState) => s.trade.focusedInput;
const selectSetFocusedInput = (s: SyntheticsState) => s.trade.setFocusedInput;
const selectFixedTriggerThresholdType = (s: SyntheticsState) => s.trade.fixedTriggerThresholdType;
const selectSetFixedTriggerThresholdType = (s: SyntheticsState) => s.trade.setFixedTriggerThresholdType;
const selectFixedTriggerOrderType = (s: SyntheticsState) => s.trade.fixedTriggerOrderType;
const selectSetFixedTriggerOrderType = (s: SyntheticsState) => s.trade.setFixedTriggerOrderType;
const selectDefaultTriggerAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.trade.defaultTriggerAcceptablePriceImpactBps;
const selectSetDefaultTriggerAcceptablePriceImapctBps = (s: SyntheticsState) =>
  s.trade.setDefaultTriggerAcceptablePriceImapctBps;
const selectSelectedTriggerAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.trade.selectedTriggerAcceptablePriceImpactBps;
const selectSetSelectedAcceptablePriceImapctBps = (s: SyntheticsState) => s.trade.setSelectedAcceptablePriceImapctBps;
const selectCloseSizeInputValue = (s: SyntheticsState) => s.trade.closeSizeInputValue;
const selectSetCloseSizeInputValue = (s: SyntheticsState) => s.trade.setCloseSizeInputValue;
const selectTriggerPriceInputValue = (s: SyntheticsState) => s.trade.triggerPriceInputValue;
const selectSetTriggerPriceInputValue = (s: SyntheticsState) => s.trade.setTriggerPriceInputValue;
const selectTriggerRatioInputValue = (s: SyntheticsState) => s.trade.triggerRatioInputValue;
const selectSetTriggerRatioInputValue = (s: SyntheticsState) => s.trade.setTriggerRatioInputValue;
const selectLeverageOption = (s: SyntheticsState) => s.trade.leverageOption;
const selectSetLeverageOption = (s: SyntheticsState) => s.trade.setLeverageOption;
const selectIsLeverageEnabled = (s: SyntheticsState) => s.trade.isLeverageEnabled;
const selectSetIsLeverageEnabled = (s: SyntheticsState) => s.trade.setIsLeverageEnabled;
const selectKeepLeverage = (s: SyntheticsState) => s.trade.keepLeverage;
const selectSetKeepLeverage = (s: SyntheticsState) => s.trade.setKeepLeverage;

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

// constants
const selectMinCollateralUsd = (s: SyntheticsState) => s.globals.positionsConstants.minCollateralUsd;
const selectMinPositionSizeUsd = (s: SyntheticsState) => s.globals.positionsConstants.minPositionSizeUsd;
const selectPositionConstants = createSelector(
  [selectMinCollateralUsd, selectMinPositionSizeUsd],
  (minCollateralUsd, minPositionSizeUsd) => ({
    minCollateralUsd,
    minPositionSizeUsd,
  })
);

const selectFromToken = createSelector([selectFromTokenAddress, selectTokensData], (fromTokenAddress, tokensData) =>
  getByKey(tokensData, fromTokenAddress)
);
const selectToToken = createSelector([selectToTokenAddress, selectTokensData], (toTokenAddress, tokensData) =>
  getByKey(tokensData, toTokenAddress)
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

const selectTradeFlags = createSelector(
  [selectTradeType, selectTradeMode],
  (tradeType: TradeType, tradeMode: TradeMode) => createTradeFlags(tradeType, tradeMode)
);

const selectSelectedPositionKey = createSelector(
  [selectAccount, selectCollateralAddress, selectMarketAddress, selectTradeFlags],
  (account, collateralAddress, marketAddress, tradeFlags) => {
    if (!account || !collateralAddress || !marketAddress) {
      return undefined;
    }

    return getPositionKey(account, marketAddress, collateralAddress, tradeFlags.isLong);
  }
);

const selectSelectedPosition = createSelector(
  [selectSelectedPositionKey, selectPositionsInfoData],
  (selectedPositionKey, positionsInfoData) => getByKey(positionsInfoData, selectedPositionKey)
);

const selectExistingOrder = createSelector(
  [selectSelectedPositionKey, selectOrdersInfoData],
  (selectedPositionKey, ordersInfoData) => {
    if (!selectedPositionKey) {
      return undefined;
    }

    return Object.values(ordersInfoData || {})
      .filter((order) => !isSwapOrderType(order.orderType))
      .find((order) => {
        if (isSwapOrderType(order.orderType)) {
          return false;
        }

        return (
          getPositionKey(order.account, order.marketAddress, order.targetCollateralToken.address, order.isLong) ===
          selectedPositionKey
        );
      });
  }
);

const selectLeverage = createSelector([selectLeverageOption], (leverageOption) =>
  BigNumber.from(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)))
);

const selectHasExistingOrder = createSelector([selectExistingOrder], (existingOrder) => !!existingOrder);

// TODO add tokenaddress as arg?
const selectFromTokenAmount = createSelector(
  [selectFromTokenInputValue, selectFromToken],
  (fromTokenInputValue, fromToken) =>
    fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0)
);

const selectToTokenAmount = createSelector([selectToTokenInputValue, selectToToken], (toTokenInputValue, toToken) =>
  toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0)
);

// tradebox
export const selectTradeboxState = createSelector(
  [
    selectSetFromTokenInputValue,
    selectSetToTokenInputValue,
    selectFromTokenInputValue,
    selectToTokenInputValue,
    selectStage,
    selectSetStage,
    selectFocusedInput,
    selectSetFocusedInput,
    selectFixedTriggerThresholdType,
    selectSetFixedTriggerThresholdType,
    selectFixedTriggerOrderType,
    selectSetFixedTriggerOrderType,
    selectDefaultTriggerAcceptablePriceImpactBps,
    selectSetDefaultTriggerAcceptablePriceImapctBps,
    selectSelectedTriggerAcceptablePriceImpactBps,
    selectSetSelectedAcceptablePriceImapctBps,
    selectCloseSizeInputValue,
    selectSetCloseSizeInputValue,
    selectTriggerPriceInputValue,
    selectSetTriggerPriceInputValue,
    selectTriggerRatioInputValue,
    selectSetTriggerRatioInputValue,
    selectLeverageOption,
    selectSetLeverageOption,
    selectIsLeverageEnabled,
    selectSetIsLeverageEnabled,
    selectKeepLeverage,
    selectSetKeepLeverage,
  ],
  (
    setFromTokenInputValue,
    setToTokenInputValue,
    fromTokenInputValue,
    toTokenInputValue,
    stage,
    setStage,
    focusedInput,
    setFocusedInput,
    fixedTriggerThresholdType,
    setFixedTriggerThresholdType,
    fixedTriggerOrderType,
    setFixedTriggerOrderType,
    defaultTriggerAcceptablePriceImpactBps,
    setDefaultTriggerAcceptablePriceImapctBps,
    selectedTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImapctBps,
    closeSizeInputValue,
    setCloseSizeInputValue,
    triggerPriceInputValue,
    setTriggerPriceInputValue,
    triggerRatioInputValue,
    setTriggerRatioInputValue,
    leverageOption,
    setLeverageOption,
    isLeverageEnabled,
    setIsLeverageEnabled,
    keepLeverage,
    setKeepLeverage
  ) => ({
    setFromTokenInputValue,
    setToTokenInputValue,
    fromTokenInputValue,
    toTokenInputValue,
    stage,
    setStage,
    focusedInput,
    setFocusedInput,
    fixedTriggerThresholdType,
    setFixedTriggerThresholdType,
    fixedTriggerOrderType,
    setFixedTriggerOrderType,
    defaultTriggerAcceptablePriceImpactBps,
    setDefaultTriggerAcceptablePriceImapctBps,
    selectedTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImapctBps,
    closeSizeInputValue,
    setCloseSizeInputValue,
    triggerPriceInputValue,
    setTriggerPriceInputValue,
    triggerRatioInputValue,
    setTriggerRatioInputValue,
    leverageOption,
    setLeverageOption,
    isLeverageEnabled,
    setIsLeverageEnabled,
    keepLeverage,
    setKeepLeverage,
  })
);

const selectTriggerPrice = createSelector([selectTriggerPriceInputValue], (triggerPriceInputValue) =>
  parseValue(triggerPriceInputValue, USD_DECIMALS)
);

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
  createSelector(
    [
      selectTradeFlags,
      selectToToken,
      selectFromToken,
      selectCollateralToken,
      selectMarketInfo,
      selectLeverage,
      selectFromTokenAmount,
      selectToTokenAmount,
      selectTriggerPrice,
      selectSelectedTriggerAcceptablePriceImpactBps,
      selectSavedAcceptablePriceImpactBuffer,
      selectIsLeverageEnabled,
      selectFocusedInput,
      selectUserReferralInfo,
      selectUiFeeFactor,
      makeSelectSwapRoutes(fromTokenAddress, toTokenAddress),
    ],
    (
      tradeFlags,
      toToken,
      fromToken,
      collateralToken,
      marketInfo,
      leverage,
      fromTokenAmount,
      toTokenAmount,
      triggerPrice,
      selectedTriggerAcceptablePriceImpactBps,
      savedAcceptablePriceImpactBuffer,
      isLeverageEnabled,
      focusedInput,
      userReferralInfo,
      uiFeeFactor,
      swapRoute
    ) => {
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
    }
  );

const makeSelectDecreasePositionAmounts = (position: PositionInfo | undefined) =>
  createSelector(
    [
      selectTradeFlags,
      selectCloseSizeInputValue,
      selectMarketInfo,
      selectCollateralToken,
      selectMinCollateralUsd,
      selectMinPositionSizeUsd,
      selectKeepLeverage,
      selectTriggerPrice,
      selectSelectedTriggerAcceptablePriceImpactBps,
      selectSavedAcceptablePriceImpactBuffer,
      selectUserReferralInfo,
      selectUiFeeFactor,
    ],
    (
      tradeFlags,
      closeSizeInputValue,
      marketInfo,
      collateralToken,
      minCollateralUsd,
      minPositionSizeUsd,
      keepLeverage,
      triggerPrice,
      selectedTriggerAcceptablePriceImpactBps,
      savedAcceptablePriceImpactBuffer,
      userReferralInfo,
      uiFeeFactor
    ) => {
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
    }
  );

const selectMarkPrice = createSelector([selectToToken, selectTradeFlags], (toToken, tradeFlags) => {
  if (!toToken) {
    return undefined;
  }

  if (tradeFlags.isSwap) {
    return toToken.prices.minPrice;
  }

  return getMarkPrice({ prices: toToken.prices, isIncrease: tradeFlags.isIncrease, isLong: tradeFlags.isLong });
});

const selectRatios = createSelector(
  [selectTradeFlags, selectFromToken, selectToToken, selectMarkPrice, selectTriggerRatioInputValue],
  (tradeFlags, fromToken, toToken, markPrice, triggerRatioInputValue) => {
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
  }
);

const makeSelectSwapAmounts = (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) =>
  createSelector(
    [
      selectTradeFlags,
      selectFromToken,
      selectToToken,
      selectIsWrapOrUnwrap,
      selectFocusedInput,
      selectFromTokenAmount,
      selectToTokenAmount,
      selectRatios,
      selectUiFeeFactor,
      makeSelectSwapRoutes(fromTokenAddress, toTokenAddress),
    ],
    (
      { isSwap, isLimit },
      fromToken,
      toToken,
      isWrapOrUnwrap,
      focusedInput,
      fromTokenAmount,
      toTokenAmount,
      { triggerRatio, markRatio },
      uiFeeFactor,
      swapRoute
    ) => {
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
    }
  );

// TODO move to tradebox folder?
const makeSelectNextPositionValues = (
  fromTokenAddress: string | undefined,
  toTokenAddress: string | undefined,
  position: PositionInfo | undefined
) =>
  createSelector(
    [
      selectTradeFlags,
      selectMinCollateralUsd,
      selectMarketInfo,
      selectCollateralToken,
      makeSelectIncreasePositionAmounts(fromTokenAddress, toTokenAddress, position),
      makeSelectDecreasePositionAmounts(position),
      selectFromTokenAmount,
      selectSavedIsPnlInLeverage,
      selectUserReferralInfo,
      selectCloseSizeInputValue,
    ],
    (
      tradeFlags,
      minCollateralUsd,
      marketInfo,
      collateralToken,
      increaseAmounts,
      decreaseAmounts,
      fromTokenAmount,
      savedIsPnlInLeverage,
      userReferralInfo,
      closeSizeInputValue
    ) => {
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
    }
  );

export const useTradeType = () => useSelector(selectTradeType);
export const useTradeMode = () => useSelector(selectTradeMode);
export const useIsWrapOrUnwrap = () => useSelector(selectIsWrapOrUnwrap);
export const useFromTokenAddress = () => useSelector(selectFromTokenAddress);
export const useFromToken = () => useSelector(selectFromToken);
export const useToTokenAddress = () => useSelector(selectToTokenAddress);
export const useToToken = () => useSelector(selectToToken);
export const useMarketAddress = () => useSelector(selectMarketAddress);
export const useMarketInfo = () => useSelector(selectMarketInfo);
export const useCollateralAddress = () => useSelector(selectCollateralAddress);
export const useCollateralToken = () => useSelector(selectCollateralToken);
export const useAvailableTokensOptions = () => useSelector(selectAvailableTokensOptions);
export const useAvailableTradeModes = () => useSelector(selectAvailableTradeModes);
export const useSetTradeType = () => useSelector(selectSetTradeType);
export const useSetTradeMode = () => useSelector(selectSetTradeMode);
export const useSetFromTokenAddress = () => useSelector(selectSetFromTokenAddress);
export const useSetToTokenAddress = () => useSelector(selectSetToTokenAddress);
export const useSetMarketAddress = () => useSelector(selectSetMarketAddress);
export const useSetCollateralAddress = () => useSelector(selectSetCollateralAddress);
export const useSetActivePosition = () => useSelector(selectSetActivePosition);
export const useSwitchTokenAddresses = () => useSelector(selectSwitchTokenAddresses);

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
export const useTradeboxState = () => useSelector(selectTradeboxState);
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
