import { t } from "@lingui/macro";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { formatPercentage, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getFeeItem, getIsHighPriceImpact, getPriceImpactByAcceptablePrice } from "../fees";
import { MarketsInfoData, getAvailableUsdLiquidityForPosition } from "../markets";
import { PositionsInfoData, parsePositionKey } from "../positions";
import { TokensData, convertToTokenAmount, convertToUsd, getTokensRatioByAmounts, parseContractPrice } from "../tokens";
import {
  getAcceptablePriceInfo,
  getMaxSwapPathLiquidity,
  getSwapPathOutputAddresses,
  getSwapPathStats,
  getTriggerThresholdType,
} from "../trade";
import { Order, OrderError, OrderInfo, OrderType, PositionOrderInfo, SwapOrderInfo } from "./types";

export function isVisibleOrder(orderType: OrderType) {
  return isLimitOrderType(orderType) || isTriggerDecreaseOrderType(orderType) || isLimitSwapOrderType(orderType);
}

export function isOrderForPosition(order: OrderInfo, positionKey: string): order is PositionOrderInfo {
  const { account, marketAddress, collateralAddress, isLong } = parsePositionKey(positionKey);

  let isMatch =
    !isSwapOrderType(order.orderType) &&
    order.account === account &&
    order.marketAddress === marketAddress &&
    order.isLong === isLong;

  // For limit orders, we need to check the target collateral token
  if (isLimitOrderType(order.orderType)) {
    const targetCollateralTokenAddress = order.targetCollateralToken.isNative
      ? order.targetCollateralToken.wrappedAddress
      : order.targetCollateralToken.address;
    isMatch = isMatch && targetCollateralTokenAddress === collateralAddress;
  } else if (isTriggerDecreaseOrderType(order.orderType)) {
    isMatch = isMatch && order.initialCollateralTokenAddress === collateralAddress;
  }

  return isMatch;
}

export function isMarketOrderType(orderType: OrderType) {
  return [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(orderType);
}

export function isLimitOrderType(orderType: OrderType) {
  return [OrderType.LimitIncrease, OrderType.LimitSwap].includes(orderType);
}

export function isTriggerDecreaseOrderType(orderType: OrderType) {
  return [OrderType.LimitDecrease, OrderType.StopLossDecrease].includes(orderType);
}

export function isDecreaseOrderType(orderType: OrderType) {
  return [OrderType.MarketDecrease, OrderType.LimitDecrease, OrderType.StopLossDecrease].includes(orderType);
}

export function isIncreaseOrderType(orderType: OrderType) {
  return [OrderType.MarketIncrease, OrderType.LimitIncrease].includes(orderType);
}

export function isSwapOrderType(orderType: OrderType) {
  return [OrderType.MarketSwap, OrderType.LimitSwap].includes(orderType);
}

export function isLimitSwapOrderType(orderType: OrderType) {
  return orderType === OrderType.LimitSwap;
}

export function isLiquidationOrderType(orderType: OrderType) {
  return orderType === OrderType.Liquidation;
}

export function getSwapOrderTitle(p: {
  initialCollateralToken: Token;
  targetCollateralToken: Token;
  initialCollateralAmount: BigNumber;
  minOutputAmount: BigNumber;
}) {
  const { initialCollateralToken, initialCollateralAmount, targetCollateralToken, minOutputAmount } = p;

  const fromTokenText = formatTokenAmount(
    initialCollateralAmount,
    initialCollateralToken.decimals,
    initialCollateralToken.symbol
  );

  const toTokenText = formatTokenAmount(minOutputAmount, targetCollateralToken.decimals, targetCollateralToken.symbol);

  return t`Swap ${fromTokenText} for ${toTokenText}`;
}

export function getPositionOrderTitle(p: {
  orderType: OrderType;
  isLong: boolean;
  indexToken: Token;
  sizeDeltaUsd: BigNumber;
}) {
  const { orderType, isLong, indexToken, sizeDeltaUsd } = p;

  const longShortText = isLong ? t`Long` : t`Short`;
  const tokenText = `${indexToken.symbol} ${longShortText}`;
  const sizeText = formatUsd(sizeDeltaUsd);
  const increaseOrDecreaseText = isIncreaseOrderType(orderType) ? t`Increase` : t`Decrease`;

  return t`${increaseOrDecreaseText} ${tokenText} by ${sizeText}`;
}

export function getOrderTypeLabel(orderType: OrderType) {
  const orderTypeLabels = {
    [OrderType.MarketSwap]: t`Market Swap`,
    [OrderType.LimitSwap]: t`Limit Swap`,
    [OrderType.MarketIncrease]: t`Market Increase`,
    [OrderType.LimitIncrease]: t`Limit Increase`,
    [OrderType.MarketDecrease]: t`Market Decrease`,
    [OrderType.LimitDecrease]: t`Limit Decrease`,
    [OrderType.StopLossDecrease]: t`Stop Loss Decrease`,
  };

  return orderTypeLabels[orderType];
}

export function getOrderInfo(p: {
  marketsInfoData: MarketsInfoData;
  positionsInfoData?: PositionsInfoData;
  tokensData: TokensData;
  wrappedNativeToken: Token;
  order: Order;
}) {
  const { marketsInfoData, positionsInfoData, tokensData, wrappedNativeToken, order } = p;

  if (isSwapOrderType(order.orderType)) {
    const initialCollateralToken = getByKey(tokensData, order.initialCollateralTokenAddress);
    const { outTokenAddress } = getSwapPathOutputAddresses({
      marketsInfoData,
      swapPath: order.swapPath,
      initialCollateralAddress: order.initialCollateralTokenAddress,
      wrappedNativeTokenAddress: wrappedNativeToken.address,
      shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
    });

    const targetCollateralToken = getByKey(tokensData, outTokenAddress);

    if (!initialCollateralToken || !targetCollateralToken) {
      return undefined;
    }

    const swapPathStats = getSwapPathStats({
      marketsInfoData,
      swapPath: order.swapPath,
      initialCollateralAddress: order.initialCollateralTokenAddress,
      wrappedNativeTokenAddress: wrappedNativeToken.address,
      usdIn: convertToUsd(
        order.initialCollateralDeltaAmount,
        initialCollateralToken.decimals,
        initialCollateralToken.prices.minPrice
      )!,
      shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
      shouldApplyPriceImpact: true,
    });

    const priceImpactAmount = convertToTokenAmount(
      swapPathStats?.totalSwapPriceImpactDeltaUsd,
      targetCollateralToken.decimals,
      targetCollateralToken.prices.minPrice
    );

    const swapFeeAmount = convertToTokenAmount(
      swapPathStats?.totalSwapFeeUsd,
      targetCollateralToken.decimals,
      targetCollateralToken.prices.minPrice
    );

    const toAmount = order.minOutputAmount.sub(priceImpactAmount || 0).add(swapFeeAmount || 0);

    const triggerRatio = getTokensRatioByAmounts({
      fromToken: initialCollateralToken,
      toToken: targetCollateralToken,
      fromTokenAmount: order.initialCollateralDeltaAmount,
      toTokenAmount: toAmount,
    });

    const title = getSwapOrderTitle({
      initialCollateralToken,
      targetCollateralToken,
      minOutputAmount: order.minOutputAmount,
      initialCollateralAmount: order.initialCollateralDeltaAmount,
    });

    const orderInfo: SwapOrderInfo = {
      ...order,
      errors: [],
      swapPathStats,
      triggerRatio,
      title,
      initialCollateralToken,
      targetCollateralToken,
    };

    const { errors, level } = getOrderErrors({
      order: orderInfo,
      positionsInfoData,
      marketsInfoData,
    });

    orderInfo.errors = errors;
    orderInfo.errorLevel = level;

    return orderInfo;
  } else {
    const marketInfo = getByKey(marketsInfoData, order.marketAddress);
    const indexToken = marketInfo?.indexToken;

    const initialCollateralToken = getByKey(tokensData, order.initialCollateralTokenAddress);
    const { outTokenAddress } = getSwapPathOutputAddresses({
      marketsInfoData,
      swapPath: order.swapPath,
      initialCollateralAddress: order.initialCollateralTokenAddress,
      wrappedNativeTokenAddress: wrappedNativeToken.address,
      shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
    });

    const targetCollateralToken = getByKey(tokensData, outTokenAddress);

    if (!marketInfo || !indexToken || !initialCollateralToken || !targetCollateralToken) {
      return undefined;
    }

    const title = getPositionOrderTitle({
      orderType: order.orderType,
      isLong: order.isLong,
      indexToken,
      sizeDeltaUsd: order.sizeDeltaUsd,
    });

    const acceptablePrice = parseContractPrice(order.contractAcceptablePrice, indexToken.decimals);
    const triggerPrice = parseContractPrice(order.contractTriggerPrice, indexToken.decimals);

    const swapPathStats = getSwapPathStats({
      marketsInfoData,
      swapPath: order.swapPath,
      initialCollateralAddress: order.initialCollateralTokenAddress,
      wrappedNativeTokenAddress: wrappedNativeToken.address,
      usdIn: convertToUsd(
        order.initialCollateralDeltaAmount,
        initialCollateralToken.decimals,
        initialCollateralToken.prices.minPrice
      )!,
      shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
      shouldApplyPriceImpact: true,
    });

    const triggerThresholdType = getTriggerThresholdType(order.orderType, order.isLong);

    const orderInfo: PositionOrderInfo = {
      ...order,
      title,
      errors: [],
      swapPathStats,
      marketInfo,
      indexToken,
      initialCollateralToken,
      targetCollateralToken,
      acceptablePrice,
      triggerPrice,
      triggerThresholdType,
    };

    const { errors, level } = getOrderErrors({
      order: orderInfo,
      positionsInfoData,
      marketsInfoData,
    });

    orderInfo.errors = errors;
    orderInfo.errorLevel = level;

    return orderInfo;
  }
}

export function getOrderErrors(p: {
  order: OrderInfo;
  marketsInfoData: MarketsInfoData;
  positionsInfoData: PositionsInfoData | undefined;
}): { errors: OrderError[]; level: "error" | "warning" | undefined } {
  const { order, positionsInfoData, marketsInfoData } = p;

  const errors: OrderError[] = [];

  if (isSwapOrderType(order.orderType)) {
    const swapPathLiquidity = getMaxSwapPathLiquidity({
      marketsInfoData,
      swapPath: order.swapPath,
      initialCollateralAddress: order.initialCollateralTokenAddress,
    });

    const minOutputUsd = convertToUsd(
      order.minOutputAmount,
      order.targetCollateralToken.decimals,
      order.targetCollateralToken.prices.maxPrice
    )!;

    if (swapPathLiquidity.lt(minOutputUsd)) {
      errors.push({
        msg: t`There may not be sufficient liquidity to execute the Swap when the Min. Receive conditions are met.`,
        level: "error",
      });
    }

    const swapImpactFeeItem = getFeeItem(
      order.swapPathStats?.totalSwapPriceImpactDeltaUsd,
      convertToUsd(
        order.initialCollateralDeltaAmount,
        order.initialCollateralToken.decimals,
        order.initialCollateralToken.prices.maxPrice
      )
    );

    if (getIsHighPriceImpact(undefined, swapImpactFeeItem)) {
      errors.push({
        msg: t`Currently, There is a high Swap Price Impact for the Order Swap path.`,
        level: "warning",
      });
    }
  }

  const positionOrder = order as PositionOrderInfo;

  const position = Object.values(positionsInfoData || {}).find((pos) => isOrderForPosition(positionOrder, pos.key));

  if ([OrderType.LimitDecrease, OrderType.LimitIncrease].includes(positionOrder.orderType)) {
    const { acceptablePriceDeltaBps: currentAcceptablePriceDeltaBps } = getAcceptablePriceInfo({
      marketInfo: positionOrder.marketInfo,
      isIncrease: isIncreaseOrderType(positionOrder.orderType),
      isLong: positionOrder.isLong,
      indexPrice: positionOrder.triggerPrice,
      sizeDeltaUsd: positionOrder.sizeDeltaUsd,
    });

    const { acceptablePriceDeltaBps: orderAcceptablePriceDeltaBps } = getPriceImpactByAcceptablePrice({
      sizeDeltaUsd: positionOrder.sizeDeltaUsd,
      isIncrease: isIncreaseOrderType(positionOrder.orderType),
      isLong: positionOrder.isLong,
      indexPrice: positionOrder.triggerPrice,
      acceptablePrice: positionOrder.acceptablePrice,
    });

    if (currentAcceptablePriceDeltaBps.lt(0) && currentAcceptablePriceDeltaBps.lt(orderAcceptablePriceDeltaBps)) {
      const priceText = positionOrder.orderType === OrderType.LimitIncrease ? t`limit price` : t`trigger price`;
      const formattedCurrentAcceptablePriceImpact = formatPercentage(currentAcceptablePriceDeltaBps, { signed: true });
      const formattedOrderAcceptablePriceImpact = formatPercentage(orderAcceptablePriceDeltaBps, {
        signed: true,
      });

      errors.push({
        msg: t`The order may not execute at the desired ${priceText} as its acceptable price impact is set to ${formattedOrderAcceptablePriceImpact}, which is lower than the current market price impact of ${formattedCurrentAcceptablePriceImpact}. It can be edited using the "Edit" button.`,
        level: "warning",
      });
    }
  }

  if (positionOrder.orderType === OrderType.LimitIncrease) {
    const currentLiquidity = getAvailableUsdLiquidityForPosition(positionOrder.marketInfo, positionOrder.isLong);

    if (currentLiquidity.lt(positionOrder.sizeDeltaUsd)) {
      errors.push({
        msg: t`There may not be sufficient liquidity to execute your Order when the Price conditions are met.`,
        level: "error",
      });
    }

    if (positionOrder.swapPathStats?.swapPath.length) {
      const swapPathLiquidity = getMaxSwapPathLiquidity({
        marketsInfoData,
        swapPath: positionOrder.swapPath,
        initialCollateralAddress: positionOrder.initialCollateralTokenAddress,
      });

      const collateralSwapUsd = convertToUsd(
        order.initialCollateralDeltaAmount,
        order.initialCollateralToken.decimals,
        order.initialCollateralToken.prices.maxPrice
      )!;

      if (swapPathLiquidity.lt(collateralSwapUsd)) {
        errors.push({
          msg: t`There may not be sufficient liquidity to execute the Pay Token to Collateral Token swap when the Price conditions are met.`,
          level: "error",
        });
      }
    }
  }

  if (!position) {
    const collateralSymbol = order.targetCollateralToken.symbol;
    const sameMarketPosition = Object.values(positionsInfoData || {}).find(
      (pos) => pos.marketAddress === order.marketAddress && pos.isLong === order.isLong
    );

    const symbol = sameMarketPosition?.collateralToken.symbol;
    const longText = sameMarketPosition?.isLong ? t`long` : t`short`;

    if (sameMarketPosition) {
      errors.push({
        msg: t`This order using ${collateralSymbol} as collateral will not be valid for the existing ${longText} position using ${symbol} as collateral.`,
        level: "warning",
      });
    }
  }

  if (isDecreaseOrderType(order.orderType) && position) {
    const triggerPrice = (order as PositionOrderInfo).triggerPrice;

    const isInvalidTriggerPrice = position.isLong
      ? position.liquidationPrice?.gt(triggerPrice)
      : position.liquidationPrice?.lt(triggerPrice);

    if (isInvalidTriggerPrice) {
      errors.push({
        msg: t`The order will not be executed as its trigger price is beyond the position's liquidation price.`,
        level: "error",
      });
    }

    if (order.swapPath.length) {
      const swapPathLiquidity = getMaxSwapPathLiquidity({
        marketsInfoData,
        swapPath: positionOrder.swapPath,
        initialCollateralAddress: positionOrder.initialCollateralTokenAddress,
      });

      const minOutputUsd = convertToUsd(
        order.minOutputAmount,
        order.targetCollateralToken.decimals,
        order.targetCollateralToken.prices.maxPrice
      )!;

      if (swapPathLiquidity.lt(minOutputUsd)) {
        errors.push({
          msg: t`There may not be sufficient liquidity to execute swap to Receive Token when the Price conditions are met.`,
          level: "error",
        });
      }
    }
  }

  const errorsLevelPriority = {
    error: 1,
    warning: 2,
  };

  let level: "error" | "warning" | undefined = undefined;
  if (errors.some((err) => err.level === "error")) {
    level = "error";
  } else if (errors.some((err) => err.level === "warning")) {
    level = "warning";
  }

  return {
    errors: errors.sort((a, b) => {
      return errorsLevelPriority[a.level] - errorsLevelPriority[b.level];
    }),
    level,
  };
}

function getTokenIndex(token: Token, referenceArray: string[]): number {
  return referenceArray.indexOf(
    token.wrappedAddress && referenceArray.includes(token.wrappedAddress) ? token.wrappedAddress : token.address
  );
}

export function sortPositionOrders(orders: PositionOrderInfo[], tokenSortOrder?: string[]): PositionOrderInfo[] {
  return orders.sort((a, b) => {
    if (tokenSortOrder) {
      const indexA = getTokenIndex(a.marketInfo.indexToken, tokenSortOrder);
      const indexB = getTokenIndex(b.marketInfo.indexToken, tokenSortOrder);
      if (indexA !== indexB) return indexA - indexB;
    } else {
      const nameComparison = a.marketInfo.name.localeCompare(b.marketInfo.name);
      if (nameComparison) return nameComparison;
    }

    // Compare by trigger price
    const triggerPriceComparison = a.triggerPrice.sub(b.triggerPrice);
    if (!triggerPriceComparison.isZero()) return triggerPriceComparison.isNegative() ? -1 : 1;

    // Compare by order type
    const orderTypeComparison = a.orderType - b.orderType;
    if (orderTypeComparison) return orderTypeComparison;

    // Finally, sort by size delta USD
    return b.sizeDeltaUsd.sub(a.sizeDeltaUsd).isNegative() ? -1 : 1;
  });
}

export function sortSwapOrders(orders: SwapOrderInfo[], tokenSortOrder?: string[]): SwapOrderInfo[] {
  return orders.sort((a, b) => {
    if (tokenSortOrder) {
      const indexA = getTokenIndex(a.targetCollateralToken, tokenSortOrder);
      const indexB = getTokenIndex(b.targetCollateralToken, tokenSortOrder);
      if (indexA !== indexB) return indexA - indexB;
    } else {
      const collateralComparison = a.targetCollateralToken.symbol.localeCompare(b.targetCollateralToken.symbol);
      if (collateralComparison) return collateralComparison;
    }

    return a.minOutputAmount.sub(b.minOutputAmount).isNegative() ? -1 : 1;
  });
}
