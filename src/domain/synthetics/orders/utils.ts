import { t } from "@lingui/macro";
import { MarketsInfoData } from "domain/synthetics/markets";
import { TokenData, TokenPrices, TokensData, getTokenData, parseContractPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { formatTokenAmount, formatUsd, getBasisPoints } from "lib/numbers";
import { AggregatedOrderData, AggregatedOrdersData, OrderType, OrdersData } from "./types";

export function getOrder(ordersData: OrdersData, orderKey?: string) {
  if (!orderKey) return undefined;

  return ordersData[orderKey];
}

export function getPositionOrders(
  ordersData: AggregatedOrdersData,
  marketAddress?: string,
  collateralToken?: string,
  isLong?: boolean
) {
  if (!marketAddress && !collateralToken && isLong === undefined) return [];

  return Object.values(ordersData).filter((order) => {
    if (isMarketOrder(order.orderType) || isSwapOrder(order.orderType)) return false;

    if (marketAddress && order.marketAddress !== marketAddress) return false;
    if (collateralToken && order.initialCollateralTokenAddress !== collateralToken) return false;
    if (isLong !== undefined && order.isLong !== isLong) return false;

    return true;
  });
}

export function isMarketOrder(orderType: OrderType) {
  return [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(orderType);
}

export function isLimitOrder(orderType: OrderType) {
  return [OrderType.LimitIncrease, OrderType.LimitSwap].includes(orderType);
}

export function isTriggerDecreaseOrder(orderType: OrderType) {
  return [OrderType.LimitDecrease, OrderType.StopLossDecrease].includes(orderType);
}

export function isDecreaseOrder(orderType: OrderType) {
  return [OrderType.MarketDecrease, OrderType.LimitDecrease, OrderType.StopLossDecrease].includes(orderType);
}

export function isIncreaseOrder(orderType: OrderType) {
  return [OrderType.MarketIncrease, OrderType.LimitIncrease].includes(orderType);
}

export function isSwapOrder(orderType: OrderType) {
  return [OrderType.MarketSwap, OrderType.LimitSwap].includes(orderType);
}

export function isLiquidationOrder(orderType: OrderType) {
  return orderType === OrderType.Liquidation;
}

export function getTriggerOrderType(p: { isLong: boolean; isTriggerAboveThreshold: boolean }) {
  if (p.isLong) {
    return p.isTriggerAboveThreshold ? OrderType.LimitDecrease : OrderType.StopLossDecrease;
  } else {
    return p.isTriggerAboveThreshold ? OrderType.LimitDecrease : OrderType.StopLossDecrease;
  }
}

export function getAggregatedOrderData(
  ordersData: OrdersData,
  marketsInfoData: MarketsInfoData,
  tokensData?: TokensData,
  orderKey?: string
): AggregatedOrderData | undefined {
  const order = getOrder(ordersData, orderKey);

  if (!order) return undefined;

  const isTriggerOrder = isLimitOrder(order?.orderType) || isTriggerDecreaseOrder(order?.orderType);

  if (!isTriggerOrder) return undefined;

  const market = marketsInfoData[order.marketAddress];
  const marketName = market.name;
  const indexToken = market.indexToken;
  const initialCollateralToken = getTokenData(tokensData, order.initialCollateralTokenAddress);

  const toCollateralAddress = getToTokenFromSwapPath(
    marketsInfoData,
    order.initialCollateralTokenAddress,
    order.swapPath
  );

  const toCollateralToken = getTokenData(tokensData, toCollateralAddress);

  const triggerPrice = indexToken ? parseContractPrice(order.contractTriggerPrice, indexToken.decimals) : undefined;
  const acceptablePrice = indexToken
    ? parseContractPrice(order.contractAcceptablePrice, indexToken.decimals)
    : undefined;

  const title = getOrderTitle({ ...order, indexToken, initialCollateralToken, toCollateralToken });

  return {
    ...order,
    title,
    toCollateralToken,
    market,
    marketName,
    indexToken,
    initialCollateralToken,
    triggerPrice,
    acceptablePrice,
  };
}

export function getToTokenFromSwapPath(
  marketsInfoData: MarketsInfoData,
  initialCollateral?: string,
  swapPath?: string[]
) {
  if (!initialCollateral || !swapPath) return undefined;

  if (swapPath.length === 0) return initialCollateral;

  const [firstMarketAddress, ...marketAddresses] = swapPath;

  const initialMarket = marketsInfoData[firstMarketAddress];

  if (!initialMarket) return undefined;

  let outTokenType: "long" | "short" = initialMarket.longTokenAddress === initialCollateral ? "short" : "long";
  let outToken = outTokenType === "long" ? initialMarket.longToken : initialMarket.shortToken;
  let outMarket = initialMarket;

  for (const marketAddress of marketAddresses) {
    outMarket = marketsInfoData[marketAddress];

    outTokenType = outMarket.longTokenAddress === outToken.address ? "short" : "long";
    outToken = outTokenType === "long" ? outMarket.longToken : outMarket.shortToken;
  }

  return outToken.address;
}

export function getOrderTitle(p: {
  orderType?: OrderType;
  isLong?: boolean;
  indexToken?: TokenData;
  initialCollateralToken?: TokenData;
  initialCollateralAmount?: BigNumber;
  toCollateralToken?: TokenData;
  sizeDeltaUsd?: BigNumber;
  minOutputAmount?: BigNumber;
}) {
  if (p.orderType === OrderType.LimitSwap) {
    const fromTokenText = formatTokenAmount(
      p.initialCollateralAmount,
      p.initialCollateralToken?.decimals,
      p.initialCollateralToken?.symbol
    );

    const toTokenText = formatTokenAmount(
      p.minOutputAmount,
      p.toCollateralToken?.decimals,
      p.toCollateralToken?.symbol
    );

    return t`Swap ${fromTokenText} for ${toTokenText}`;
  }

  const longShortText = p.isLong ? t`Long` : t`Short`;
  const tokenText = `${p.indexToken?.symbol} ${longShortText}`;
  const sizeText = formatUsd(p.sizeDeltaUsd);

  if (p.orderType === OrderType.LimitIncrease) {
    return t`Increase ${tokenText} by ${sizeText}`;
  }

  if (p.orderType === OrderType.LimitDecrease || p.orderType === OrderType.StopLossDecrease) {
    return t`Decrease ${tokenText} by ${sizeText}`;
  }
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

export function getMarkPriceForOrder(isIncrease?: boolean, isLong?: boolean, tokenPrices?: TokenPrices) {
  const maximisePrice = (isIncrease && isLong) || (!isIncrease && !isLong);

  return maximisePrice ? tokenPrices?.maxPrice : tokenPrices?.minPrice;
}

export function getTriggerPricePrefix(orderType?: OrderType, isLong?: boolean, asSign: boolean = true) {
  if (!orderType || typeof isLong === "undefined") return undefined;

  const BELOW = asSign ? "<" : t`Below`;
  const ABOVE = asSign ? ">" : t`Above`;

  return isTriggerPriceAboveThreshold(orderType, isLong) ? ABOVE : BELOW;
}

export function isTriggerPriceAboveThreshold(orderType: OrderType, isLong: boolean) {
  if (orderType === OrderType.LimitIncrease) {
    return !isLong;
  }

  if (orderType === OrderType.StopLossDecrease) {
    return isLong;
  }

  // Take-profit
  if (orderType === OrderType.LimitDecrease) {
    return isLong;
  }
}

export function applySlippage(allowedSlippage: number, price: BigNumber, isIncrease: boolean, isLong: boolean) {
  let slippageBasisPoints: number;

  if (isIncrease) {
    slippageBasisPoints = isLong ? BASIS_POINTS_DIVISOR + allowedSlippage : BASIS_POINTS_DIVISOR - allowedSlippage;
  } else {
    slippageBasisPoints = isLong ? BASIS_POINTS_DIVISOR - allowedSlippage : BASIS_POINTS_DIVISOR + allowedSlippage;
  }

  return price.mul(slippageBasisPoints).div(BASIS_POINTS_DIVISOR);
}

export function getAcceptablePrice(p: {
  isIncrease: boolean;
  isLong?: boolean;
  indexPrice?: BigNumber;
  priceImpactDeltaUsd?: BigNumber;
  sizeDeltaUsd?: BigNumber;
  allowedSlippage?: number;
  acceptablePriceImpactBps?: BigNumber;
}) {
  if (!p.indexPrice || typeof p.isLong === "undefined") return {};

  let acceptablePrice = p.indexPrice;
  let acceptablePriceImpactBps = p.acceptablePriceImpactBps || BigNumber.from(0);

  const shouldFlipPriceImpact = p.isIncrease ? p.isLong : !p.isLong;

  if (acceptablePriceImpactBps.abs().gt(0)) {
    let priceDelta = p.indexPrice.mul(acceptablePriceImpactBps).div(BASIS_POINTS_DIVISOR);
    priceDelta = shouldFlipPriceImpact ? priceDelta?.mul(-1) : priceDelta;

    acceptablePrice = p.indexPrice.sub(priceDelta);
  } else if (p.sizeDeltaUsd?.gt(0) && p.priceImpactDeltaUsd?.abs().gt(0)) {
    const priceImpactForPriceAdjustment = shouldFlipPriceImpact ? p.priceImpactDeltaUsd.mul(-1) : p.priceImpactDeltaUsd;
    acceptablePrice = p.indexPrice.mul(p.sizeDeltaUsd.add(priceImpactForPriceAdjustment)).div(p.sizeDeltaUsd);

    const priceDelta = p.indexPrice
      .sub(acceptablePrice)
      .abs()
      .mul(p.priceImpactDeltaUsd.isNegative() ? -1 : 1);

    acceptablePriceImpactBps = getBasisPoints(priceDelta, p.indexPrice);
  }

  if (p.allowedSlippage) {
    acceptablePrice = applySlippage(p.allowedSlippage, acceptablePrice, p.isIncrease, p.isLong);
  }

  return {
    acceptablePrice,
    acceptablePriceImpactBps,
  };
}

export function getNextCollateralUsdForDecreaseOrder(p: {
  isClosing?: boolean;
  sizeDeltaUsd?: BigNumber;
  collateralUsd?: BigNumber;
  collateralDeltaUsd?: BigNumber;
  pnl?: BigNumber;
}) {
  if (!p.collateralUsd) return undefined;

  if (p.isClosing) return BigNumber.from(0);

  let nextCollateralUsd = p.collateralUsd.sub(p.collateralDeltaUsd || BigNumber.from(0));

  if (p.pnl?.lt(0) && p.sizeDeltaUsd?.gt(0)) {
    nextCollateralUsd = nextCollateralUsd.sub(p.pnl.abs());
  }

  if (nextCollateralUsd.lt(0)) return BigNumber.from(0);

  return nextCollateralUsd;
}
