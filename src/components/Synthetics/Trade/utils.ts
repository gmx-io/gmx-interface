import { t } from "@lingui/macro";

import { TokensData, convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

import { BASIS_POINTS_DIVISOR, PRECISION, adjustForDecimals } from "lib/legacy";

export enum TradeType {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

export enum TradeMode {
  Market = "Market",
  Limit = "Limit",
  Trigger = "Trigger",
}

const LEVERAGE_PRECISION = BigNumber.from(BASIS_POINTS_DIVISOR);

export function getSubmitError(p: {
  operationType: TradeType;
  mode: TradeMode;
  tokensData: TokensData;
  fromTokenAddress?: string;
  fromTokenAmount?: BigNumber;
  toTokenAddress?: string;
  markPrice?: BigNumber;
  swapPath?: string[];
  triggerPrice?: BigNumber;
  swapTriggerRatio?: BigNumber;
  isHighPriceImpact?: boolean;
  isHighPriceImpactAccepted?: boolean;
  closeSizeUsd?: BigNumber;
}) {
  const fromToken = getTokenData(p.tokensData, p.fromTokenAddress);

  if (p.mode === TradeMode.Trigger) {
    if (!p.closeSizeUsd?.gt(0)) {
      return t`Enter a size`;
    }

    if (!p.triggerPrice?.gt(0)) {
      return t`Enter a trigger price`;
    }

    return undefined;
  }

  if (!fromToken) {
    return t`Loading...`;
  }

  if (p.fromTokenAmount?.gt(fromToken.balance || BigNumber.from(0))) {
    return t`Insufficient ${fromToken.symbol} balance`;
  }

  if (!p.fromTokenAmount?.gt(0)) {
    return t`Enter an amount`;
  }

  if (!p.swapPath) {
    return t`Couldn't find a swap path`;
  }

  if (p.isHighPriceImpact && !p.isHighPriceImpactAccepted) {
    return t`Need to accept price impact`;
  }

  if (p.operationType === TradeType.Swap) {
    if (p.fromTokenAddress === p.toTokenAddress) {
      return t`Select different tokens`;
    }

    if (p.mode === TradeMode.Limit) {
      if (!p.swapTriggerRatio?.gt(0)) {
        return t`Enter a swap trigger ratio`;
      }
    }
  }

  if (p.operationType === TradeType.Long) {
    if (p.mode === TradeMode.Limit) {
      if (!p.triggerPrice || !p.markPrice || p.triggerPrice.gt(p.markPrice)) {
        return t`Trigger price must be lower than mark price`;
      }
    }
  }

  if (p.operationType === TradeType.Short) {
    if (p.mode === TradeMode.Limit) {
      if (!p.triggerPrice || !p.markPrice || p.triggerPrice?.lt(p.markPrice)) {
        return t`Trigger price must be higher than mark price`;
      }
    }
  }
}

export function getNextTokenAmount(p: {
  fromTokenAmount: BigNumber;
  fromTokenPrice: BigNumber;
  fromToken: Token;
  toToken: Token;
  toTokenPrice: BigNumber;
  triggerPrice?: BigNumber;
  isInvertedTriggerPrice?: boolean;
  swapTriggerRatio?: BigNumber;
  isInvertedTriggerRatio?: boolean;
  leverageMultiplier?: BigNumber;
  isInvertedLeverage?: boolean;
  positionFeeFactor?: BigNumber;
}) {
  const fromUsd = convertToUsd(p.fromTokenAmount, p.fromToken.decimals, p.fromTokenPrice);

  let toAmount = convertToTokenAmount(fromUsd, p.toToken.decimals, p.toTokenPrice);

  if (!toAmount || !fromUsd) return undefined;

  if (p.swapTriggerRatio?.gt(0)) {
    const ratio = p.isInvertedTriggerRatio ? PRECISION.mul(PRECISION).div(p.swapTriggerRatio) : p.swapTriggerRatio;

    const adjustedDecimalsRatio = adjustForDecimals(ratio, p.fromToken.decimals, p.toToken.decimals);

    toAmount = p.fromTokenAmount.mul(adjustedDecimalsRatio).div(PRECISION);
  } else if (p.triggerPrice?.gt(0)) {
    if (p.isInvertedTriggerPrice) {
      const toTriggerUsd = convertToUsd(p.fromTokenAmount, p.fromToken.decimals, p.triggerPrice);

      toAmount = convertToTokenAmount(toTriggerUsd, p.toToken.decimals, p.toTokenPrice);
    } else {
      toAmount = convertToTokenAmount(fromUsd, p.toToken.decimals, p.triggerPrice);
    }
  }

  if (p.leverageMultiplier && p.positionFeeFactor) {
    // let newLeverage = p.leverageMultiplier.sub(applyFactor(p.leverageMultiplier, p.positionFeeFactor));
    let newLeverage = p.leverageMultiplier;

    if (p.isInvertedLeverage) {
      newLeverage = LEVERAGE_PRECISION.mul(LEVERAGE_PRECISION).div(newLeverage);
    }

    toAmount = toAmount?.mul(newLeverage).div(LEVERAGE_PRECISION);
  }

  return toAmount;
}
