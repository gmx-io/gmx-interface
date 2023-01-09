import { BigNumber } from "ethers";
import { AggregatedOrderData, OrderType, OrdersData } from "./types";
import {
  TokenData,
  TokenPrices,
  TokensData,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  parseContractPrice,
} from "domain/synthetics/tokens";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { applySwapImpactWithCap } from "domain/synthetics/fees";
import { MarketsData, getMarket, getMarketName } from "domain/synthetics/markets";
import { t } from "@lingui/macro";

/**
 * TODO:
 * address public constant SWAP_PNL_TOKEN_TO_COLLATERAL_TOKEN = address(2);
 * address public constant SWAP_COLLATERAL_TOKEN_TO_PNL_TOKEN = address(3);
 */

export function getOrder(ordersData: OrdersData, orderKey?: string) {
  if (!orderKey) return undefined;

  return ordersData[orderKey];
}

export function isLimitOrder(orderType: OrderType) {
  return [OrderType.LimitIncrease, OrderType.LimitSwap].includes(orderType);
}

export function isStopMarketOrder(orderType: OrderType) {
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

export function getAggregatedOrderData(
  ordersData: OrdersData,
  marketsData: MarketsData,
  tokensData: TokensData,
  orderKey?: string
): AggregatedOrderData | undefined {
  const order = getOrder(ordersData, orderKey);

  if (!order) return undefined;

  const market = getMarket(marketsData, order.marketAddress);
  const marketName = getMarketName(marketsData, tokensData, order.marketAddress, false, false);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const initialCollateralToken = getTokenData(tokensData, order.initialCollateralTokenAddress);

  const toCollateralAddress = getToTokenFromSwapPath(marketsData, order.initialCollateralTokenAddress, order.swapPath);
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

export function getToTokenFromSwapPath(marketsData: MarketsData, initialCollateral?: string, swapPath?: string[]) {
  if (!initialCollateral || !swapPath?.length) return undefined;

  const [firstMarketAddress, ...marketAddresses] = swapPath;

  const initialMarket = getMarket(marketsData, firstMarketAddress);

  if (!initialMarket) return undefined;

  let outTokenType: "long" | "short" = initialMarket.longTokenAddress === initialCollateral ? "short" : "long";
  let outTokenAddress = outTokenType === "long" ? initialMarket.longTokenAddress : initialMarket.shortTokenAddress;

  for (const marketAddress of marketAddresses) {
    const market = getMarket(marketsData, marketAddress);

    if (!market) return undefined;

    outTokenType = market.longTokenAddress === outTokenAddress ? "short" : "long";
    outTokenAddress = outTokenType === "long" ? market.longTokenAddress : market.shortTokenAddress;
  }

  return outTokenAddress;
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
  const sizeText = formatUsdAmount(p.sizeDeltaUsd);

  if (p.orderType === OrderType.LimitIncrease) {
    return t`Increase ${tokenText} by ${sizeText}`;
  }

  if (p.orderType === OrderType.LimitDecrease || p.orderType === OrderType.StopLossDecrease) {
    return t`Decrease ${tokenText} by ${sizeText}`;
  }
}

export function getMarkPriceForOrder(isIncrease?: boolean, isLong?: boolean, tokenPrices?: TokenPrices) {
  const maximisePrice = (isIncrease && isLong) || (!isIncrease && !isLong);

  return maximisePrice ? tokenPrices?.maxPrice : tokenPrices?.minPrice;
}

export function getTriggerPricePrefix(orderType?: OrderType, isLong?: boolean, asSign?: boolean) {
  if (!orderType || typeof isLong === "undefined") return undefined;

  const BELOW = asSign ? "<" : t`Below`;
  const ABOVE = asSign ? ">" : t`Above`;

  if (orderType === OrderType.LimitIncrease) {
    return isLong ? BELOW : ABOVE;
  }

  if (orderType === OrderType.StopLossDecrease) {
    return isLong ? BELOW : ABOVE;
  }

  // Take-profit
  if (orderType === OrderType.LimitDecrease) {
    return isLong ? ABOVE : BELOW;
  }
}

export function getMinOutputAmountForSwapOrder(p: {
  fromTokenAmount: BigNumber;
  toTokenPrices: TokenPrices;
  fromTokenPrices: TokenPrices;
  allowedSlippage: number;
  priceImpactDeltaUsd: BigNumber;
}) {
  // priceImpact in usd?
  let amountOut: BigNumber;

  // todo on each swap step?
  if (p.priceImpactDeltaUsd.gt(0)) {
    // TODO: amount after fee
    const amountIn = p.fromTokenAmount;

    amountOut = amountIn.mul(p.toTokenPrices.minPrice).div(p.fromTokenPrices.maxPrice);

    const positiveImpactAmount = applySwapImpactWithCap({
      tokenPrices: p.toTokenPrices,
      priceImpactUsd: p.priceImpactDeltaUsd,
    });

    amountOut = amountOut.add(positiveImpactAmount);
  } else {
    const negativeImpactAmount = applySwapImpactWithCap({
      tokenPrices: p.fromTokenPrices,
      priceImpactUsd: p.priceImpactDeltaUsd,
    });

    // TODO: amount after fee
    const amountIn = p.fromTokenAmount.sub(negativeImpactAmount.mul(-1));

    amountOut = amountIn.mul(p.fromTokenPrices.minPrice).div(p.toTokenPrices.maxPrice);
  }

  return amountOut;
}

export function getMinOutputAmountForDecreaseOrder(p: {
  collateralToken: TokenData;
  sizeDeltaUsd: BigNumber;
  acceptablePrice: BigNumber;
}) {
  //TODO
  return BigNumber.from(0);
}

export function getAcceptablePriceForPositionOrder(p: {
  isIncrease: boolean;
  isLong: boolean;
  triggerPrice?: BigNumber;
  sizeDeltaUsd: BigNumber;
  priceImpactDelta: BigNumber;
  indexTokenPrices: TokenPrices;
  allowedSlippage: number;
}) {
  let acceptablePrice: BigNumber;

  if (p.triggerPrice) {
    acceptablePrice = p.triggerPrice;
  } else {
    const shouldUseMaxPrice = p.isIncrease ? p.isLong : !p.isLong;

    acceptablePrice = shouldUseMaxPrice ? p.indexTokenPrices.maxPrice : p.indexTokenPrices.minPrice;
  }

  let slippageBasisPoints: number;

  if (p.isIncrease) {
    slippageBasisPoints = p.isLong
      ? BASIS_POINTS_DIVISOR + p.allowedSlippage
      : BASIS_POINTS_DIVISOR - p.allowedSlippage;
  } else {
    slippageBasisPoints = p.isLong
      ? BASIS_POINTS_DIVISOR - p.allowedSlippage
      : BASIS_POINTS_DIVISOR + p.allowedSlippage;
  }

  acceptablePrice = acceptablePrice.mul(slippageBasisPoints).div(BASIS_POINTS_DIVISOR);

  const shouldFlipPriceImpact = p.isIncrease ? p.isLong : !p.isLong;

  const priceImpactForPriceAdjustment = shouldFlipPriceImpact ? p.priceImpactDelta.mul(-1) : p.priceImpactDelta;

  acceptablePrice = acceptablePrice.mul(p.sizeDeltaUsd.add(priceImpactForPriceAdjustment)).div(p.sizeDeltaUsd);

  return acceptablePrice;
}
