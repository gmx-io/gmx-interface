import { OrderType } from "domain/synthetics/orders";
import { getIsPositionInfoLoaded } from "domain/synthetics/positions";
import {
  FindSwapPath,
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
  getSwapPathComparator,
  getSwapPathStats,
  getTriggerDecreaseOrderType,
} from "domain/synthetics/trade";
import { getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { ExternalSwapQuote } from "sdk/types/trade";
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

export const selectSwapGraph = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);
  if (!marketsInfoData) return undefined;
  return getMarketsGraph(Object.values(marketsInfoData));
});

const selectSwapEstimator = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);
  if (!marketsInfoData) return undefined;
  return createSwapEstimator(marketsInfoData);
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

const makeSelectAllPaths = (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) => {
  const selectWrappedFromAddress = makeSelectWrappedFromAddress(fromTokenAddress);
  const selectWrappedToAddress = makeSelectWrappedToAddress(toTokenAddress);

  return createSelector((q) => {
    const marketsInfoData = q(selectMarketsInfoData);
    if (!marketsInfoData) return undefined;

    const graph = q(selectSwapGraph);
    const wrappedFromAddress = q(selectWrappedFromAddress);
    const wrappedToAddress = q(selectWrappedToAddress);
    const chainId = q(selectChainId);
    const wrappedToken = getWrappedToken(chainId);
    const isWrap = fromTokenAddress === NATIVE_TOKEN_ADDRESS && toTokenAddress === wrappedToken.address;
    const isUnwrap = fromTokenAddress === wrappedToken.address && toTokenAddress === NATIVE_TOKEN_ADDRESS;
    const isSameToken = fromTokenAddress === toTokenAddress;

    if (!graph || !wrappedFromAddress || !wrappedToAddress || isWrap || isUnwrap || isSameToken) {
      return undefined;
    }

    return findAllPaths(marketsInfoData, graph, wrappedFromAddress, wrappedToAddress)?.sort((a, b) =>
      b.liquidity - a.liquidity > 0 ? 1 : -1
    );
  });
};

export const makeSelectMaxLiquidityPath = createSelectorFactory(
  (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) => {
    const selectWrappedFromAddress = makeSelectWrappedFromAddress(fromTokenAddress);
    const selectAllPaths = makeSelectAllPaths(fromTokenAddress, toTokenAddress);

    return createSelector((q) => {
      let maxLiquidity = 0n;
      let maxLiquidityPath: string[] | undefined = undefined;
      const allPaths = q(selectAllPaths);
      const marketsInfoData = q(selectMarketsInfoData);
      const wrappedFromAddress = q(selectWrappedFromAddress);

      if (!allPaths || !marketsInfoData || !wrappedFromAddress) {
        return { maxLiquidity, maxLiquidityPath };
      }

      for (const route of allPaths) {
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
    });
  }
);

export const makeSelectFindSwapPath = createSelectorFactory(
  (fromTokenAddress: string | undefined, toTokenAddress: string | undefined) => {
    const selectAllPaths = makeSelectAllPaths(fromTokenAddress, toTokenAddress);

    return createSelector((q) => {
      const chainId = q(selectChainId);
      const marketsInfoData = q(selectMarketsInfoData);
      const wrappedToken = getWrappedToken(chainId);
      const allPaths = q(selectAllPaths);
      const estimator = q(selectSwapEstimator);

      const findSwapPath: FindSwapPath = (usdIn: bigint, opts: { order?: ("liquidity" | "length")[] }) => {
        if (!allPaths?.length || !estimator || !marketsInfoData || !fromTokenAddress) {
          return undefined;
        }

        let swapPath: string[] | undefined = undefined;
        const sortedPaths = opts.order ? [...allPaths].sort(getSwapPathComparator(opts.order ?? [])) : allPaths;

        if (opts.order) {
          swapPath = sortedPaths[0].path;
        } else {
          swapPath = getBestSwapPath(allPaths, usdIn, estimator);
        }

        if (!swapPath) {
          return undefined;
        }

        return getSwapPathStats({
          marketsInfoData,
          swapPath,
          initialCollateralAddress: fromTokenAddress,
          wrappedNativeTokenAddress: wrappedToken.address,
          shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
          shouldApplyPriceImpact: true,
          usdIn,
        });
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
  }) =>
    createSelector((q) => {
      const indexToken = q((state) => getByKey(selectTokensData(state), indexTokenAddress));
      const initialCollateralToken = q((state) => getByKey(selectTokensData(state), initialCollateralTokenAddress));
      const collateralToken = q((state) => getByKey(selectTokensData(state), collateralTokenAddress));
      const marketInfo = q((state) => getByKey(selectMarketsInfoData(state), marketAddress));
      const position = q((state) => getByKey(selectPositionsInfoData(state), positionKey));
      const externalSwapQuote = q(selectExternalSwapQuote);

      const acceptablePriceImpactBuffer = q(selectSavedAcceptablePriceImpactBuffer);
      const findSwapPath = q(
        makeSelectFindSwapPath(
          initialCollateralTokenAddress,
          tokenTypeForSwapRoute === "indexToken" ? indexTokenAddress : collateralTokenAddress
        )
      );
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
    })
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
