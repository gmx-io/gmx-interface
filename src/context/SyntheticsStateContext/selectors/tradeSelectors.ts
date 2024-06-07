import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "config/tokens";
import {
  TradeFlags,
  TradeMode,
  TradeType,
  createSwapEstimator,
  findAllPaths,
  getBestSwapPath,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
  getMarketsGraph,
  getMaxSwapPathLiquidity,
  getNextPositionValuesForDecreaseTrade,
  getNextPositionValuesForIncreaseTrade,
  getSwapPathStats,
} from "domain/synthetics/trade";
import { getByKey } from "lib/objects";
import { createSelector, createSelectorDeprecated, createSelectorFactory } from "../utils";
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

// dont swap addresses here
export const makeSelectSwapRoutes = createSelectorFactory(
  (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) =>
    createSelector((q) => {
      const chainId = q(selectChainId);
      const marketsInfoData = q(selectMarketsInfoData);
      const wrappedToken = getWrappedToken(chainId);

      const isWrap = fromTokenAddress === NATIVE_TOKEN_ADDRESS && toTokenAddress === wrappedToken.address;
      const isUnwrap = fromTokenAddress === wrappedToken.address && toTokenAddress === NATIVE_TOKEN_ADDRESS;
      const isSameToken = fromTokenAddress === toTokenAddress;

      const wrappedFromAddress = fromTokenAddress
        ? convertTokenAddress(chainId, fromTokenAddress, "wrapped")
        : undefined;
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
        if (
          !marketsInfoData ||
          !graph ||
          !wrappedFromAddress ||
          !wrappedToAddress ||
          isWrap ||
          isUnwrap ||
          isSameToken
        ) {
          return undefined;
        }

        const paths = findAllPaths(marketsInfoData, graph, wrappedFromAddress, wrappedToAddress)
          ?.sort((a, b) => (b.liquidity - a.liquidity > 0 ? 1 : -1))
          .slice(0, 5);

        return paths;
      })();

      const { maxLiquidity, maxLiquidityPath } = (() => {
        let maxLiquidity = 0n;
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

          if (liquidity > maxLiquidity) {
            maxLiquidity = liquidity;
            maxLiquidityPath = route.path;
          }
        }

        return { maxLiquidity, maxLiquidityPath };
      })();

      const findSwapPath = (usdIn: bigint, opts: { byLiquidity?: boolean }) => {
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
    })
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
  }) =>
    createSelectorDeprecated(
      [
        selectTokensData,
        selectMarketsInfoData,
        selectPositionsInfoData,
        selectSavedAcceptablePriceImpactBuffer,
        makeSelectSwapRoutes(
          initialCollateralTokenAddress,
          tokenTypeForSwapRoute === "indexToken" ? indexTokenAddress : collateralTokenAddress
        ),
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
    )
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
        const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
        const marketInfo = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;
        const receiveToken = collateralTokenAddress ? getByKey(tokensData, receiveTokenAddress) : undefined;

        if (
          closeSizeUsd === undefined ||
          !marketInfo ||
          !collateralToken ||
          minCollateralUsd === undefined ||
          minPositionSizeUsd === undefined
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
    createSelectorDeprecated(
      [
        selectPositionConstants,
        selectMarketsInfoData,
        selectTokensData,
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
        }),
        selectPositionsInfoData,
        selectUserReferralInfo,
      ],
      ({ minCollateralUsd }, marketsInfoData, tokensData, decreaseAmounts, positionsInfoData, userReferralInfo) => {
        const tradeFlags = createTradeFlags(tradeType, tradeMode);
        const marketInfo = getByKey(marketsInfoData, marketAddress);
        const collateralToken = collateralTokenAddress ? getByKey(tokensData, collateralTokenAddress) : undefined;
        const position = positionKey ? getByKey(positionsInfoData, positionKey) : undefined;

        if (!tradeFlags.isPosition || minCollateralUsd === undefined || !marketInfo || !collateralToken) {
          return undefined;
        }

        if (closeSizeUsd === undefined)
          throw new Error("makeSelectNextPositionValuesForDecrease: closeSizeUsd is undefined");

        if (decreaseAmounts?.acceptablePrice && closeSizeUsd > 0) {
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
      }
    )
);
