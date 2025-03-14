import { OrderType } from "domain/synthetics/orders";
import { getIsPositionInfoLoaded } from "domain/synthetics/positions";
import {
  FindSwapPath,
  TradeMode,
  TradeType,
  createNaiveSwapEstimator,
  createSwapEstimator,
  getBestSwapPath,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
  getMarkPrice,
  getMaxLiquidityMarketSwapPathFromTokenSwapPaths,
  getNaiveBestMarketSwapPathsFromTokenSwapPaths,
  getNextPositionValuesForDecreaseTrade,
  getNextPositionValuesForIncreaseTrade,
  getSwapPathStats,
  getTokenSwapRoutes,
  getTriggerDecreaseOrderType,
  marketRouteToMarketEdges,
} from "domain/synthetics/trade";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { ExternalSwapQuote } from "sdk/types/trade";
import { getAvailableUsdLiquidityForCollateral, getTokenPoolType } from "sdk/utils/markets";
import { createTradeFlags } from "sdk/utils/trade";
import { createSelector, createSelectorDeprecated, createSelectorFactory } from "../utils";
import { selectExternalSwapQuote } from "./externalSwapSelectors";
import {
  selectChainId,
  selectMarketsInfoData,
  selectPositionConstants,
  selectPositionsInfoData,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "./globalSelectors";
import { selectSavedAcceptablePriceImpactBuffer } from "./settingsSelectors";

export type TokenTypeForSwapRoute = "collateralToken" | "indexToken";

export const selectSwapEstimator = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);
  if (!marketsInfoData) return undefined;
  return createSwapEstimator(marketsInfoData);
});

export const selectNaiveSwapEstimator = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);
  if (!marketsInfoData) return undefined;
  return createNaiveSwapEstimator(marketsInfoData);
});

const makeSelectWrappedFromAddress = (fromTokenAddress: string | undefined) =>
  createSelector((q) => {
    const chainId = q(selectChainId);
    const wrappedFromAddress = fromTokenAddress ? convertTokenAddress(chainId, fromTokenAddress, "wrapped") : undefined;
    return wrappedFromAddress;
  });

const makeSelectWrappedToAddress = (toTokenAddress: string | undefined) => {
  return createSelector((q) => {
    const chainId = q(selectChainId);
    const wrappedToAddress = toTokenAddress ? convertTokenAddress(chainId, toTokenAddress, "wrapped") : undefined;
    return wrappedToAddress;
  });
};

export const makeSelectMaxLiquidityPath = createSelectorFactory(
  (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) => {
    const selectWrappedFromAddress = makeSelectWrappedFromAddress(fromTokenAddress);
    const selectWrappedToAddress = makeSelectWrappedToAddress(toTokenAddress);

    return createSelector((q) => {
      const chainId = q(selectChainId);
      let maxLiquidity = 0n;
      let maxLiquidityPath: string[] | undefined = undefined;
      const marketsInfoData = q(selectMarketsInfoData);
      const wrappedFromAddress = q(selectWrappedFromAddress);
      const wrappedToAddress = q(selectWrappedToAddress);
      const tokenSwapRoutes =
        wrappedFromAddress && wrappedToAddress
          ? getTokenSwapRoutes(chainId, wrappedFromAddress, wrappedToAddress)
          : EMPTY_ARRAY;

      if (!marketsInfoData || !wrappedFromAddress || !wrappedToAddress) {
        return { maxLiquidity, maxLiquidityPath };
      }

      const maxLiquidityPathInfo = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
        chainId,
        tokenSwapPaths: tokenSwapRoutes,
        tokenInAddress: wrappedFromAddress,
        tokenOutAddress: wrappedToAddress,
        getLiquidity: (marketAddress, tokenInAddress, tokenOutAddress): bigint => {
          const marketInfo = getByKey(marketsInfoData, marketAddress);
          if (!marketInfo) {
            return 0n;
          }
          const isTokenOutLong = getTokenPoolType(marketInfo, tokenOutAddress) === "long";
          const liquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isTokenOutLong);
          return liquidity;
        },
      });

      if (maxLiquidityPathInfo) {
        maxLiquidity = maxLiquidityPathInfo.liquidity;
        maxLiquidityPath = maxLiquidityPathInfo.path;
      }

      return { maxLiquidity, maxLiquidityPath };
    });
  }
);

export const makeSelectFindSwapPath = createSelectorFactory(
  (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) => {
    const selectWrappedFromAddress = makeSelectWrappedFromAddress(fromTokenAddress);
    const selectWrappedToAddress = makeSelectWrappedToAddress(toTokenAddress);

    return createSelector((q) => {
      const chainId = q(selectChainId);
      const marketsInfoData = q(selectMarketsInfoData);
      const wrappedToken = getWrappedToken(chainId);
      const estimator = q(selectSwapEstimator);
      const wrappedFromAddress = q(selectWrappedFromAddress);
      const wrappedToAddress = q(selectWrappedToAddress);
      const naiveEstimator = q(selectNaiveSwapEstimator);
      const tokenSwapRoutes =
        wrappedFromAddress && wrappedToAddress
          ? getTokenSwapRoutes(chainId, wrappedFromAddress, wrappedToAddress)
          : EMPTY_ARRAY;

      const findSwapPath: FindSwapPath = (usdIn: bigint, opts?: { order?: ("liquidity" | "length")[] }) => {
        if (
          tokenSwapRoutes.length === 0 ||
          !estimator ||
          !naiveEstimator ||
          !marketsInfoData ||
          !wrappedFromAddress ||
          !wrappedToAddress
        ) {
          return undefined;
        }

        let start = performance.now();

        let swapPath: string[] | undefined = undefined;

        if (opts?.order || usdIn === 0n) {
          const primaryOrder = opts?.order?.at(0) === "liquidity" ? "liquidity" : "length";

          if (primaryOrder === "length") {
            const shortestLength = Math.min(...tokenSwapRoutes.map((path) => path.length));
            const shortestTokenSwapPaths = tokenSwapRoutes.filter((path) => path.length === shortestLength);
            const maxLiquidityPathInfo = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
              chainId,
              tokenSwapPaths: shortestTokenSwapPaths,
              tokenInAddress: wrappedFromAddress,
              tokenOutAddress: wrappedToAddress,
              getLiquidity: (marketAddress, tokenInAddress, tokenOutAddress): bigint => {
                const marketInfo = getByKey(marketsInfoData, marketAddress);
                if (!marketInfo) {
                  return 0n;
                }
                const isTokenOutLong = getTokenPoolType(marketInfo, tokenOutAddress) === "long";
                const liquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isTokenOutLong);
                return liquidity;
              },
            });

            if (maxLiquidityPathInfo) {
              swapPath = maxLiquidityPathInfo.path;
            }
          } else {
            const maxLiquidityPathInfo = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
              chainId,
              tokenSwapPaths: tokenSwapRoutes,
              tokenInAddress: wrappedFromAddress,
              tokenOutAddress: wrappedToAddress,
              getLiquidity: (marketAddress, tokenInAddress, tokenOutAddress): bigint => {
                const marketInfo = getByKey(marketsInfoData, marketAddress);
                if (!marketInfo) {
                  return 0n;
                }
                const isTokenOutLong = getTokenPoolType(marketInfo, tokenOutAddress) === "long";
                const liquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isTokenOutLong);
                return liquidity;
              },
            });

            if (maxLiquidityPathInfo) {
              swapPath = maxLiquidityPathInfo.path;
            }
          }
        } else {
          const naiveSwapRoutes = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
            chainId,
            tokenSwapPaths: tokenSwapRoutes,
            usdIn,
            tokenInAddress: wrappedFromAddress,
            tokenOutAddress: wrappedToAddress,
            estimator: naiveEstimator,
          });
          if (naiveSwapRoutes?.length) {
            const edges = naiveSwapRoutes.map((path) =>
              marketRouteToMarketEdges(path, wrappedFromAddress, marketsInfoData)
            );
            swapPath = getBestSwapPath(edges, usdIn, estimator)?.map((edge) => edge.marketAddress);
          }
        }

        if (!swapPath) {
          return undefined;
        }

        const result = getSwapPathStats({
          marketsInfoData,
          swapPath,
          initialCollateralAddress: wrappedFromAddress,
          wrappedNativeTokenAddress: wrappedToken.address,
          shouldUnwrapNativeToken: wrappedToAddress === NATIVE_TOKEN_ADDRESS,
          shouldApplyPriceImpact: true,
          usdIn,
        });

        let end = performance.now();

        const duration = end - start;

        console.log(`findSwapPath took ${duration}ms`);

        return result;
      };

      return findSwapPath;
    });
  }
);

export const makeSelectIncreasePositionAmounts = createSelectorFactory(
  ({
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
    tokenTypeForSwapRoute,
  }: {
    initialCollateralTokenAddress: string | undefined;
    indexTokenAddress: string | undefined;
    positionKey: string | undefined;
    tradeMode: TradeMode;
    tradeType: TradeType;
    collateralTokenAddress: string | undefined;
    marketAddress: string | undefined;
    initialCollateralAmount: bigint;
    indexTokenAmount: bigint | undefined;
    leverage: bigint | undefined;
    triggerPrice: bigint | undefined;
    fixedAcceptablePriceImpactBps: bigint | undefined;
    strategy: "leverageByCollateral" | "leverageBySize" | "independent";
    tokenTypeForSwapRoute: TokenTypeForSwapRoute;
  }) => {
    const selectFindSwapPath = makeSelectFindSwapPath(
      initialCollateralTokenAddress,
      tokenTypeForSwapRoute === "indexToken" ? indexTokenAddress : collateralTokenAddress
    );

    return createSelector((q) => {
      const indexToken = q((state) => getByKey(selectTokensData(state), indexTokenAddress));
      const initialCollateralToken = q((state) => getByKey(selectTokensData(state), initialCollateralTokenAddress));
      const collateralToken = q((state) => getByKey(selectTokensData(state), collateralTokenAddress));
      const marketInfo = q((state) => getByKey(selectMarketsInfoData(state), marketAddress));
      const position = q((state) => getByKey(selectPositionsInfoData(state), positionKey));
      const externalSwapQuote = q(selectExternalSwapQuote);

      const acceptablePriceImpactBuffer = q(selectSavedAcceptablePriceImpactBuffer);
      const findSwapPath = q(selectFindSwapPath);
      const userReferralInfo = q(selectUserReferralInfo);
      const uiFeeFactor = q(selectUiFeeFactor);

      const tradeFlags = createTradeFlags(tradeType, tradeMode);

      let limitOrderType: OrderType | undefined = undefined;
      if (tradeFlags.isLimit) {
        if (tradeMode === TradeMode.Limit) {
          limitOrderType = OrderType.LimitIncrease;
        } else if (tradeMode === TradeMode.StopMarket) {
          limitOrderType = OrderType.StopIncrease;
        }
      }

      if (
        indexTokenAmount === undefined ||
        !tradeFlags.isIncrease ||
        !indexToken ||
        !initialCollateralToken ||
        !collateralToken ||
        !marketInfo
      ) {
        return undefined;
      }

      return getIncreasePositionAmounts({
        position,
        marketInfo,
        indexToken,
        initialCollateralToken,
        collateralToken,
        isLong: tradeFlags.isLong,
        initialCollateralAmount,
        indexTokenAmount,
        leverage,
        triggerPrice: tradeFlags.isLimit ? triggerPrice : undefined,
        limitOrderType,
        fixedAcceptablePriceImpactBps,
        acceptablePriceImpactBuffer,
        externalSwapQuote,
        findSwapPath,
        userReferralInfo,
        uiFeeFactor,
        strategy,
      });
    });
  }
);

export const makeSelectDecreasePositionAmounts = createSelectorFactory(
  ({
    collateralTokenAddress,
    marketAddress,
    positionKey,
    tradeMode,
    tradeType,
    triggerPrice,
    closeSizeUsd,
    keepLeverage,
    fixedAcceptablePriceImpactBps,
    receiveTokenAddress,
  }: {
    positionKey: string | undefined;
    tradeMode: TradeMode;
    tradeType: TradeType;
    collateralTokenAddress: string | undefined;
    marketAddress: string | undefined;
    triggerPrice: bigint | undefined;
    closeSizeUsd: bigint | undefined;
    fixedAcceptablePriceImpactBps: bigint | undefined;
    keepLeverage: boolean | undefined;
    receiveTokenAddress: string | undefined;
  }) =>
    createSelectorDeprecated(
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

        let markPrice = position?.markPrice;
        if (markPrice === undefined) {
          const market = getByKey(marketsInfoData, marketAddress);
          if (market) {
            markPrice = getMarkPrice({
              prices: market.indexToken.prices,
              isIncrease: false,
              isLong: tradeFlags.isLong,
            });
          }
        }

        let triggerOrderType: OrderType | undefined =
          markPrice === undefined || tradeMode !== TradeMode.Trigger
            ? undefined
            : getTriggerDecreaseOrderType({
                isLong: tradeFlags.isLong,
                markPrice: markPrice,
                triggerPrice: triggerPrice ?? 0n,
              });

        const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
        const marketInfo = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;
        const receiveToken = collateralTokenAddress ? getByKey(tokensData, receiveTokenAddress) : undefined;

        if (
          closeSizeUsd === undefined ||
          !marketInfo ||
          !collateralToken ||
          minCollateralUsd === undefined ||
          minPositionSizeUsd === undefined ||
          (position && !getIsPositionInfoLoaded(position))
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
          receiveToken,
          triggerOrderType,
        });
      }
    )
);

export const makeSelectNextPositionValuesForIncrease = createSelectorFactory(
  ({
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
    tokenTypeForSwapRoute,
    isPnlInLeverage,
  }: {
    initialCollateralTokenAddress: string | undefined;
    indexTokenAddress: string | undefined;
    positionKey: string | undefined;
    tradeMode: TradeMode;
    tradeType: TradeType;
    collateralTokenAddress: string | undefined;
    marketAddress: string | undefined;
    initialCollateralAmount: bigint;
    indexTokenAmount: bigint | undefined;
    leverage: bigint | undefined;
    triggerPrice: bigint | undefined;
    fixedAcceptablePriceImpactBps: bigint | undefined;
    increaseStrategy: "leverageByCollateral" | "leverageBySize" | "independent";
    tokenTypeForSwapRoute: TokenTypeForSwapRoute;
    isPnlInLeverage: boolean;
    externalSwapQuote: ExternalSwapQuote | undefined;
  }) =>
    createSelectorDeprecated(
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
          tokenTypeForSwapRoute,
        }),
        selectPositionsInfoData,
        selectUserReferralInfo,
      ],
      ({ minCollateralUsd }, marketsInfoData, tokensData, increaseAmounts, positionsInfoData, userReferralInfo) => {
        const tradeFlags = createTradeFlags(tradeType, tradeMode);
        const marketInfo = getByKey(marketsInfoData, marketAddress);
        const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
        const position = positionKey ? getByKey(positionsInfoData, positionKey) : undefined;

        if (!tradeFlags.isPosition || minCollateralUsd === undefined || !marketInfo || !collateralToken) {
          return undefined;
        }

        if (tradeFlags.isIncrease && increaseAmounts?.acceptablePrice && initialCollateralAmount > 0) {
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
            showPnlInLeverage: isPnlInLeverage,
            minCollateralUsd,
            userReferralInfo,
          });
        }
      }
    )
);

export const makeSelectNextPositionValuesForDecrease = createSelectorFactory(
  ({
    closeSizeUsd,
    collateralTokenAddress,
    fixedAcceptablePriceImpactBps,
    keepLeverage,
    marketAddress,
    positionKey,
    tradeMode,
    tradeType,
    triggerPrice,
    isPnlInLeverage,
    receiveTokenAddress,
  }: {
    closeSizeUsd: bigint | undefined;
    collateralTokenAddress: string | undefined;
    fixedAcceptablePriceImpactBps: bigint | undefined;
    keepLeverage: boolean | undefined;
    marketAddress: string | undefined;
    positionKey: string | undefined;
    tradeMode: TradeMode;
    tradeType: TradeType;
    triggerPrice: bigint | undefined;
    isPnlInLeverage: boolean;
    receiveTokenAddress: string | undefined;
  }) =>
    createSelector((q) => {
      const { minCollateralUsd } = q(selectPositionConstants);
      const marketsInfoData = q(selectMarketsInfoData);
      const tokensData = q(selectTokensData);
      const decreaseAmounts = q(
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
          receiveTokenAddress,
        })
      );
      const positionsInfoData = q(selectPositionsInfoData);
      const userReferralInfo = q(selectUserReferralInfo);

      const tradeFlags = createTradeFlags(tradeType, tradeMode);
      const marketInfo = getByKey(marketsInfoData, marketAddress);
      const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
      const position = positionKey ? getByKey(positionsInfoData, positionKey) : undefined;

      if (!tradeFlags.isPosition || minCollateralUsd === undefined || !marketInfo || !collateralToken) {
        return undefined;
      }

      if (closeSizeUsd === undefined)
        throw new Error("makeSelectNextPositionValuesForDecrease: closeSizeUsd is undefined");

      if (decreaseAmounts?.acceptablePrice !== undefined && closeSizeUsd > 0) {
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
          showPnlInLeverage: isPnlInLeverage,
          isLong: tradeFlags.isLong,
          minCollateralUsd,
          userReferralInfo,
        });
      }
    })
);
