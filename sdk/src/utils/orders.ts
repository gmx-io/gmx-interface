import { BASIS_POINTS_DIVISOR_BIGINT, DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS } from "configs/factors";
import { MarketsInfoData } from "types/markets";
import {
  Order,
  OrderInfo,
  OrderParams,
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  TwapOrderInfo,
} from "types/orders";
import { Token, TokensData } from "types/tokens";
import { getSwapPathOutputAddresses, getSwapPathStats } from "utils/swap/swapStats";

import { bigMath } from "./bigmath";
import { getByKey } from "./objects";
import { parsePositionKey } from "./positions";
import { getOrderThresholdType } from "./prices";
import {
  convertToTokenAmount,
  convertToUsd,
  getTokensRatioByAmounts,
  getTokensRatioByMinOutputAmountAndTriggerPrice,
  parseContractPrice,
} from "./tokens";

export function isMarketOrderType(orderType: OrderType) {
  return [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(orderType);
}

export function isLimitOrderType(orderType: OrderType) {
  return [OrderType.LimitIncrease, OrderType.LimitSwap, OrderType.StopIncrease].includes(orderType);
}

export function isTriggerDecreaseOrderType(orderType: OrderType) {
  return [OrderType.LimitDecrease, OrderType.StopLossDecrease].includes(orderType);
}

export function isDecreaseOrderType(orderType: OrderType) {
  return [OrderType.MarketDecrease, OrderType.LimitDecrease, OrderType.StopLossDecrease].includes(orderType);
}

export function isIncreaseOrderType(orderType: OrderType) {
  return [OrderType.MarketIncrease, OrderType.LimitIncrease, OrderType.StopIncrease].includes(orderType);
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

export function isStopLossOrderType(orderType: OrderType) {
  return orderType === OrderType.StopLossDecrease;
}

export function isLimitDecreaseOrderType(orderType: OrderType) {
  return orderType === OrderType.LimitDecrease;
}

export function isLimitIncreaseOrderType(orderType: OrderType) {
  return orderType === OrderType.LimitIncrease;
}

export function isStopIncreaseOrderType(orderType: OrderType) {
  return orderType === OrderType.StopIncrease;
}

export function isTwapOrder<T extends OrderParams>(orderInfo: T): orderInfo is Extract<T, { isTwap: true }> {
  return orderInfo.isTwap;
}

export function isTwapSwapOrder(orderInfo: OrderInfo): orderInfo is TwapOrderInfo<SwapOrderInfo> {
  return orderInfo.isTwap && orderInfo.__orderInfoType === "swap";
}

export function isTwapPositionOrder(orderInfo: OrderInfo): orderInfo is TwapOrderInfo<PositionOrderInfo> {
  return orderInfo.isTwap && orderInfo.__orderInfoType === "position";
}

export function isSwapOrder(orderInfo: OrderInfo): orderInfo is SwapOrderInfo {
  return orderInfo.__orderInfoType === "swap";
}

export function isPositionOrder(orderInfo: OrderInfo): orderInfo is PositionOrderInfo {
  return orderInfo.__orderInfoType === "position";
}

export function getOrderInfo(p: {
  marketsInfoData: MarketsInfoData;
  tokensData: TokensData;
  wrappedNativeToken: Token;
  order: Order;
}) {
  const { marketsInfoData, tokensData, wrappedNativeToken, order } = p;

  if (isSwapOrderType(order.orderType)) {
    const initialCollateralToken = getByKey(tokensData, order.initialCollateralTokenAddress);
    const { outTokenAddress } = getSwapPathOutputAddresses({
      marketsInfoData,
      swapPath: order.swapPath,
      initialCollateralAddress: order.initialCollateralTokenAddress,
      wrappedNativeTokenAddress: wrappedNativeToken.address,
      shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
      isIncrease: false,
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

    let toAmount;
    let triggerRatio;

    const isLimitSwapOrder = isLimitSwapOrderType(order.orderType);

    if (isLimitSwapOrder) {
      if (order.contractTriggerPrice === 0n) {
        /**
         * If not stored trigger price in contract, we use the min output amount with default slippage
         * @see https://app.asana.com/0/1207525044994982/1209109731071143
         */
        toAmount =
          order.minOutputAmount -
          bigMath.mulDiv(order.minOutputAmount, DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS, BASIS_POINTS_DIVISOR_BIGINT);
      }
      triggerRatio = getTokensRatioByMinOutputAmountAndTriggerPrice({
        fromToken: initialCollateralToken,
        toToken: targetCollateralToken,
        fromTokenAmount: order.initialCollateralDeltaAmount,
        toTokenAmount: toAmount,
        triggerPrice: order.contractTriggerPrice,
        minOutputAmount: order.minOutputAmount,
      });
    } else {
      toAmount = order.minOutputAmount - (priceImpactAmount ?? 0n) + (swapFeeAmount ?? 0n);
      triggerRatio = getTokensRatioByAmounts({
        fromToken: initialCollateralToken,
        toToken: targetCollateralToken,
        fromTokenAmount: order.initialCollateralDeltaAmount,
        toTokenAmount: toAmount,
      });
    }

    const orderInfo: SwapOrderInfo = {
      ...order,
      swapPathStats,
      triggerRatio,
      initialCollateralToken,
      targetCollateralToken,
      __orderInfoType: "swap",
      isTwap: false,
    };

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
      isIncrease: isIncreaseOrderType(order.orderType),
    });

    const targetCollateralToken = getByKey(tokensData, outTokenAddress);

    if (!marketInfo || !indexToken || !initialCollateralToken || !targetCollateralToken) {
      return undefined;
    }

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

    const triggerThresholdType = getOrderThresholdType(order.orderType, order.isLong);

    const orderInfo: PositionOrderInfo = {
      ...order,
      swapPathStats,
      marketInfo,
      indexToken,
      initialCollateralToken,
      targetCollateralToken,
      acceptablePrice,
      triggerPrice,
      triggerThresholdType,
      __orderInfoType: "position",
      isTwap: false,
    };

    return orderInfo;
  }
}

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

export function isOrderForPositionByData(
  order: OrderInfo,
  {
    account,
    marketAddress,
    collateralAddress,
    isLong,
  }: {
    account: string;
    marketAddress: string;
    collateralAddress: string;
    isLong: boolean;
  }
): order is PositionOrderInfo {
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
