import { BigNumber } from "ethers";
import { OrdersData } from "./types";
import { TokenData, TokenPrices } from "domain/synthetics/tokens";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { applySwapImpactWithCap } from "../fees";

export function getOrders(ordersData: OrdersData) {
  return Object.values(ordersData);
}

export function getOrder(ordersData: OrdersData, orderKey?: string) {
  if (!orderKey) return undefined;

  return ordersData[orderKey];
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
