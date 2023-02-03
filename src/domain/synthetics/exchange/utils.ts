import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, PRECISION, adjustForDecimals } from "lib/legacy";
import { getBasisPoints } from "lib/numbers";
import { FeeItem, MarketsFeesConfigsData, SwapPathStats, getPositionFee, getPriceImpactForPosition } from "../fees";
import { Market, MarketsData, MarketsOpenInterestData, MarketsPoolsData } from "../markets";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd, getTokenData } from "../tokens";
import { IncreaseTradeParams, TokensRatio } from "./types";

export function getAmountByRatio(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: BigNumber;
  ratio: BigNumber;
  invertRatio?: boolean;
}) {
  const ratio = p.invertRatio ? PRECISION.mul(PRECISION).div(p.ratio) : p.ratio;

  const adjustedDecimalsRatio = adjustForDecimals(ratio, p.fromToken.decimals, p.toToken.decimals);

  return p.fromTokenAmount.mul(adjustedDecimalsRatio).div(PRECISION);
}

export function getTokensRatio(p: { fromToken?: TokenData; toToken?: TokenData }): TokensRatio | undefined {
  if (!p.fromToken?.prices || !p.toToken?.prices) return undefined;

  const fromAddress = p.fromToken.address;
  const toAddress = p.toToken.address;
  const fromPrice = p.fromToken.prices.minPrice;
  const toPrice = p.toToken.prices.maxPrice;

  const [largestAddress, smallestAddress] = fromPrice.gt(toPrice) ? [fromAddress, toAddress] : [toAddress, fromAddress];

  const ratio =
    largestAddress === fromAddress ? fromPrice.mul(PRECISION).div(toPrice) : toPrice.mul(PRECISION).div(fromPrice);

  return { ratio, largestAddress, smallestAddress };
}

export function getSwapAmounts(p: {
  data: {
    marketsData: MarketsData;
    poolsData: MarketsPoolsData;
    tokensData: TokensData;
    feesConfigs: MarketsFeesConfigsData;
  };
  fromToken?: TokenData;
  toToken?: TokenData;
  fromAmount?: BigNumber;
  toAmount?: BigNumber;
  triggerRatio?: TokensRatio;
  findSwapPath: (usdIn: BigNumber) => { swapPath: string[]; swapPathStats: SwapPathStats } | undefined;
}):
  | {
      fromAmount: BigNumber;
      fromUsd: BigNumber;
      toAmount: BigNumber;
      toUsd: BigNumber;
      swapPath: string[];
      swapFees?: SwapPathStats;
    }
  | undefined {
  if ((!p.toAmount && !p.fromAmount) || !p.fromToken?.prices || !p.toToken?.prices) {
    return undefined;
  }

  const defaultValue = {
    fromAmount: BigNumber.from(0),
    fromUsd: BigNumber.from(0),
    toAmount: BigNumber.from(0),
    toUsd: BigNumber.from(0),
    swapPath: [],
  };

  const fromToken = getTokenData(p.data.tokensData, p.fromToken.address, "wrapped")!;
  const toToken = getTokenData(p.data.tokensData, p.toToken.address, "wrapped")!;

  if (!p.toAmount) {
    // calculate toAmount by fromAmount
    const fromAmount = p.fromAmount;
    const fromUsd = convertToUsd(fromAmount, fromToken.decimals, fromToken.prices!.minPrice)!;

    if (!fromAmount?.gt(0) || !fromUsd?.gt(0)) {
      return defaultValue;
    }

    if (fromToken.address === toToken.address) {
      return {
        fromAmount,
        fromUsd,
        toAmount: fromAmount,
        toUsd: fromUsd,
        swapPath: [],
      };
    }

    const { swapPath, swapPathStats: swapFees } = p.findSwapPath(fromUsd) || {};

    if (!swapPath) {
      return defaultValue;
    }

    if (p.triggerRatio) {
      const toAmount = getAmountByRatio({
        fromToken: fromToken,
        toToken: toToken,
        fromTokenAmount: fromAmount,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.largestAddress === toToken.address,
      });

      const toUsd = convertToUsd(toAmount, toToken.decimals, toToken.prices!.maxPrice)!;

      return {
        fromAmount,
        fromUsd,
        toAmount,
        toUsd,
        swapPath,
        swapFees,
      };
    }

    const toUsd = swapFees?.usdOut || BigNumber.from(0);
    const toAmount = convertToTokenAmount(toUsd, toToken.decimals, toToken.prices!.maxPrice)!;

    return {
      fromAmount,
      fromUsd,
      swapPath,
      toAmount,
      swapFees,
      toUsd,
    };
  } else {
    // calculate fromAmount by toAmount
    const toAmount = p.toAmount;
    const toUsd = convertToUsd(toAmount, toToken.decimals, toToken.prices!.minPrice);

    if (!toAmount?.gt(0) || !toUsd?.gt(0)) {
      return defaultValue;
    }

    if (fromToken.address === toToken.address) {
      return {
        fromAmount: toAmount,
        fromUsd: toUsd,
        toAmount,
        toUsd,
        swapPath: [],
      };
    }

    const baseFromUsd = toUsd;
    const { swapPath, swapPathStats: swapFees } = p.findSwapPath(baseFromUsd) || {};

    if (!swapPath) {
      return undefined;
    }

    if (p.triggerRatio) {
      const fromAmount = getAmountByRatio({
        fromToken: toToken,
        toToken: fromToken,
        fromTokenAmount: toAmount,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.largestAddress === fromToken.address,
      });

      const fromUsd = convertToUsd(toAmount, fromToken.decimals, fromToken.prices!.minPrice)!;

      return {
        fromAmount,
        fromUsd,
        toAmount,
        toUsd,
        swapPath,
        swapFees,
      };
    }

    // TODO: reverse swap?
    const fromUsd = swapFees?.usdOut.gt(0) ? baseFromUsd.mul(toUsd).div(swapFees.usdOut) : BigNumber.from(0);
    const fromAmount = convertToTokenAmount(fromUsd, fromToken.decimals, fromToken.prices!.minPrice)!;

    return {
      fromAmount,
      fromUsd,
      toAmount,
      toUsd,
      swapPath,
      swapFees,
    };
  }
}

export function getIncreaseOrderAmounts(p: {
  data: {
    marketsData: MarketsData;
    poolsData: MarketsPoolsData;
    tokensData: TokensData;
    openInterestData: MarketsOpenInterestData;
    feesConfigs: MarketsFeesConfigsData;
  };
  indexToken?: TokenData;
  market?: Market;
  initialCollateral?: TokenData;
  targetCollateral?: TokenData;
  initialCollateralAmount?: BigNumber;
  indexTokenAmount?: BigNumber;
  isLong: boolean;
  leverage?: BigNumber;
  triggerPrice?: BigNumber;
  findSwapPath: (usdIn: BigNumber) => { swapPath: string[]; swapPathStats: SwapPathStats } | undefined;
  prevSwapPath?: string[];
}): IncreaseTradeParams | undefined {
  if (
    (!p.initialCollateralAmount && !p.indexTokenAmount) ||
    !p.market ||
    !p.initialCollateral?.prices ||
    !p.indexToken?.prices ||
    !p.targetCollateral?.prices
  ) {
    return undefined;
  }

  let swapFees: SwapPathStats | undefined;
  let swapPath: string[] | undefined;
  let sizeDeltaUsd: BigNumber;
  let sizeDeltaAfterFeesUsd: BigNumber;
  let sizeDeltaInTokens: BigNumber;
  let positionFee: FeeItem | undefined;
  let priceImpact: FeeItem | undefined;
  let collateralAmount: BigNumber;
  let initialCollateralAmount: BigNumber;
  let collateralUsd: BigNumber;

  const initialCollateral = getTokenData(p.data.tokensData, p.initialCollateral.address, "wrapped")!;

  if (!p.indexTokenAmount) {
    // calculate indexTokenAmount by initialCollateralAmount
    initialCollateralAmount = p.initialCollateralAmount!;

    if (p.targetCollateral.address === initialCollateral.address) {
      collateralAmount = p.initialCollateralAmount!;
      collateralUsd = convertToUsd(collateralAmount, initialCollateral.decimals, initialCollateral.prices!.minPrice)!;
      swapPath = [];
    } else {
      const swapAmounts = getSwapAmounts({
        data: p.data,
        fromToken: initialCollateral,
        toToken: p.targetCollateral,
        fromAmount: p.initialCollateralAmount!,
        findSwapPath: p.findSwapPath,
      });

      if (swapAmounts) {
        collateralAmount = swapAmounts.toAmount;
        collateralUsd = swapAmounts.toUsd;
        swapFees = swapAmounts.swapFees;
        swapPath = swapAmounts.swapPath;
      } else {
        return undefined;
      }
    }

    sizeDeltaUsd = collateralUsd;

    if (p.leverage) {
      sizeDeltaUsd = sizeDeltaUsd.mul(p.leverage).div(BASIS_POINTS_DIVISOR);
    }

    positionFee = getPositionFee(p.data.feesConfigs, p.market.marketTokenAddress, sizeDeltaUsd, collateralUsd);
    sizeDeltaAfterFeesUsd = sizeDeltaUsd.add(positionFee?.deltaUsd || 0);

    const priceImpactDeltaUsd = getPriceImpactForPosition(
      p.data.openInterestData,
      p.data.feesConfigs,
      p.market.marketTokenAddress,
      sizeDeltaUsd,
      p.isLong
    );

    if (priceImpactDeltaUsd) {
      priceImpact = {
        deltaUsd: priceImpactDeltaUsd,
        bps: getBasisPoints(priceImpactDeltaUsd, collateralUsd),
      };
      sizeDeltaAfterFeesUsd = sizeDeltaAfterFeesUsd.add(priceImpactDeltaUsd);
    }

    const price = p.triggerPrice || (p.isLong ? p.indexToken.prices.maxPrice : p.indexToken.prices.minPrice);

    const sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, p.indexToken.decimals, price)!;
    const sizeDeltaAfterFeesInTokens = convertToTokenAmount(sizeDeltaAfterFeesUsd, p.indexToken.decimals, price)!;

    return {
      market: p.market,
      swapPath,
      swapFees,
      positionFee,
      priceImpact,
      sizeDeltaInTokens,
      collateralAmount,
      initialCollateralAmount,
      sizeDeltaAfterFeesUsd,
      sizeDeltaAfterFeesInTokens,
      sizeDeltaUsd,
      collateralUsd,
    };
  } else {
    // calculate initialCollateralAmount by indexTokenAmount
    const price = p.triggerPrice || (p.isLong ? p.indexToken.prices.minPrice : p.indexToken.prices.maxPrice);
    sizeDeltaInTokens = p.indexTokenAmount;
    const sizeDeltaAfterFeesInTokens = sizeDeltaInTokens;
    sizeDeltaUsd = convertToUsd(p.indexTokenAmount, p.indexToken.decimals, price)!;
    sizeDeltaAfterFeesUsd = sizeDeltaUsd;

    const priceImpactDeltaUsd = getPriceImpactForPosition(
      p.data.openInterestData,
      p.data.feesConfigs,
      p.market.marketTokenAddress,
      sizeDeltaUsd,
      p.isLong
    );

    collateralUsd = sizeDeltaUsd;

    if (p.leverage) {
      collateralUsd = collateralUsd.mul(BASIS_POINTS_DIVISOR).div(p.leverage);
    }

    positionFee = getPositionFee(p.data.feesConfigs, p.market.marketTokenAddress, sizeDeltaUsd, collateralUsd);

    // TODO or acceptable price?
    if (priceImpactDeltaUsd) {
      priceImpact = {
        deltaUsd: priceImpactDeltaUsd,
        bps: getBasisPoints(priceImpactDeltaUsd, collateralUsd),
      };
    }

    collateralUsd = collateralUsd.add(positionFee?.deltaUsd || 0).add(priceImpactDeltaUsd || 0);
    collateralAmount = convertToTokenAmount(
      collateralUsd,
      p.targetCollateral.decimals,
      p.targetCollateral.prices.minPrice
    )!;

    if (p.targetCollateral.address === initialCollateral.address) {
      swapPath = [];
      initialCollateralAmount = collateralAmount;
    } else {
      const swapAmounts = getSwapAmounts({
        data: p.data,
        fromToken: initialCollateral,
        toToken: p.targetCollateral,
        toAmount: collateralAmount,
        findSwapPath: p.findSwapPath,
      });

      if (swapAmounts) {
        initialCollateralAmount = swapAmounts.fromAmount;
        swapFees = swapAmounts.swapFees;
        swapPath = swapAmounts.swapPath;

        if (positionFee && swapAmounts.fromUsd.gt(0)) {
          positionFee.bps = getBasisPoints(positionFee.deltaUsd, swapAmounts.fromUsd);
        }

        if (priceImpact && swapAmounts.fromUsd.gt(0)) {
          priceImpact.bps = getBasisPoints(priceImpact.deltaUsd, swapAmounts.fromUsd);
        }
      } else {
        return undefined;
      }
    }

    return {
      market: p.market,
      swapPath,
      swapFees,
      positionFee,
      priceImpact,
      sizeDeltaInTokens,
      collateralAmount,
      initialCollateralAmount,
      sizeDeltaAfterFeesUsd,
      sizeDeltaAfterFeesInTokens,
      sizeDeltaUsd,
      collateralUsd,
    };
  }
}
