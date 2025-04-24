import { isDevelopment } from "config/env";
import { OrderType } from "domain/synthetics/orders";
import { getIsPositionInfoLoaded } from "domain/synthetics/positions";
import {
  TradeMode,
  TradeType,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
  getMarkPrice,
  getNextPositionValuesForDecreaseTrade,
  getNextPositionValuesForIncreaseTrade,
  getTriggerDecreaseOrderType,
} from "domain/synthetics/trade";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { MARKETS } from "sdk/configs/markets";
import { ExternalSwapQuote } from "sdk/types/trade";
import { buildMarketsAdjacencyGraph } from "sdk/utils/swap/buildMarketsAdjacencyGraph";
import { createFindSwapPath, getWrappedAddress } from "sdk/utils/swap/swapPath";
import {
  createMarketEdgeLiquidityGetter,
  getMarketAdjacencyGraph,
  getMaxLiquidityMarketSwapPathFromTokenSwapPaths,
  getTokenSwapPathsForTokenPairPrebuilt,
} from "sdk/utils/swap/swapRouting";
import { createTradeFlags } from "sdk/utils/trade";

import { getTokenBySymbolSafe } from "sdk/configs/tokens";
import { createSelector, createSelectorDeprecated, createSelectorFactory } from "../utils";
import {
  selectChainId,
  selectGasLimits,
  selectGasPaymentToken,
  selectGasPrice,
  selectMarketsInfoData,
  selectPositionConstants,
  selectPositionsInfoData,
  selectRelayerFeeToken,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "./globalSelectors";
import { selectDebugSwapMarketsConfig, selectSavedAcceptablePriceImpactBuffer } from "./settingsSelectors";
import { selectChartToken } from "./shared/marketSelectors";

import { marketsInfoData2IndexTokenStatsMap } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { calculateDisplayDecimals } from "lib/numbers";
import { getToken } from "sdk/configs/tokens";

import {
  selectTradeboxFromTokenAddress,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
} from "./tradeboxSelectors";

import { getTokenData } from "domain/synthetics/tokens";

export type TokenTypeForSwapRoute = "collateralToken" | "indexToken";

export const selectTradeboxTradeFlags = createSelector((q) => {
  const tradeType = q(selectTradeboxTradeType);
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  return tradeFlags;
});

export const selectIndexTokenStats = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  const stats = q(selectIndexTokenStatsMap);

  return stats.sortedByTotalPoolValue.map((address) => stats.indexMap[address]!);
});

const FALLBACK: ReturnType<typeof marketsInfoData2IndexTokenStatsMap> = {
  indexMap: {},
  sortedByTotalPoolValue: [],
};

export const selectIndexTokenStatsMap = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return FALLBACK;
  }

  return marketsInfoData2IndexTokenStatsMap(marketsInfoData);
});

export const selectSelectedMarketPriceDecimals = createSelector((q) => {
  const { chartToken } = q(selectChartToken);

  if (!chartToken) {
    return 2;
  }

  return calculateDisplayDecimals(chartToken.prices.minPrice);
});

export const makeSelectMarketPriceDecimals = createSelectorFactory((tokenAddress?: string) =>
  createSelector(function selectSelectedMarketPriceDecimals(q) {
    const tokensData = q(selectTokensData);
    const token = getByKey(tokensData, tokenAddress);
    const { isSwap } = q(selectTradeboxTradeFlags);

    if (!token) {
      return;
    }

    const visualMultiplier = isSwap ? 1 : token.visualMultiplier;

    return calculateDisplayDecimals(token.prices.minPrice, undefined, visualMultiplier);
  })
);

export const selectMarketEdgeLiquidityGetter = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);
  if (!marketsInfoData) return undefined;
  return createMarketEdgeLiquidityGetter(marketsInfoData);
});

export const selectGasEstimationParams = createSelector((q) => {
  const gasLimits = q(selectGasLimits);
  if (!gasLimits) return undefined;

  const tokensData = q(selectTokensData);
  if (!tokensData) return undefined;

  const gasPrice = q(selectGasPrice);
  if (gasPrice === undefined) return undefined;

  return {
    gasLimits,
    tokensData,
    gasPrice,
  };
});

export const selectMarketAdjacencyGraph = isDevelopment()
  ? createSelector((q) => {
      const chainId = q(selectChainId);

      const debugSwapMarketsConfig = q(selectDebugSwapMarketsConfig);

      if (!debugSwapMarketsConfig?.disabledSwapMarkets?.length) {
        return getMarketAdjacencyGraph(chainId);
      }

      const disabledMarketAddresses = debugSwapMarketsConfig.disabledSwapMarkets;

      const strippedMarkets = Object.fromEntries(
        Object.entries(MARKETS[chainId]).filter(([marketAddress]) => !disabledMarketAddresses.includes(marketAddress))
      );

      return buildMarketsAdjacencyGraph(strippedMarkets);
    })
  : createSelector((q) => {
      const chainId = q(selectChainId);

      return getMarketAdjacencyGraph(chainId);
    });

const makeSelectWrappedFromAddress = (fromTokenAddress: string | undefined) =>
  createSelector((q) => {
    const chainId = q(selectChainId);
    const wrappedFromAddress = getWrappedAddress(chainId, fromTokenAddress);
    return wrappedFromAddress;
  });

const makeSelectWrappedToAddress = (toTokenAddress: string | undefined) => {
  return createSelector((q) => {
    const chainId = q(selectChainId);
    const wrappedToAddress = getWrappedAddress(chainId, toTokenAddress);
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
          ? getTokenSwapPathsForTokenPairPrebuilt(chainId, wrappedFromAddress, wrappedToAddress)
          : EMPTY_ARRAY;

      if (!marketsInfoData || !wrappedFromAddress || !wrappedToAddress) {
        return { maxLiquidity, maxLiquidityPath };
      }

      const marketAdjacencyGraph = q(selectMarketAdjacencyGraph);
      const marketEdgeLiquidityGetter = q(selectMarketEdgeLiquidityGetter);

      if (!marketEdgeLiquidityGetter) {
        return { maxLiquidity, maxLiquidityPath };
      }

      const maxLiquidityPathInfo = getMaxLiquidityMarketSwapPathFromTokenSwapPaths({
        graph: marketAdjacencyGraph,
        tokenSwapPaths: tokenSwapRoutes,
        tokenInAddress: wrappedFromAddress,
        tokenOutAddress: wrappedToAddress,
        getLiquidity: marketEdgeLiquidityGetter,
      });

      if (maxLiquidityPathInfo) {
        maxLiquidity = maxLiquidityPathInfo.liquidity;
        maxLiquidityPath = maxLiquidityPathInfo.path;
      }

      return { maxLiquidity, maxLiquidityPath };
    });
  }
);

export const selectRelayFeeTokens = createSelector((q) => {
  const relayerFeeToken = q(selectRelayerFeeToken);
  const gasPaymentToken = q(selectGasPaymentToken);
  const findSwapPath = q(makeSelectFindSwapPath(gasPaymentToken?.address, relayerFeeToken?.address, true));

  return { relayerFeeToken, gasPaymentToken, findSwapPath };
});

const ENABLE_DEBUG_SWAP_MARKETS_CONFIG = isDevelopment();
export const makeSelectFindSwapPath = createSelectorFactory(
  (fromTokenAddress: string | undefined, toTokenAddress: string | undefined, isExpressOrders = false) => {
    return createSelector((q) => {
      const chainId = q(selectChainId);
      const marketsInfoData = q(selectMarketsInfoData);
      const gasEstimationParams = q(selectGasEstimationParams);

      const _debugSwapMarketsConfig = ENABLE_DEBUG_SWAP_MARKETS_CONFIG ? q(selectDebugSwapMarketsConfig) : undefined;

      const findSwapPath = createFindSwapPath({
        chainId,
        fromTokenAddress,
        toTokenAddress,
        marketsInfoData,
        isExpressTxn: Boolean(isExpressOrders),
        disabledMarkets: _debugSwapMarketsConfig?.disabledSwapMarkets,
        manualPath: _debugSwapMarketsConfig?.manualPath,
        gasEstimationParams,
      });
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
    externalSwapQuote,
    isExpressTxn,
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
    isExpressTxn: boolean;
    externalSwapQuote: ExternalSwapQuote | undefined;
  }) => {
    const selectFindSwapPath = makeSelectFindSwapPath(
      initialCollateralTokenAddress,
      tokenTypeForSwapRoute === "indexToken" ? indexTokenAddress : collateralTokenAddress,
      isExpressTxn
    );

    return createSelector((q) => {
      const indexToken = q((state) => getByKey(selectTokensData(state), indexTokenAddress));
      const initialCollateralToken = q((state) => getByKey(selectTokensData(state), initialCollateralTokenAddress));
      const collateralToken = q((state) => getByKey(selectTokensData(state), collateralTokenAddress));
      const marketInfo = q((state) => getByKey(selectMarketsInfoData(state), marketAddress));
      const position = q((state) => getByKey(selectPositionsInfoData(state), positionKey));

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
    isExpressTxn,
    externalSwapQuote,
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
    isExpressTxn: boolean;
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
          isExpressTxn,
          externalSwapQuote,
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

        if (tradeFlags.isIncrease && increaseAmounts?.acceptablePrice !== undefined && initialCollateralAmount > 0) {
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

/**
 * Returns 1 if swap or no visual multiplier
 */
export const selectSelectedMarketVisualMultiplier = createSelector((q) => {
  const { symbol } = q(selectChartToken);

  if (!symbol) {
    return 1;
  }

  const chainId = q(selectChainId);
  const token = getTokenBySymbolSafe(chainId, symbol);

  if (!token) {
    return 1;
  }

  const { isSwap } = q(selectTradeboxTradeFlags);

  if (!token.visualMultiplier || isSwap) {
    return 1;
  }

  return token.visualMultiplier;
});
