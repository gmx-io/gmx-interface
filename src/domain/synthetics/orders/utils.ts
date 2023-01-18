import { t } from "@lingui/macro";
import { applySwapImpactWithCap } from "domain/synthetics/fees";
import { MarketsData, getMarket, getMarketName } from "domain/synthetics/markets";
import {
  TokenData,
  TokenPrices,
  TokensData,
  convertToTokenAmount,
  convertToUsd,
  getTokenData,
  parseContractPrice,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { Position, getPriceForPnl } from "../positions";
import { AggregatedOrderData, AggregatedOrdersData, OrderType, OrdersData } from "./types";
import { formatTokenAmount, formatUsd } from "lib/numbers";

export const SWAP_PNL_TOKEN_TO_COLLATERAL_TOKEN = "0x0000000000000000000000000000000000000002";
export const SWAP_COLLATERAL_TOKEN_TO_PNL_TOKEN = "0x0000000000000000000000000000000000000003";

export function getOrder(ordersData: OrdersData, orderKey?: string) {
  if (!orderKey) return undefined;

  return ordersData[orderKey];
}

export function getPositionOrders(
  ordersData: AggregatedOrdersData,
  marketAddress: string,
  collateralToken: string,
  isLong: boolean
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

  const isTriggerOrder = isLimitOrder(order?.orderType) || isStopMarketOrder(order?.orderType);

  if (!isTriggerOrder) return undefined;

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
  if (!initialCollateral || !swapPath) return undefined;

  if (swapPath.length === 0) return initialCollateral;

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
  const sizeText = formatUsd(p.sizeDeltaUsd);

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

export function getTriggerPricePrefix(orderType?: OrderType, isLong?: boolean, asSign: boolean = true) {
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
  sizeDeltaUsd?: BigNumber;
  priceImpactDelta?: BigNumber;
  indexTokenPrices?: TokenPrices;
  allowedSlippage?: number;
}) {
  let acceptablePrice: BigNumber;

  if (p.triggerPrice) {
    acceptablePrice = p.triggerPrice;
  } else if (p.indexTokenPrices) {
    const shouldUseMaxPrice = p.isIncrease ? p.isLong : !p.isLong;

    acceptablePrice = shouldUseMaxPrice ? p.indexTokenPrices?.maxPrice : p.indexTokenPrices?.minPrice;
  } else {
    throw new Error("No trigger price or index token prices provided");
  }

  let slippageBasisPoints: number;

  if (p.allowedSlippage) {
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
  }

  if (p.priceImpactDelta && p.sizeDeltaUsd?.gt(0)) {
    const shouldFlipPriceImpact = p.isIncrease ? p.isLong : !p.isLong;
    const priceImpactForPriceAdjustment = shouldFlipPriceImpact ? p.priceImpactDelta.mul(-1) : p.priceImpactDelta;
    acceptablePrice = acceptablePrice.mul(p.sizeDeltaUsd.add(priceImpactForPriceAdjustment)).div(p.sizeDeltaUsd);
  }

  return acceptablePrice;
}

// function getDecreaseOrderFees(p: {
//   priceImpactConfigsData: PriceImpactConfigsData,
//   openInterestData: MarketsOpenInterestData,
//   tokensData: TokensData,
//   position: AggregatedPositionData,
//  }) {
//   const executionFee = getExecutionFee(p.tokensData);

//   const marketOpenInterest = getOpenInterest(p.openInterestData, p.position.marketAddress);

//   const priceImpact = getPriceImpact(
//     p.priceImpactConfigsData,
//     p.position.marketAddress,
//     marketOpenInterest?.longInterest,
//     marketOpenInterest?.shortInterest,
//   );

//   const fundingFee = p.position.pendingFundingFeesUsd;
//   const borrowingFee = p.position.pendingBorrowingFees;

//   const receiveUsdDelta = BigNumber.from(0);

//   return {

//   };
// }

export function getCollateralDeltaUsdForDecreaseOrder(p: {
  isClosing?: boolean;
  keepLeverage?: boolean;
  sizeDeltaUsd?: BigNumber;
  positionSizeInUsd?: BigNumber;
  positionCollateralUsd?: BigNumber;
}) {
  if (!p.positionCollateralUsd || !p.positionSizeInUsd) return undefined;

  if (p.isClosing) return p.positionCollateralUsd;

  if (!p.keepLeverage || !p.sizeDeltaUsd) return BigNumber.from(0);

  const collateralDeltaUsd = p.sizeDeltaUsd.mul(p.positionCollateralUsd).div(p.positionSizeInUsd);

  return collateralDeltaUsd;
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

export function getPnlDeltaForDecreaseOrder(position?: Position, indexToken?: TokenData, sizeDeltaUsd?: BigNumber) {
  const pnlPrice = getPriceForPnl(indexToken?.prices, position?.isLong);

  if (!pnlPrice || !indexToken || !position || !sizeDeltaUsd) return undefined;

  const positionValue = convertToUsd(position.sizeInTokens, indexToken.decimals, pnlPrice);
  const totalPnl = positionValue.sub(position.sizeInUsd).mul(position.isLong ? 1 : -1);

  let sizeDeltaInTokens: BigNumber;

  if (position.sizeInUsd.eq(sizeDeltaUsd)) {
    sizeDeltaInTokens = position.sizeInTokens;
  } else {
    if (position.isLong) {
      // roudUpDivision
      sizeDeltaInTokens = sizeDeltaUsd.mul(position.sizeInTokens).div(position.sizeInUsd);
    } else {
      sizeDeltaInTokens = sizeDeltaUsd.mul(position.sizeInTokens).div(position.sizeInUsd);
    }
  }

  const positionPnlUsd = totalPnl.mul(sizeDeltaInTokens).div(position.sizeInTokens);

  return { positionPnlUsd, sizeDeltaInTokens };
}

export function getCollateralOutForDecreaseOrder(p: {
  position?: Position;
  indexToken?: TokenData;
  collateralToken?: TokenData;
  sizeDeltaUsd: BigNumber;
  pnlToken?: TokenData;
  collateralDeltaAmount: BigNumber;
  feesUsd: BigNumber;
  priceImpactUsd: BigNumber;
  allowWithoutPosition?: boolean;
}) {
  let receiveAmount = p.collateralDeltaAmount;

  const pnlData = getPnlDeltaForDecreaseOrder(p.position, p.indexToken, p.sizeDeltaUsd);

  const pnlUsd = pnlData?.positionPnlUsd;

  if (!pnlUsd || !p.collateralToken?.prices || !p.pnlToken) return undefined;

  if (pnlUsd.lt(0)) {
    const deductedPnl = convertToTokenAmount(
      pnlUsd.abs(),
      p.collateralToken.decimals,
      p.collateralToken.prices.minPrice
    )!;

    receiveAmount = receiveAmount.sub(deductedPnl);
  } else {
    const addedPnl = convertToTokenAmount(pnlUsd, p.collateralToken.decimals, p.collateralToken.prices.maxPrice)!;

    //   if (wasSwapped) {
    //     values.outputAmount += swapOutputAmount;
    // } else {
    //     if (params.position.collateralToken() == cache.pnlToken) {
    //         values.outputAmount += pnlAmountForUser;
    //     } else {
    //         // store the pnlAmountForUser separately as it differs from the collateralToken
    //         values.pnlAmountForUser = pnlAmountForUser;
    //     }
    // }

    receiveAmount = receiveAmount.add(addedPnl);
  }

  const feesAmount = convertToTokenAmount(p.feesUsd, p.collateralToken.decimals, p.collateralToken.prices.minPrice)!;

  receiveAmount = receiveAmount.sub(feesAmount);

  const priceImpactAmount = convertToTokenAmount(
    p.priceImpactUsd,
    p.collateralToken.decimals,
    p.collateralToken.prices.minPrice
  )!;

  receiveAmount = receiveAmount.sub(priceImpactAmount);

  if (receiveAmount.lte(0)) {
    return BigNumber.from(0);
  }

  return receiveAmount;
}
