import { t } from "@lingui/macro";

import { ExecutionFeeParams } from "domain/synthetics/fees";
import { TokensData, convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { BASIS_POINTS_DIVISOR, PRECISION, USD_DECIMALS, adjustForDecimals } from "lib/legacy";
import { applyFactor, parseValue } from "lib/numbers";
import { useState } from "react";

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

export const tradeTypeLabels = {
  [TradeType.Long]: t`Long`,
  [TradeType.Short]: t`Short`,
  [TradeType.Swap]: t`Swap`,
};

export const tradeModeLabels = {
  [TradeMode.Market]: t`Market`,
  [TradeMode.Limit]: t`Limit`,
  [TradeMode.Trigger]: t`Trigger`,
};

export const avaialbleModes = {
  [TradeType.Long]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
  [TradeType.Short]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
  [TradeType.Swap]: [TradeMode.Market, TradeMode.Limit],
};

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

export type SwapTriggerRatioState = {
  inputValue: string;
  setInputValue: (v: string) => void;
  ratio: BigNumber;
  biggestSide: "from" | "to";
  markRatio: BigNumber;
};

export function useSwapTriggerRatioState(p: {
  isAllowed: boolean;
  fromTokenPrice?: BigNumber;
  toTokenPrice?: BigNumber;
}): SwapTriggerRatioState | undefined {
  const [inputValue, setInputValue] = useState("");

  if (!p.isAllowed || !p.fromTokenPrice || !p.toTokenPrice) return undefined;

  const ratio = parseValue(inputValue || "0", USD_DECIMALS)!;

  const biggestSide = p.fromTokenPrice.gt(p.toTokenPrice) ? "from" : "to";

  let markRatio =
    biggestSide === "from"
      ? p.fromTokenPrice.mul(PRECISION).div(p.toTokenPrice)
      : p.toTokenPrice.mul(PRECISION).div(p.fromTokenPrice);

  return {
    inputValue,
    setInputValue,
    ratio,
    biggestSide,
    markRatio,
  };
}

export type Fees = {
  executionFee?: ExecutionFeeParams;
  totalFeeUsd: BigNumber;
  positionPriceImpact?: any;
  isHighPriceImpactAccepted?: boolean;
  isHighPriceImpact?: boolean;
  setIsHighPriceImpactAccepted?: (v: boolean) => void;
  swapPath?: any[];
  swapFeeUsd?: BigNumber;
};
