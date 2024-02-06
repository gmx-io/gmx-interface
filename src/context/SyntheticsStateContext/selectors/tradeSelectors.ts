import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "config/tokens";
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
import { getByKey } from "lib/objects";
import {
  selectChainId,
  selectMarketsInfoData,
  selectPositionConstants,
  selectPositionsInfoData,
  selectSavedIsPnlInLeverage,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "./globalSelectors";
import { selectSavedAcceptablePriceImpactBuffer } from "./settingsSelectors";
import { TokensRatio, convertToUsd, getTokensRatioByPrice } from "domain/synthetics/tokens";
import { createSelector } from "../utils";

export const makeSelectSwapRoutes = (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) =>
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

export const makeSelectIncreasePositionAmounts = ({
  collateralTokenAddress,
  fixedAcceptablePriceImpactBps,
  initialCollateralTokenAddress,
  initialCollateralAmount,
  leverage,
  marketAddress,
  positionKey,
  strategy,
  indexTokenAddress,
  indexTokenAmount,
  tradeMode,
  tradeType,
  triggerPrice,
}: {
  initialCollateralTokenAddress: string | undefined;
  indexTokenAddress: string | undefined;
  positionKey: string | undefined;
  tradeMode: TradeMode;
  tradeType: TradeType;
  collateralTokenAddress: string | undefined;
  marketAddress: string | undefined;
  initialCollateralAmount: BigNumber;
  indexTokenAmount: BigNumber | undefined;
  leverage: BigNumber | undefined;
  triggerPrice: BigNumber | undefined;
  fixedAcceptablePriceImpactBps: BigNumber | undefined;
  strategy: "leverageByCollateral" | "leverageBySize" | "independent";
}) =>
  createSelector(
    [
      selectTokensData,
      selectMarketsInfoData,
      selectPositionsInfoData,
      selectSavedAcceptablePriceImpactBuffer,
      makeSelectSwapRoutes(initialCollateralTokenAddress, indexTokenAddress),
      selectUserReferralInfo,
      selectUiFeeFactor,
    ],
    (
      tokensData,
      marketsInfoData,
      positionsInfoData,
      acceptablePriceImpactBuffer,
      { findSwapPath },
      userReferralInfo,
      uiFeeFactor
    ) => {
      const position = positionKey ? getByKey(positionsInfoData, positionKey) : undefined;
      const tradeFlags = createTradeFlags(tradeType, tradeMode);
      const indexToken = indexTokenAddress ? getByKey(tokensData, indexTokenAddress) : undefined;
      const initialCollateralToken = initialCollateralTokenAddress
        ? getByKey(tokensData, initialCollateralTokenAddress)
        : undefined;
      const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
      const marketInfo = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;

      if (
        !indexTokenAmount ||
        !tradeFlags.isIncrease ||
        !indexToken ||
        !initialCollateralToken ||
        !collateralToken ||
        !marketInfo
      ) {
        return undefined;
      }

      return getIncreasePositionAmounts({
        marketInfo,
        indexToken,
        initialCollateralToken,
        collateralToken,
        isLong: tradeFlags.isLong,
        initialCollateralAmount,
        indexTokenAmount,
        leverage,
        triggerPrice: tradeFlags.isLimit ? triggerPrice : undefined,
        position,
        fixedAcceptablePriceImpactBps,
        acceptablePriceImpactBuffer,
        findSwapPath,
        userReferralInfo,
        uiFeeFactor,
        strategy,
      });
    }
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

export const makeSelectDecreasePositionAmounts = ({
  collateralTokenAddress,
  marketAddress,
  positionKey,
  tradeMode,
  tradeType,
  triggerPrice,
  closeSizeUsd,
  keepLeverage,
  fixedAcceptablePriceImpactBps,
}: {
  positionKey: string | undefined;
  tradeMode: TradeMode;
  tradeType: TradeType;
  collateralTokenAddress: string | undefined;
  marketAddress: string | undefined;
  triggerPrice: BigNumber | undefined;
  closeSizeUsd: BigNumber | undefined;
  fixedAcceptablePriceImpactBps: BigNumber | undefined;
  keepLeverage: boolean | undefined;
}) =>
  createSelector(
    [
      selectPositionsInfoData,
      selectTokensData,
      selectMarketsInfoData,
      selectPositionConstants,
      selectSavedAcceptablePriceImpactBuffer,
      selectUserReferralInfo,
      selectUiFeeFactor,
    ],
    (
      positionsInfoData,
      tokensData,
      marketsInfoData,
      { minCollateralUsd, minPositionSizeUsd },
      savedAcceptablePriceImpactBuffer,
      userReferralInfo,
      uiFeeFactor
    ) => {
      const position = positionKey ? getByKey(positionsInfoData, positionKey) : undefined;
      const tradeFlags = createTradeFlags(tradeType, tradeMode);
      const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
      const marketInfo = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;

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
        closeSizeUsd,
        keepLeverage: keepLeverage!,
        triggerPrice,
        fixedAcceptablePriceImpactBps,
        acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
        userReferralInfo,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
      });
    }
  );

export const selectMarkPrice = ({
  toTokenAddress,
  tradeMode,
  tradeType,
}: {
  toTokenAddress: string | undefined;
  tradeType: TradeType;
  tradeMode: TradeMode;
}) =>
  createSelector([selectTokensData], (tokensData) => {
    const tradeFlags = createTradeFlags(tradeType, tradeMode);
    const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;

    if (!toToken) {
      return undefined;
    }

    if (tradeFlags.isSwap) {
      return toToken.prices.minPrice;
    }

    return getMarkPrice({ prices: toToken.prices, isIncrease: tradeFlags.isIncrease, isLong: tradeFlags.isLong });
  });

export const makeSelectTradeRatios = ({
  fromTokenAddress,
  toTokenAddress,
  tradeType,
  tradeMode,
  triggerRatioValue,
}: {
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  tradeType: TradeType;
  tradeMode: TradeMode;
  triggerRatioValue: BigNumber | undefined;
}) =>
  createSelector(
    [
      selectTokensData,
      selectMarkPrice({
        toTokenAddress,
        tradeMode,
        tradeType,
      }),
    ],
    (tokensData, markPrice) => {
      const tradeFlags = createTradeFlags(tradeType, tradeMode);
      const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
      const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
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

export const makeSelectSwapAmounts = ({
  amountBy,
  fromTokenAddress,
  fromTokenAmount,
  isWrapOrUnwrap,
  toTokenAddress,
  toTokenAmount,
  tradeMode,
  triggerRatioValue,
}: {
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  tradeMode: TradeMode;
  isWrapOrUnwrap: boolean;
  amountBy: "from" | "to" | undefined;
  fromTokenAmount: BigNumber;
  toTokenAmount: BigNumber;
  triggerRatioValue: BigNumber | undefined;
}) =>
  createSelector(
    [
      selectTokensData,
      makeSelectSwapRoutes(fromTokenAddress, toTokenAddress),
      selectUiFeeFactor,
      makeSelectTradeRatios({
        fromTokenAddress,
        toTokenAddress,
        tradeMode,
        tradeType: TradeType.Swap,
        triggerRatioValue,
      }),
    ],
    (tokensData, swapRoute, uiFeeFactor, { markRatio, triggerRatio }) => {
      const tradeFlags = createTradeFlags(TradeType.Swap, tradeMode);
      const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
      const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;

      const fromTokenPrice = fromToken?.prices.minPrice;

      if (!fromToken || !toToken || !fromTokenPrice) {
        return undefined;
      }

      if (isWrapOrUnwrap) {
        const tokenAmount = amountBy === "from" ? fromTokenAmount : toTokenAmount;
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
      } else if (amountBy === "from") {
        return getSwapAmountsByFromValue({
          tokenIn: fromToken,
          tokenOut: toToken,
          amountIn: fromTokenAmount,
          triggerRatio: triggerRatio || markRatio,
          isLimit: tradeFlags.isLimit,
          findSwapPath: swapRoute.findSwapPath,
          uiFeeFactor,
        });
      } else {
        return getSwapAmountsByToValue({
          tokenIn: fromToken,
          tokenOut: toToken,
          amountOut: toTokenAmount,
          triggerRatio: triggerRatio || markRatio,
          isLimit: tradeFlags.isLimit,
          findSwapPath: swapRoute.findSwapPath,
          uiFeeFactor,
        });
      }
    }
  );

export const makeSelectNextPositionValues = ({
  collateralTokenAddress,
  fixedAcceptablePriceImpactBps,
  initialCollateralTokenAddress,
  initialCollateralAmount,
  leverage,
  marketAddress,
  positionKey,
  increaseStrategy,
  indexTokenAddress,
  indexTokenAmount,
  tradeMode,
  tradeType,
  triggerPrice,
  closeSizeUsd,
  keepLeverage,
}: {
  initialCollateralTokenAddress: string | undefined;
  indexTokenAddress: string | undefined;
  positionKey: string | undefined;
  tradeMode: TradeMode;
  tradeType: TradeType;
  collateralTokenAddress: string | undefined;
  marketAddress: string | undefined;
  initialCollateralAmount: BigNumber;
  indexTokenAmount: BigNumber | undefined;
  leverage: BigNumber | undefined;
  triggerPrice: BigNumber | undefined;
  fixedAcceptablePriceImpactBps: BigNumber | undefined;
  increaseStrategy: "leverageByCollateral" | "leverageBySize" | "independent";
  closeSizeUsd: BigNumber | undefined;
  keepLeverage: boolean | undefined;
}) =>
  createSelector(
    [
      selectPositionConstants,
      selectMarketsInfoData,
      selectTokensData,
      makeSelectIncreasePositionAmounts({
        collateralTokenAddress,
        fixedAcceptablePriceImpactBps,
        initialCollateralTokenAddress,
        initialCollateralAmount,
        leverage,
        marketAddress,
        positionKey,
        strategy: increaseStrategy,
        indexTokenAddress,
        indexTokenAmount,
        tradeMode,
        tradeType,
        triggerPrice,
      }),
      makeSelectDecreasePositionAmounts({
        closeSizeUsd,
        collateralTokenAddress,
        fixedAcceptablePriceImpactBps,
        keepLeverage,
        marketAddress,
        positionKey,
        tradeMode,
        tradeType,
        triggerPrice,
      }),
      selectPositionsInfoData,
      selectSavedIsPnlInLeverage,
      selectUserReferralInfo,
    ],
    (
      { minCollateralUsd },
      marketsInfoData,
      tokensData,
      increaseAmounts,
      decreaseAmounts,
      positionsInfoData,
      savedIsPnlInLeverage,
      userReferralInfo
    ) => {
      const tradeFlags = createTradeFlags(tradeType, tradeMode);
      const marketInfo = getByKey(marketsInfoData, marketAddress);
      const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
      const position = positionKey ? getByKey(positionsInfoData, positionKey) : undefined;

      if (!tradeFlags.isPosition || !minCollateralUsd || !marketInfo || !collateralToken) {
        return undefined;
      }

      if (!closeSizeUsd) throw new Error("makeSelectNextPositionValues: closeSizeUsd is undefined");

      if (tradeFlags.isIncrease && increaseAmounts?.acceptablePrice && initialCollateralAmount.gt(0)) {
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
