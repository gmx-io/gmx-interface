import { TokenPrices } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { getBasisPoints } from "lib/numbers";

export function getMarkPrice(p: { prices: TokenPrices; isIncrease: boolean; isLong: boolean }) {
  const { prices, isIncrease, isLong } = p;

  const shouldUseMaxPrice = isIncrease ? isLong : !isLong;

  return shouldUseMaxPrice ? prices.maxPrice : prices.minPrice;
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

export function applySlippage(allowedSlippage: number, price: BigNumber, isIncrease: boolean, isLong: boolean) {
  let slippageBasisPoints: number;

  if (isIncrease) {
    slippageBasisPoints = isLong ? BASIS_POINTS_DIVISOR + allowedSlippage : BASIS_POINTS_DIVISOR - allowedSlippage;
  } else {
    slippageBasisPoints = isLong ? BASIS_POINTS_DIVISOR - allowedSlippage : BASIS_POINTS_DIVISOR + allowedSlippage;
  }

  return price.mul(slippageBasisPoints).div(BASIS_POINTS_DIVISOR);
}
