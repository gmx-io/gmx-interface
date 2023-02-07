import { MarketsFeesConfigsData, getPositionFee, getPriceImpactForPosition } from "domain/synthetics/fees";
import { Market, MarketsData, MarketsOpenInterestData, MarketsPoolsData } from "domain/synthetics/markets";
import {
  TokenData,
  TokensData,
  TokensRatio,
  convertToTokenAmount,
  convertToUsd,
  getAmountByRatio,
  getTokenData,
} from "domain/synthetics/tokens";
import { PositionAmounts, SwapAmounts, SwapPathStats } from "../types";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { getMarkPrice } from "domain/synthetics/positions";

export * from "./swapRouting";
export * from "./swapStats";

// TODO
// case when swap tokens are equal
// Acceptable price imapct
export function getSwapLimitAmounts(p: {}) {}

export function getSwapAmounts(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  feesConfigs: MarketsFeesConfigsData;
  tokenIn: TokenData;
  tokenOut: TokenData;
  tokenInAmount?: BigNumber;
  tokenOutAmount?: BigNumber;
  triggerRatio?: TokensRatio;
  findSwapPath: (usdIn: BigNumber) => SwapPathStats | undefined;
}): SwapAmounts | undefined {
  const tokenIn = getTokenData(p.tokensData, p.tokenIn?.address, "wrapped")!;
  const tokenOut = getTokenData(p.tokensData, p.tokenOut?.address, "wrapped")!;

  const defaultAmounts: SwapAmounts = {
    amountIn: BigNumber.from(0),
    amountOut: BigNumber.from(0),
    usdIn: BigNumber.from(0),
    usdOut: BigNumber.from(0),
  };

  if (!tokenIn.prices || !tokenOut.prices) {
    return undefined;
  }

  if (!p.tokenOutAmount) {
    // calculate amountOut by amountIn
    const amountIn = p.tokenInAmount;
    const usdIn = convertToUsd(amountIn, tokenIn.decimals, tokenIn.prices.minPrice)!;
    let amountOut = BigNumber.from(0);
    let usdOut = BigNumber.from(0);

    if (!amountIn?.gt(0)) {
      return defaultAmounts;
    }

    // disable price impact for limit swaps?
    const swapPathStats = p.findSwapPath(usdIn);

    usdOut = swapPathStats?.usdOut || usdOut;
    amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, tokenOut.prices.maxPrice)!;

    if (p.triggerRatio) {
      // include fees?
      amountOut = getAmountByRatio({
        fromToken: tokenIn,
        toToken: tokenOut,
        fromTokenAmount: amountIn,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.largestAddress === tokenOut.address,
      });

      usdOut = convertToUsd(amountOut, tokenOut.decimals, tokenOut.prices!.maxPrice)!;
    }

    return {
      amountIn,
      amountOut,
      usdIn,
      usdOut,
      swapPathStats: swapPathStats,
    };
  } else {
    // calculate amountIn by amountOut
    const amountOut = p.tokenOutAmount;
    const usdOut = convertToUsd(amountOut, tokenOut.decimals, tokenOut.prices.minPrice)!;
    let usdIn = usdOut;
    let amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, tokenIn.prices.maxPrice)!;

    if (!amountOut.gt(0)) {
      return defaultAmounts;
    }

    const swapPathStats = p.findSwapPath(usdIn);

    const adjustedUsdIn = swapPathStats?.usdOut.gt(0) ? usdIn.mul(usdOut).div(swapPathStats.usdOut) : usdIn;

    usdIn = adjustedUsdIn;
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, tokenIn.prices.maxPrice)!;

    if (p.triggerRatio) {
      amountIn = getAmountByRatio({
        fromToken: tokenOut,
        toToken: tokenIn,
        fromTokenAmount: amountOut,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.largestAddress === tokenIn.address,
      });

      usdIn = convertToUsd(amountOut, tokenIn.decimals, tokenIn.prices!.minPrice)!;
    }

    return {
      amountIn,
      amountOut,
      usdIn,
      usdOut,
    };
  }
}

export function getPositionAmounts(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  openInterestData: MarketsOpenInterestData;
  feesConfigs: MarketsFeesConfigsData;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  market: Market;
  indexToken: TokenData;
  initialCollateralAmount?: BigNumber;
  indexTokenAmount?: BigNumber;
  isLong: boolean;
  leverage?: BigNumber;
  triggerPrice?: BigNumber;
  findSwapPath: (usdIn: BigNumber) => SwapPathStats | undefined;
}): PositionAmounts | undefined {
  const defaultAmounts: PositionAmounts = {
    initialCollateralAmount: BigNumber.from(0),
    initialCollateralUsd: BigNumber.from(0),
    collateralAmount: BigNumber.from(0),
    collateralUsd: BigNumber.from(0),
    sizeDeltaUsd: BigNumber.from(0),
    sizeDeltaInTokens: BigNumber.from(0),
    sizeDeltaAfterFeesUsd: BigNumber.from(0),
    sizeDeltaAfterFeesInTokens: BigNumber.from(0),
  };

  if (!p.indexTokenAmount) {
    // calculate indexTokenAmount by initialCollateralAmount
    const swapAmounts = getSwapAmounts({
      marketsData: p.marketsData,
      poolsData: p.poolsData,
      tokensData: p.tokensData,
      feesConfigs: p.feesConfigs,
      tokenIn: p.initialCollateralToken,
      tokenOut: p.collateralToken,
      tokenInAmount: p.initialCollateralAmount,
      findSwapPath: p.findSwapPath,
    });

    if (!swapAmounts?.amountOut.gt(0)) {
      return defaultAmounts;
    }

    const initialCollateralAmount = swapAmounts.amountIn;
    const initialCollateralUsd = swapAmounts.usdIn;
    const collateralUsd = swapAmounts.usdOut;
    const collateralAmount = swapAmounts.amountOut;

    let sizeDeltaUsd = collateralUsd;

    if (p.leverage) {
      sizeDeltaUsd = sizeDeltaUsd.mul(p.leverage).div(BASIS_POINTS_DIVISOR);
    }

    const positionFeeUsd =
      getPositionFee(p.feesConfigs, p.market.marketTokenAddress, sizeDeltaUsd) || BigNumber.from(0);
    // Todo: disable for limits?
    const positionPriceImpactDeltaUsd =
      getPriceImpactForPosition(
        p.openInterestData,
        p.feesConfigs,
        p.market.marketTokenAddress,
        sizeDeltaUsd,
        p.isLong
      ) || BigNumber.from(0);

    const sizeDeltaAfterFeesUsd = sizeDeltaUsd.sub(positionFeeUsd).add(positionPriceImpactDeltaUsd);

    const price = p.triggerPrice || getMarkPrice(p.indexToken.prices, true, p.isLong);

    const sizeDeltaInTokens =
      convertToTokenAmount(sizeDeltaAfterFeesUsd, p.indexToken.decimals, price) || BigNumber.from(0);
    const sizeDeltaAfterFeesInTokens =
      convertToTokenAmount(sizeDeltaAfterFeesUsd, p.indexToken.decimals, price) || BigNumber.from(0);

    return {
      initialCollateralAmount,
      initialCollateralUsd,
      collateralAmount,
      collateralUsd,
      sizeDeltaUsd,
      sizeDeltaInTokens,
      sizeDeltaAfterFeesUsd,
      sizeDeltaAfterFeesInTokens,
      swapPathStats: swapAmounts.swapPathStats,
      positionFeeUsd,
      positionPriceImpactDeltaUsd,
    };
  } else {
    // calculate initialCollateralAmount by indexTokenAmount
    if (!p.indexTokenAmount.gt(0)) {
      return defaultAmounts;
    }

    const price = p.triggerPrice || getMarkPrice(p.indexToken.prices, true, p.isLong);

    const sizeDeltaAfterFeesInTokens = p.indexTokenAmount;
    const sizeDeltaAfterFeesUsd =
      convertToUsd(sizeDeltaAfterFeesInTokens, p.indexToken.decimals, price) || BigNumber.from(0);

    const positionFeeUsd =
      getPositionFee(p.feesConfigs, p.market.marketTokenAddress, sizeDeltaAfterFeesUsd) || BigNumber.from(0);

    let sizeDeltaUsd = sizeDeltaAfterFeesUsd.add(positionFeeUsd);

    const positionPriceImpactDeltaUsd =
      getPriceImpactForPosition(
        p.openInterestData,
        p.feesConfigs,
        p.market.marketTokenAddress,
        sizeDeltaUsd,
        p.isLong
      ) || BigNumber.from(0);

    sizeDeltaUsd = sizeDeltaUsd.add(positionPriceImpactDeltaUsd);
    const sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, p.indexToken.decimals, price) || BigNumber.from(0);

    let collateralUsd = sizeDeltaUsd;

    if (p.leverage) {
      collateralUsd = collateralUsd.mul(BASIS_POINTS_DIVISOR).div(p.leverage);
    }

    const collateralAmount =
      convertToTokenAmount(collateralUsd, p.collateralToken.decimals, p.collateralToken.prices?.maxPrice) ||
      BigNumber.from(0);

    const swapAmounts = getSwapAmounts({
      marketsData: p.marketsData,
      poolsData: p.poolsData,
      tokensData: p.tokensData,
      feesConfigs: p.feesConfigs,
      tokenIn: p.initialCollateralToken,
      tokenOut: p.collateralToken,
      tokenOutAmount: collateralAmount,
      findSwapPath: p.findSwapPath,
    });

    const initialCollateralAmount = swapAmounts?.amountIn || BigNumber.from(0);
    const initialCollateralUsd = swapAmounts?.usdIn || BigNumber.from(0);

    return {
      initialCollateralAmount,
      initialCollateralUsd,
      collateralAmount,
      collateralUsd,
      sizeDeltaUsd,
      sizeDeltaInTokens,
      sizeDeltaAfterFeesUsd,
      sizeDeltaAfterFeesInTokens,
      positionFeeUsd,
      positionPriceImpactDeltaUsd,
      swapPathStats: swapAmounts?.swapPathStats,
    };
  }
}
