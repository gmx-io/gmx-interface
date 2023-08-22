import { t } from "@lingui/macro";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { Order, OrderInfo, OrderType, PositionOrderInfo, SwapOrderInfo } from "./types";
import { PositionInfo, parsePositionKey } from "../positions";
import { MarketsInfoData } from "../markets";
import { getSwapPathOutputAddresses, getSwapPathStats, getTriggerThresholdType } from "../trade";
import { TokensData, convertToTokenAmount, convertToUsd, getTokensRatioByAmounts, parseContractPrice } from "../tokens";
import { getByKey } from "lib/objects";
import { getPositionKey } from "lib/legacy";

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

export function getOrderInfo(
  marketsInfoData: MarketsInfoData,
  tokensData: TokensData,
  wrappedNativeToken: Token,
  order: Order
) {
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

    return orderInfo;
  }
}

export function getOrderError(order: OrderInfo, position?: PositionInfo) {
  const positionKey = getPositionKey(
    order.account,
    order.marketAddress,
    order.initialCollateralTokenAddress,
    order.isLong
  );
  const errorMessage = t`Order Trigger Price is beyond position's Liquidation Price.`;

  if (isOrderForPosition(order, positionKey) && isDecreaseOrderType(order.orderType)) {
    if (position?.isLong) {
      if (position.liquidationPrice?.gt(order.triggerPrice)) {
        return errorMessage;
      }
    } else {
      if (position?.liquidationPrice?.lt(order.triggerPrice)) {
        return errorMessage;
      }
    }
  }
}
