import { t } from "@lingui/macro";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getFeeItem, getIsHighPriceImpact, getPriceImpactByAcceptablePrice } from "../fees";
import { MarketsInfoData, getAvailableUsdLiquidityForPosition } from "../markets";
import { PositionInfo, PositionsInfoData, parsePositionKey } from "../positions";
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
    isMatch = isMatch && order.targetCollateralToken.address === collateralAddress;
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
      swapPathStats,
      triggerRatio,
      title,
      initialCollateralToken,
      targetCollateralToken,
    };

    orderInfo.error = getOrderError({
      order: orderInfo,
      positionsInfoData,
      marketsInfoData,
    });

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
      swapPathStats,
      marketInfo,
      indexToken,
      initialCollateralToken,
      targetCollateralToken,
      acceptablePrice,
      triggerPrice,
      triggerThresholdType,
    };

    orderInfo.error = getOrderError({
      order: orderInfo,
      positionsInfoData,
      marketsInfoData,
    });

    return orderInfo;
  }
}

export function getOrderError(p: {
  order: OrderInfo;
  positionsInfoData?: PositionsInfoData;
  marketsInfoData: MarketsInfoData;
  positionInfo?: PositionInfo;
}): OrderError | undefined {
  const { order, positionsInfoData, positionInfo, marketsInfoData } = p;

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
      return {
        msg: t`There may not be sufficient liquidity to execute the Swap when the Min. Receive conditions are met.`,
        level: "error",
      };
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
      return {
        msg: t`There is a high Swap Price Impact for the Order Swap path.`,
        level: "warning",
      };
    }

    return;
  }

  const _order = order as PositionOrderInfo;

  let position = positionInfo;
  if (!position) {
    position = Object.values(positionsInfoData || {}).find((pos) => isOrderForPosition(_order, pos.key));
  }

  if ([OrderType.LimitDecrease, OrderType.LimitIncrease].includes(_order.orderType)) {
    const { acceptablePriceDeltaBps: currentAcceptablePriceDeltaBps } = getAcceptablePriceInfo({
      marketInfo: _order.marketInfo,
      isIncrease: isIncreaseOrderType(_order.orderType),
      isLong: _order.isLong,
      indexPrice: _order.triggerPrice,
      sizeDeltaUsd: _order.sizeDeltaUsd,
    });

    const { acceptablePriceDeltaBps: orderAcceptablePriceDeltaBps } = getPriceImpactByAcceptablePrice({
      sizeDeltaUsd: _order.sizeDeltaUsd,
      isIncrease: isIncreaseOrderType(_order.orderType),
      isLong: _order.isLong,
      indexPrice: _order.triggerPrice,
      acceptablePrice: _order.acceptablePrice,
    });

    if (currentAcceptablePriceDeltaBps.lt(0) && currentAcceptablePriceDeltaBps.lt(orderAcceptablePriceDeltaBps)) {
      const priceText = _order.orderType === OrderType.LimitIncrease ? t`Limit Price` : t`Trigger Price`;
      const suggestionType = _order.orderType === OrderType.LimitIncrease ? t`Limit` : t`Take-Profit`;

      return {
        msg: t`The Order may not execute at the desired ${priceText} as the current Price Impact is higher than its Acceptable Price Impact. Consider canceling and creating a new ${suggestionType} Order.`,
        level: "warning",
      };
    }
  }

  if (_order.orderType === OrderType.LimitIncrease) {
    const currentLiquidity = getAvailableUsdLiquidityForPosition(_order.marketInfo, _order.isLong);

    if (currentLiquidity.lt(_order.sizeDeltaUsd)) {
      return {
        msg: t`There may not be sufficient liquidity to execute your Order when the Price conditions are met.`,
        level: "error",
      };
    }

    if (_order.swapPathStats?.swapPath.length) {
      const swapPathLiquidity = getMaxSwapPathLiquidity({
        marketsInfoData,
        swapPath: _order.swapPath,
        initialCollateralAddress: _order.initialCollateralTokenAddress,
      });

      const minOutputUsd = convertToUsd(
        order.minOutputAmount,
        order.targetCollateralToken.decimals,
        order.targetCollateralToken.prices.maxPrice
      )!;

      if (swapPathLiquidity.lt(minOutputUsd)) {
        return {
          msg: t`There may not be sufficient liquidity to execute the Pay Token to Collateral Token swap when the Price conditions are met.`,
          level: "error",
        };
      }
    }
  }

  if (!position) {
    const sameMarketPosition = Object.values(positionsInfoData || {}).find(
      (pos) => pos.marketAddress === order.marketAddress && pos.isLong === order.isLong
    );

    if (sameMarketPosition) {
      return {
        msg: t`You have an existing position with ${sameMarketPosition?.collateralToken.symbol} as Collateral.`,
        level: "warning",
      };
    }
  }

  if (isDecreaseOrderType(order.orderType)) {
    const liqPriceError: OrderError = {
      msg: t`Order Trigger Price is beyond position's Liquidation Price.`,
      level: "error",
    };

    const triggerPrice = (order as PositionOrderInfo).triggerPrice;

    if (position?.isLong) {
      if (position.liquidationPrice?.gt(triggerPrice)) {
        return liqPriceError;
      }
    } else {
      if (position?.liquidationPrice?.lt(triggerPrice)) {
        return liqPriceError;
      }
    }

    if (order.swapPath.length) {
      const swapPathLiquidity = getMaxSwapPathLiquidity({
        marketsInfoData,
        swapPath: _order.swapPath,
        initialCollateralAddress: _order.initialCollateralTokenAddress,
      });

      const minOutputUsd = convertToUsd(
        order.minOutputAmount,
        order.targetCollateralToken.decimals,
        order.targetCollateralToken.prices.maxPrice
      )!;

      if (swapPathLiquidity.lt(minOutputUsd)) {
        return {
          msg: t`There may not be sufficient liquidity to execute swap to Receive Token when the Price conditions are met.`,
          level: "error",
        };
      }
    }

    return;
  }
}
