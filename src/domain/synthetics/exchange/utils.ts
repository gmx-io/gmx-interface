import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, PRECISION, adjustForDecimals } from "lib/legacy";
import { Market, MarketsData, MarketsOpenInterestData, MarketsPoolsData, getMarket } from "../markets";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd } from "../tokens";
import {
  FeeItem,
  MarketsFeesConfigsData,
  TotalSwapFees,
  getPositionFee,
  getPriceImpactForPosition,
  getTotalSwapFees,
} from "../fees";
import { IncreaseTradeParams, TokensRatio, TradeMode, TradeType } from "./types";
import { getMostLiquidMarketForPosition } from "../routing";
import { getBasisPoints } from "lib/numbers";
import { t } from "@lingui/macro";

export function getTradeTypeLabels() {
  return {
    [TradeType.Long]: t`Long`,
    [TradeType.Short]: t`Short`,
    [TradeType.Swap]: t`Swap`,
  };
}

export function getTradeModeLabels() {
  return {
    [TradeMode.Market]: t`Market`,
    [TradeMode.Limit]: t`Limit`,
    [TradeMode.Trigger]: t`Trigger`,
  };
}

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

  const [primaryAddress, secondaryAddress] = fromPrice.gt(toPrice)
    ? [fromAddress, toAddress]
    : [toAddress, fromAddress];

  const ratio =
    primaryAddress === fromAddress ? fromPrice.mul(PRECISION).div(toPrice) : toPrice.mul(PRECISION).div(fromPrice);

  return { ratio, primaryAddress, secondaryAddress };
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
  findSwapPath: (usdIn: BigNumber) => string[] | undefined;
  prevSwapPath?: string[];
}):
  | {
      fromAmount: BigNumber;
      fromUsd: BigNumber;
      toAmount: BigNumber;
      toUsd: BigNumber;
      swapPath: string[];
      swapFees?: TotalSwapFees;
    }
  | undefined {
  if ((!p.toAmount && !p.fromAmount) || !p.fromToken?.prices || !p.toToken?.prices) {
    return undefined;
  }

  if (!p.toAmount) {
    // calculate toAmount by fromAmount
    const fromAmount = p.fromAmount!;
    const fromUsd = convertToUsd(fromAmount, p.fromToken.decimals, p.fromToken.prices!.minPrice)!;
    const swapPath = p.findSwapPath(fromUsd) || p.prevSwapPath;

    if (!swapPath) {
      return undefined;
    }

    const swapFees = getTotalSwapFees(
      p.data.marketsData,
      p.data.poolsData,
      p.data.tokensData,
      p.data.feesConfigs,
      swapPath,
      p.fromToken.address,
      fromUsd
    );

    if (p.triggerRatio) {
      const toAmount = getAmountByRatio({
        fromToken: p.fromToken,
        toToken: p.toToken,
        fromTokenAmount: fromAmount,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.primaryAddress === p.toToken.address,
      });

      const toUsd = convertToUsd(toAmount, p.toToken.decimals, p.toToken.prices!.maxPrice)!;

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
    const toAmount = convertToTokenAmount(toUsd, p.toToken.decimals, p.toToken.prices.maxPrice)!;

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
    const toUsd = convertToUsd(toAmount, p.toToken.decimals, p.toToken.prices!.minPrice)!;

    const baseFromUsd = toUsd;
    const swapPath = p.findSwapPath(baseFromUsd) || p.prevSwapPath;

    if (!swapPath) {
      return undefined;
    }

    const swapFees = getTotalSwapFees(
      p.data.marketsData,
      p.data.poolsData,
      p.data.tokensData,
      p.data.feesConfigs,
      swapPath,
      p.fromToken.address,
      baseFromUsd
    );

    if (p.triggerRatio) {
      const fromAmount = getAmountByRatio({
        fromToken: p.toToken,
        toToken: p.fromToken,
        fromTokenAmount: toAmount,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.primaryAddress === p.fromToken.address,
      });

      const fromUsd = convertToUsd(toAmount, p.fromToken.decimals, p.fromToken.prices!.minPrice)!;

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
    const fromAmount = convertToTokenAmount(fromUsd, p.fromToken.decimals, p.fromToken.prices.minPrice)!;

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
  findSwapPath: (usdIn: BigNumber) => string[] | undefined;
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

  let swapFees: TotalSwapFees | undefined;
  let swapPath: string[] | undefined;
  let sizeDeltaUsd: BigNumber;
  let sizeDeltaAfterFeesUsd: BigNumber;
  let sizeDeltaInTokens: BigNumber;
  let positionFee: FeeItem | undefined;
  let priceImpact: FeeItem | undefined;
  let collateralAmount: BigNumber;
  let initialCollateralAmount: BigNumber;
  let collateralUsd: BigNumber;

  if (!p.indexTokenAmount) {
    // calculate indexTokenAmount by initialCollateralAmount
    initialCollateralAmount = p.initialCollateralAmount!;

    if (p.targetCollateral.address === p.initialCollateral.address) {
      collateralAmount = p.initialCollateralAmount!;
      collateralUsd = convertToUsd(
        collateralAmount,
        p.initialCollateral.decimals,
        p.initialCollateral.prices.minPrice
      )!;
      swapPath = [];
    } else {
      const swapAmounts = getSwapAmounts({
        data: p.data,
        fromToken: p.initialCollateral,
        toToken: p.targetCollateral,
        fromAmount: p.initialCollateralAmount!,
        findSwapPath: p.findSwapPath,
        prevSwapPath: p.prevSwapPath,
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

    if (p.targetCollateral.address === p.initialCollateral.address) {
      swapPath = [];
      initialCollateralAmount = collateralAmount;
    } else {
      const swapAmounts = getSwapAmounts({
        data: p.data,
        fromToken: p.initialCollateral,
        toToken: p.targetCollateral,
        toAmount: collateralAmount,
        findSwapPath: p.findSwapPath,
        prevSwapPath: p.prevSwapPath,
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
