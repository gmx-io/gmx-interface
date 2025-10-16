import { t } from "@lingui/macro";
import { ethers } from "ethers";
import mapKeys from "lodash/mapKeys";
import { useEnsName } from "wagmi";

import { CHAIN_ID, ETH_MAINNET, getExplorerUrl } from "config/chains";
import { getContract } from "config/contracts";
import { isLocal } from "config/env";
import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { PRODUCTION_HOST } from "config/links";
import { TokenInfo, getMostAbundantStableToken } from "domain/tokens";
import { getTokenInfo } from "domain/tokens/utils";

import { isValidTimestamp } from "./dates";
import {
  PRECISION,
  bigNumberify,
  calculateDisplayDecimals,
  deserializeBigIntsInObject,
  expandDecimals,
  formatAmount,
  adjustForDecimals,
} from "./numbers";

export { adjustForDecimals } from "./numbers";

const { ZeroAddress } = ethers;

// use a random placeholder account instead of the zero address as the zero address might have tokens
export const PLACEHOLDER_ACCOUNT = ethers.Wallet.createRandom().address;

export const MIN_PROFIT_TIME = 0;

export const USDG_ADDRESS = getContract(CHAIN_ID, "USDG");

export const MAX_PRICE_DEVIATION_BASIS_POINTS = 750;
export const SECONDS_PER_YEAR = 31536000n;
export const USDG_DECIMALS = 18;
export const DEPOSIT_FEE = 30n;
export const DUST_BNB = "2000000000000000";
export const DUST_USD = expandDecimals(1, USD_DECIMALS);
export const GLP_DECIMALS = 18;
export const GMX_DECIMALS = 18;
export const GM_DECIMALS = 18;
export const DEFAULT_MAX_USDG_AMOUNT = expandDecimals(200 * 1000 * 1000, 18);

export const TAX_BASIS_POINTS = 60;
export const STABLE_TAX_BASIS_POINTS = 5;
export const MINT_BURN_FEE_BASIS_POINTS = 25;
export const SWAP_FEE_BASIS_POINTS = 25;
export const STABLE_SWAP_FEE_BASIS_POINTS = 1;
export const MARGIN_FEE_BASIS_POINTS = 10;

export const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS);

export const GLP_COOLDOWN_DURATION = 0;
export const THRESHOLD_REDEMPTION_VALUE = expandDecimals(993, 27); // 0.993
export const FUNDING_RATE_PRECISION = 1000000;

export const SWAP = "Swap";
export const INCREASE = "Increase";
export const DECREASE = "Decrease";
export const LONG = "Long";
export const SHORT = "Short";

export const MARKET = "Market";
export const LIMIT = "Limit";
export const STOP = "Stop";
export const LEVERAGE_ORDER_OPTIONS = [MARKET, LIMIT, STOP];
export const SWAP_ORDER_OPTIONS = [MARKET, LIMIT];
export const SWAP_OPTIONS = [LONG, SHORT, SWAP];
export const SWAP_OPTIONS_CLASSNAMES = {
  [LONG]: {
    active: "!bg-[#1E3445] border-b border-b-green-500",
    regular: "border-b border-b-[transparent]",
  },
  [SHORT]: {
    active: "!bg-[#392A46] border-b border-b-red-500",
    regular: "border-b border-b-[transparent]",
  },
  [SWAP]: {
    active: "!bg-[#252B57] border-b border-b-blue-300",
    regular: "border-b border-b-[transparent]",
  },
};

export const REFERRAL_CODE_QUERY_PARAM = "ref";
export const MAX_REFERRAL_CODE_LENGTH = 20;

export const MIN_PROFIT_BIPS = 0;

// Removed: TOKEN_IMG_DIR (unused)

export function deserialize(data) {
  return deserializeBigIntsInObject(data);
}

export function isHomeSite() {
  return import.meta.env.VITE_APP_IS_HOME_SITE === "true";
}

export function getMarginFee(sizeDelta: bigint) {
  if (sizeDelta === undefined) {
    return 0n;
  }
  const afterFeeUsd =
    (sizeDelta * (BASIS_POINTS_DIVISOR_BIGINT - BigInt(MARGIN_FEE_BASIS_POINTS))) / BASIS_POINTS_DIVISOR_BIGINT;
  return sizeDelta - afterFeeUsd;
}

export function isTriggerRatioInverted(fromTokenInfo, toTokenInfo) {
  if (!toTokenInfo || !fromTokenInfo) return false;
  if (toTokenInfo.isStable || toTokenInfo.isUsdg) return true;
  if (toTokenInfo.maxPrice) return toTokenInfo.maxPrice < fromTokenInfo.maxPrice;
  return false;
}

export function getExchangeRate(tokenAInfo, tokenBInfo, inverted) {
  if (!tokenAInfo || !tokenAInfo.minPrice || !tokenBInfo || !tokenBInfo.maxPrice) {
    return;
  }
  if (inverted) {
    return (tokenAInfo.minPrice * PRECISION) / tokenBInfo.maxPrice;
  }
  return (tokenBInfo.maxPrice * PRECISION) / tokenAInfo.minPrice;
}

export function shouldInvertTriggerRatio(tokenA, tokenB) {
  if ((tokenB.isStable || tokenB.isUsdg) && !tokenA.isStable) return true;
  if (tokenB.maxPrice && tokenA.maxPrice && tokenB.maxPrice < tokenA.maxPrice) return true;
  return false;
}

export function getExchangeRateDisplay(rate, tokenA, tokenB, opts: { omitSymbols?: boolean } = {}) {
  if (!rate || rate == 0 || !tokenA || !tokenB) return "...";
  if (shouldInvertTriggerRatio(tokenA, tokenB)) {
    [tokenA, tokenB] = [tokenB, tokenA];
    rate = (PRECISION * PRECISION) / rate;
  }
  const rateDecimals = calculateDisplayDecimals(rate);
  const rateValue = formatAmount(rate, USD_DECIMALS, rateDecimals, true);
  if (opts.omitSymbols) {
    return rateValue;
  }
  return `${rateValue} ${tokenA.symbol} / ${tokenB.symbol}`;
}

const adjustForDecimalsFactory = (n: number) => (number: bigint) => {
  if (n === 0) {
    return number;
  }
  if (n > 0) {
    return number * expandDecimals(1, n);
  }
  return number / expandDecimals(1, -n);
};

export function getTargetUsdgAmount(token, usdgSupply: bigint, totalTokenWeights): bigint | undefined {
  if (!token || token.weight === undefined || usdgSupply === undefined) {
    return;
  }

  if (usdgSupply == 0n) {
    return 0n;
  }

  return (token.weight * usdgSupply) / totalTokenWeights;
}

export function getFeeBasisPoints(
  token: TokenInfo,
  tokenUsdgAmount: bigint | undefined,
  usdgDelta: bigint,
  feeBasisPoints: number | bigint,
  taxBasisPoints: number | bigint,
  increment: boolean,
  usdgSupply: bigint,
  totalTokenWeights
): number {
  if (!token || tokenUsdgAmount === undefined || usdgSupply === undefined || !totalTokenWeights) {
    return 0;
  }

  feeBasisPoints = BigInt(feeBasisPoints);
  taxBasisPoints = BigInt(taxBasisPoints);

  const initialAmount = tokenUsdgAmount;
  let nextAmount = initialAmount + usdgDelta;
  if (!increment) {
    nextAmount = usdgDelta > initialAmount ? 0n : initialAmount - usdgDelta;
  }

  const targetAmount = getTargetUsdgAmount(token, usdgSupply, totalTokenWeights);
  if (targetAmount === undefined) {
    return Number(feeBasisPoints);
  }

  const initialDiff = initialAmount > targetAmount ? initialAmount - targetAmount : targetAmount - initialAmount;
  const nextDiff = nextAmount > targetAmount ? nextAmount - targetAmount : targetAmount - nextAmount;

  if (nextDiff < initialDiff) {
    const rebateBps = (taxBasisPoints * initialDiff) / targetAmount;
    return rebateBps > feeBasisPoints ? 0 : Number(feeBasisPoints - rebateBps);
  }

  let averageDiff = (initialDiff + nextDiff) / 2n;
  if (averageDiff > targetAmount) {
    averageDiff = targetAmount;
  }
  const taxBps = (taxBasisPoints * averageDiff) / targetAmount;
  return Number(feeBasisPoints + taxBps);
}

export function getBuyGlpToAmount(fromAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: 0n, feeBasisPoints: 0 };
  if (!fromAmount || !swapTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue;
  }

  const swapToken = getTokenInfo(infoTokens, swapTokenAddress);
  if (!swapToken || swapToken.minPrice === undefined) {
    return defaultValue;
  }

  let glpAmount: bigint = (fromAmount * swapToken.minPrice) / glpPrice;
  glpAmount = adjustForDecimals(glpAmount, swapToken.decimals, USDG_DECIMALS);

  let usdgAmount = (fromAmount * swapToken.minPrice) / PRECISION;
  usdgAmount = adjustForDecimals(usdgAmount, swapToken.decimals, USDG_DECIMALS);
  const feeBasisPoints = getFeeBasisPoints(
    swapToken,
    swapToken.usdgAmount,
    usdgAmount,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    true,
    usdgSupply,
    totalTokenWeights
  );

  glpAmount = (glpAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints)) / BASIS_POINTS_DIVISOR_BIGINT;

  return { amount: glpAmount, feeBasisPoints };
}

export function getSellGlpFromAmount(toAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: 0n, feeBasisPoints: 0 };
  if (!toAmount || !swapTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue;
  }

  const swapToken = getTokenInfo(infoTokens, swapTokenAddress);
  if (!swapToken || swapToken.maxPrice === undefined) {
    return defaultValue;
  }

  let glpAmount = (toAmount * swapToken.maxPrice) / glpPrice;
  glpAmount = adjustForDecimals(glpAmount, swapToken.decimals, USDG_DECIMALS);

  let usdgAmount = (toAmount * swapToken.maxPrice) / PRECISION;
  usdgAmount = adjustForDecimals(usdgAmount, swapToken.decimals, USDG_DECIMALS);

  // in the Vault contract, the USDG supply is reduced before the fee basis points
  // is calculated
  usdgSupply = usdgSupply - usdgAmount;

  // in the Vault contract, the token.usdgAmount is reduced before the fee basis points
  // is calculated
  const feeBasisPoints = getFeeBasisPoints(
    swapToken,
    swapToken?.usdgAmount === undefined ? undefined : swapToken.usdgAmount - usdgAmount,
    usdgAmount,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    false,
    usdgSupply,
    totalTokenWeights
  );

  glpAmount = (glpAmount * BASIS_POINTS_DIVISOR_BIGINT) / (BASIS_POINTS_DIVISOR_BIGINT - BigInt(feeBasisPoints));

  return { amount: glpAmount, feeBasisPoints };
}

export function getBuyGlpFromAmount(
  toAmount,
  fromTokenAddress,
  infoTokens,
  glpPrice: bigint,
  usdgSupply,
  totalTokenWeights
) {
  const defaultValue = { amount: 0n };
  if (!toAmount || !fromTokenAddress || !infoTokens || glpPrice === undefined || !usdgSupply || !totalTokenWeights) {
    return defaultValue;
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  if (!fromToken || fromToken.minPrice === undefined) {
    return defaultValue;
  }

  let fromAmount = (toAmount * glpPrice) / fromToken.minPrice;
  fromAmount = adjustForDecimals(fromAmount, GLP_DECIMALS, fromToken.decimals);

  const usdgAmount = (toAmount * glpPrice) / PRECISION;
  const feeBasisPoints = getFeeBasisPoints(
    fromToken,
    fromToken.usdgAmount,
    usdgAmount,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    true,
    usdgSupply,
    totalTokenWeights
  );

  fromAmount = (fromAmount * BASIS_POINTS_DIVISOR_BIGINT) / BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints);

  return { amount: fromAmount, feeBasisPoints };
}

export function getSellGlpToAmount(
  toAmount,
  fromTokenAddress,
  infoTokens,
  glpPrice: bigint,
  usdgSupply,
  totalTokenWeights
) {
  const defaultValue = { amount: 0n };
  if (!toAmount || !fromTokenAddress || !infoTokens || glpPrice === undefined || !usdgSupply || !totalTokenWeights) {
    return defaultValue;
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  if (!fromToken || fromToken.maxPrice === undefined) {
    return defaultValue;
  }

  let fromAmount = (toAmount * glpPrice) / fromToken.maxPrice;
  fromAmount = adjustForDecimals(fromAmount, GLP_DECIMALS, fromToken.decimals);

  const usdgAmount = (toAmount * glpPrice) / PRECISION;

  // in the Vault contract, the USDG supply is reduced before the fee basis points
  // is calculated
  usdgSupply = usdgSupply - usdgAmount;

  // in the Vault contract, the token.usdgAmount is reduced before the fee basis points
  // is calculated
  const feeBasisPoints = getFeeBasisPoints(
    fromToken,
    fromToken?.usdgAmount !== undefined ? fromToken.usdgAmount - usdgAmount : undefined,
    usdgAmount,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    false,
    usdgSupply,
    totalTokenWeights
  );

  fromAmount = (fromAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints)) / BASIS_POINTS_DIVISOR_BIGINT;

  return { amount: fromAmount, feeBasisPoints };
}

export function getNextFromAmount(
  chainId,
  toAmount,
  fromTokenAddress,
  toTokenAddress,
  infoTokens,
  toTokenPriceUsd,
  ratio: bigint | undefined,
  usdgSupply,
  totalTokenWeights,
  forSwap
) {
  const defaultValue = { amount: 0n };

  if (!toAmount || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue;
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: toAmount };
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  const toToken = getTokenInfo(infoTokens, toTokenAddress);

  if (fromToken.isNative && toToken.isWrapped) {
    return { amount: toAmount };
  }

  if (fromToken.isWrapped && toToken.isNative) {
    return { amount: toAmount };
  }

  // the realtime price should be used if it is for a transaction to open / close a position
  // or if the transaction involves doing a swap and opening / closing a position
  // otherwise use the contract price instead of realtime price for swaps

  let fromTokenMinPrice;
  if (fromToken) {
    fromTokenMinPrice = forSwap ? fromToken.contractMinPrice : fromToken.minPrice;
  }

  let toTokenMaxPrice;
  if (toToken) {
    toTokenMaxPrice = forSwap ? toToken.contractMaxPrice : toToken.maxPrice;
  }

  if (!fromToken || !fromTokenMinPrice || !toToken || !toTokenMaxPrice) {
    return defaultValue;
  }

  const adjustDecimals = adjustForDecimalsFactory(fromToken.decimals - toToken.decimals);

  let fromAmountBasedOnRatio = 0n;
  if (ratio !== undefined && ratio !== 0n) {
    fromAmountBasedOnRatio = (toAmount * ratio) / PRECISION;
  }

  const fromAmount: bigint = ratio ? fromAmountBasedOnRatio : BigInt(toAmount * toTokenMaxPrice) / fromTokenMinPrice;

  let usdgAmount = (fromAmount * fromTokenMinPrice) / PRECISION;
  usdgAmount = adjustForDecimals(usdgAmount, toToken.decimals, USDG_DECIMALS);
  const swapFeeBasisPoints =
    fromToken.isStable && toToken.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS;
  const taxBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS;
  const feeBasisPoints0 = getFeeBasisPoints(
    fromToken,
    fromToken.usdgAmount,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    true,
    usdgSupply,
    totalTokenWeights
  );
  const feeBasisPoints1 = getFeeBasisPoints(
    toToken,
    toToken.usdgAmount,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    false,
    usdgSupply,
    totalTokenWeights
  );
  const feeBasisPoints = feeBasisPoints0 > feeBasisPoints1 ? feeBasisPoints0 : feeBasisPoints1;

  return {
    amount: adjustDecimals(
      (fromAmount * BASIS_POINTS_DIVISOR_BIGINT) / (BASIS_POINTS_DIVISOR_BIGINT - BigInt(feeBasisPoints))
    ),
    feeBasisPoints,
  };
}

export function getNextToAmount(
  chainId: number,
  fromAmount: bigint,
  fromTokenAddress: string,
  toTokenAddress: string,
  infoTokens,
  toTokenPriceUsd: bigint,
  ratio: bigint,
  usdgSupply: bigint,
  totalTokenWeights,
  forSwap
) {
  const defaultValue = { amount: 0n };
  if (fromAmount === undefined || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue;
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: fromAmount };
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  const toToken = getTokenInfo(infoTokens, toTokenAddress);

  if (fromToken.isNative && toToken.isWrapped) {
    return { amount: fromAmount };
  }

  if (fromToken.isWrapped && toToken.isNative) {
    return { amount: fromAmount };
  }

  // the realtime price should be used if it is for a transaction to open / close a position
  // or if the transaction involves doing a swap and opening / closing a position
  // otherwise use the contract price instead of realtime price for swaps

  let fromTokenMinPrice: undefined | bigint = 0n;
  if (fromToken) {
    fromTokenMinPrice = forSwap ? fromToken.contractMinPrice : fromToken.minPrice;
  }

  let toTokenMaxPrice: undefined | bigint = 0n;
  if (toToken) {
    toTokenMaxPrice = forSwap ? toToken.contractMaxPrice : toToken.maxPrice;
  }

  if (fromTokenMinPrice === undefined || toTokenMaxPrice === undefined) {
    return defaultValue;
  }

  const adjustDecimals = adjustForDecimalsFactory(toToken.decimals - fromToken.decimals);

  let toAmountBasedOnRatio = 0n;
  if (typeof ratio === "bigint" && ratio !== 0n) {
    toAmountBasedOnRatio = (fromAmount * PRECISION) / ratio;
  }

  if (toTokenAddress === USDG_ADDRESS) {
    const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable);

    if (ratio !== undefined && ratio !== 0n) {
      const toAmount = toAmountBasedOnRatio;
      return {
        amount: adjustDecimals(
          (toAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints)) / BASIS_POINTS_DIVISOR_BIGINT
        ),
        feeBasisPoints,
      };
    }

    const toAmount = (fromAmount * fromTokenMinPrice) / PRECISION;

    return {
      amount: adjustDecimals((toAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints)) / BASIS_POINTS_DIVISOR_BIGINT),
      feeBasisPoints,
    };
  }

  if (fromTokenAddress === USDG_ADDRESS) {
    const redemptionValue = toToken.redemptionAmount
      ? (toToken.redemptionAmount * (toTokenPriceUsd ?? toTokenMaxPrice)) / expandDecimals(1, toToken.decimals)
      : undefined;

    if (redemptionValue !== undefined && redemptionValue > THRESHOLD_REDEMPTION_VALUE) {
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable);

      const toAmount = ratio
        ? toAmountBasedOnRatio
        : (fromAmount * (toToken.redemptionAmount ?? 0n)) / expandDecimals(1, toToken.decimals);

      return {
        amount: adjustDecimals(
          (toAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints)) / BASIS_POINTS_DIVISOR_BIGINT
        ),
        feeBasisPoints,
      };
    }

    const expectedAmount = fromAmount;

    const stableToken = getMostAbundantStableToken(chainId, infoTokens);
    if (stableToken?.availableAmount === undefined || stableToken.availableAmount < expectedAmount) {
      const toAmount = ratio
        ? toAmountBasedOnRatio
        : (fromAmount * (toToken.redemptionAmount ?? 0n)) / expandDecimals(1, toToken.decimals);
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable);
      return {
        amount: adjustDecimals(
          (toAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints)) / BASIS_POINTS_DIVISOR_BIGINT
        ),
        feeBasisPoints,
      };
    }

    const feeBasisPoints0 = getSwapFeeBasisPoints(true);
    const feeBasisPoints1 = getSwapFeeBasisPoints(false);

    if (ratio !== undefined && ratio !== 0n) {
      const toAmount =
        (toAmountBasedOnRatio * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints0 - feeBasisPoints1)) /
        BASIS_POINTS_DIVISOR_BIGINT;

      return {
        amount: adjustDecimals(toAmount),
        path: [USDG_ADDRESS, stableToken.address, toToken.address],
        feeBasisPoints: feeBasisPoints0 + feeBasisPoints1,
      };
    }

    // get toAmount for USDG => stableToken
    let toAmount = stableToken.maxPrice === undefined ? 0n : (fromAmount * PRECISION) / stableToken.maxPrice;
    // apply USDG => stableToken fees
    toAmount = (toAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints0)) / BASIS_POINTS_DIVISOR_BIGINT;

    // get toAmount for stableToken => toToken
    toAmount = (toAmount * (stableToken.minPrice ?? 0n)) / (toTokenPriceUsd ?? toTokenMaxPrice);
    // apply stableToken => toToken fees
    toAmount = (toAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints1)) / BASIS_POINTS_DIVISOR_BIGINT;

    return {
      amount: adjustDecimals(toAmount),
      path: [USDG_ADDRESS, stableToken.address, toToken.address],
      feeBasisPoints: feeBasisPoints0 + feeBasisPoints1,
    };
  }

  const toAmount = ratio
    ? toAmountBasedOnRatio
    : (fromAmount * fromTokenMinPrice) / (toTokenPriceUsd ?? toTokenMaxPrice);

  let usdgAmount = (fromAmount * fromTokenMinPrice) / PRECISION;
  usdgAmount = adjustForDecimals(usdgAmount, fromToken.decimals, USDG_DECIMALS);
  const swapFeeBasisPoints =
    fromToken.isStable && toToken.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS;
  const taxBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS;
  const feeBasisPoints0 = getFeeBasisPoints(
    fromToken,
    fromToken.usdgAmount,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    true,
    usdgSupply,
    totalTokenWeights
  );
  const feeBasisPoints1 = getFeeBasisPoints(
    toToken,
    toToken.usdgAmount,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    false,
    usdgSupply,
    totalTokenWeights
  );
  const feeBasisPoints = feeBasisPoints0 > feeBasisPoints1 ? feeBasisPoints0 : feeBasisPoints1;

  return {
    amount: adjustDecimals((toAmount * BigInt(BASIS_POINTS_DIVISOR - feeBasisPoints)) / BASIS_POINTS_DIVISOR_BIGINT),
    feeBasisPoints,
  };
}

export function getProfitPrice(closePrice, position) {
  let profitPrice;
  if (position && position.averagePrice && closePrice) {
    profitPrice = position.isLong
      ? mulDiv(position.averagePrice, BigInt(BASIS_POINTS_DIVISOR + MIN_PROFIT_BIPS), BASIS_POINTS_DIVISOR_BIGINT)
      : mulDiv(position.averagePrice, BigInt(BASIS_POINTS_DIVISOR - MIN_PROFIT_BIPS), BASIS_POINTS_DIVISOR_BIGINT);
  }
  return profitPrice;
}

export function calculatePositionDelta(
  price: bigint,
  {
    size,
    collateral,
    isLong,
    averagePrice,
    lastIncreasedTime,
  }: {
    size: bigint;
    collateral: bigint;
    isLong: boolean;
    averagePrice: bigint;
    lastIncreasedTime: number;
  },
  sizeDelta?: bigint
) {
  if (sizeDelta === undefined) {
    sizeDelta = size;
  }
  const priceDelta = averagePrice > price ? averagePrice - price : price - averagePrice;
  let delta = mulDiv(sizeDelta, priceDelta, averagePrice)!;
  const pendingDelta = delta;

  const minProfitExpired = lastIncreasedTime + MIN_PROFIT_TIME < Date.now() / 1000;
  const hasProfit = isLong ? price > averagePrice : price < averagePrice;
  if (!minProfitExpired && hasProfit && delta * BASIS_POINTS_DIVISOR_BIGINT <= size * BigInt(MIN_PROFIT_BIPS)) {
    delta = 0n;
  }

  const deltaPercentage = mulDiv(delta, BASIS_POINTS_DIVISOR_BIGINT, collateral);
  const pendingDeltaPercentage = mulDiv(pendingDelta, BASIS_POINTS_DIVISOR_BIGINT, collateral);

  return {
    delta,
    pendingDelta,
    pendingDeltaPercentage,
    hasProfit,
    deltaPercentage,
  };
}

export function getDeltaStr({ delta, deltaPercentage, hasProfit }) {
  let deltaStr;
  let deltaPercentageStr;

  if (delta > 0) {
    deltaStr = hasProfit ? "+" : "-";
    deltaPercentageStr = hasProfit ? "+" : "-";
  } else {
    deltaStr = "";
    deltaPercentageStr = "";
  }
  deltaStr += `$\u200a${formatAmount(delta, USD_DECIMALS, 2, true)}`;
  deltaPercentageStr += `${formatAmount(deltaPercentage, 2, 2)}%`;

  return { deltaStr, deltaPercentageStr };
}

export function getFundingFee(data: { size: bigint; entryFundingRate?: bigint; cumulativeFundingRate?: bigint }) {
  let { entryFundingRate, cumulativeFundingRate, size } = data;

  if (entryFundingRate !== undefined && cumulativeFundingRate !== undefined) {
    return mulDiv(size, cumulativeFundingRate - entryFundingRate, BigInt(FUNDING_RATE_PRECISION));
  }

  return;
}

export function getPositionKey(
  account: string,
  collateralTokenAddress: string,
  indexTokenAddress: string,
  isLong: boolean,
  nativeTokenAddress?: string
) {
  const tokenAddress0 = collateralTokenAddress === ZeroAddress ? nativeTokenAddress : collateralTokenAddress;
  const tokenAddress1 = indexTokenAddress === ZeroAddress ? nativeTokenAddress : indexTokenAddress;
  return account + ":" + tokenAddress0 + ":" + tokenAddress1 + ":" + isLong;
}

export function getPositionContractKey(account, collateralToken, indexToken, isLong) {
  return ethers.solidityPackedKeccak256(
    ["address", "address", "address", "bool"],
    [account, collateralToken, indexToken, isLong]
  );
}

export function getSwapFeeBasisPoints(isStable) {
  return isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS;
}

export function shortenAddress(address, length, padStart = 1) {
  if (!length) {
    return "";
  }
  if (!address) {
    return address;
  }
  if (address.length < 10) {
    return address;
  }
  if (length >= address.length) {
    return address;
  }
  let left = Math.floor((length - 3) / 2) + (padStart || 0);
  return address.substring(0, left) + "..." + address.substring(address.length - (length - (left + 3)), address.length);
}

export function useENS(address) {
  const { data } = useEnsName({
    address,
    chainId: ETH_MAINNET,
  });
  const ensName = data || undefined;

  return { ensName };
}

// Removed: order parsing helpers (unused)
// Removed: order parsing helpers (unused)

// Removed: getOrderKey (unused)

// Removed: useAccountOrders and related order parsing helpers (unused)

export function getAccountUrl(chainId: number, account: string) {
  if (!account) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "address/" + account;
}

// Removed: isMobileDevice (unused)

export const CHART_PERIODS = {
  "1m": 60,
  "5m": 60 * 5,
  "15m": 60 * 15,
  "1h": 60 * 60,
  "4h": 60 * 60 * 4,
  "1d": 60 * 60 * 24,
  "1y": 60 * 60 * 24 * 365,
};

export function getTotalVolumeSum(volumes) {
  if (!volumes || volumes.length === 0) {
    return;
  }

  let volume = 0n;

  for (let i = 0; i < volumes.length; i++) {
    volume = volume + BigInt(volumes[i].data.volume);
  }

  return volume;
}

export function getBalanceAndSupplyData(balances: bigint[] | undefined): {
  balanceData: Partial<Record<"gmx" | "esGmx" | "glp" | "stakedGmxTracker", bigint>>;
  supplyData: Partial<Record<"gmx" | "esGmx" | "glp" | "stakedGmxTracker", bigint>>;
} {
  if (!balances || balances.length === 0) {
    return { balanceData: {}, supplyData: {} };
  }

  const keys = ["gmx", "esGmx", "glp", "stakedGmxTracker"];
  const balanceData = {};
  const supplyData = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    balanceData[key] = balances[i * propsLength];
    supplyData[key] = balances[i * propsLength + 1];
  }

  return { balanceData, supplyData };
}

export function getDepositBalanceData(
  depositBalances: bigint[] | undefined
):
  | Record<
      | "gmxInStakedGmx"
      | "esGmxInStakedGmx"
      | "stakedGmxInBonusGmx"
      | "bonusGmxInFeeGmx"
      | "bnGmxInFeeGmx"
      | "glpInStakedGlp",
      bigint
    >
  | undefined {
  if (!depositBalances || depositBalances.length === 0) {
    return;
  }

  const keys = [
    "gmxInStakedGmx",
    "esGmxInStakedGmx",
    "stakedGmxInBonusGmx",
    "bonusGmxInFeeGmx",
    "bnGmxInFeeGmx",
    "glpInStakedGlp",
  ];
  const data = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = depositBalances[i];
  }

  return data as any;
}

type RawVestingData = {
  gmxVester: {
    pairAmount: bigint;
    vestedAmount: bigint;
    escrowedBalance: bigint;
    claimedAmounts: bigint;
    claimable: bigint;
    maxVestableAmount: bigint;
    averageStakedAmount: bigint;
  };
  gmxVesterPairAmount: bigint;
  gmxVesterVestedAmount: bigint;
  gmxVesterEscrowedBalance: bigint;
  gmxVesterClaimSum: bigint;
  gmxVesterClaimable: bigint;
  gmxVesterMaxVestableAmount: bigint;
  gmxVesterAverageStakedAmount: bigint;
  glpVester: {
    pairAmount: bigint;
    vestedAmount: bigint;
    escrowedBalance: bigint;
    claimedAmounts: bigint;
    claimable: bigint;
    maxVestableAmount: bigint;
    averageStakedAmount: bigint;
  };
  glpVesterPairAmount: bigint;
  glpVesterVestedAmount: bigint;
  glpVesterEscrowedBalance: bigint;
  glpVesterClaimSum: bigint;
  glpVesterClaimable: bigint;
  glpVesterMaxVestableAmount: bigint;
  glpVesterAverageStakedAmount: bigint;
  affiliateVester: {
    pairAmount: bigint;
    vestedAmount: bigint;
    escrowedBalance: bigint;
    claimedAmounts: bigint;
    claimable: bigint;
    maxVestableAmount: bigint;
    averageStakedAmount: bigint;
  };
  affiliateVesterPairAmount: bigint;
  affiliateVesterVestedAmount: bigint;
  affiliateVesterEscrowedBalance: bigint;
  affiliateVesterClaimSum: bigint;
  affiliateVesterClaimable: bigint;
  affiliateVesterMaxVestableAmount: bigint;
  affiliateVesterAverageStakedAmount: bigint;
};

export function getVestingData(vestingInfo): RawVestingData | undefined {
  if (!vestingInfo || vestingInfo.length === 0) {
    return undefined;
  }
  const propsLength = 7;
  const data: Partial<RawVestingData> = {};

  const keys = ["gmxVester", "glpVester", "affiliateVester"] as const;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as (typeof keys)[number];
    data[key] = {
      pairAmount: vestingInfo[i * propsLength],
      vestedAmount: vestingInfo[i * propsLength + 1],
      escrowedBalance: vestingInfo[i * propsLength + 2],
      claimedAmounts: vestingInfo[i * propsLength + 3],
      claimable: vestingInfo[i * propsLength + 4],
      maxVestableAmount: vestingInfo[i * propsLength + 5],
      averageStakedAmount: vestingInfo[i * propsLength + 6],
    };

    data[key + "PairAmount"] = data[key]!.pairAmount;
    data[key + "VestedAmount"] = data[key]!.vestedAmount;
    data[key + "EscrowedBalance"] = data[key]!.escrowedBalance;
    data[key + "ClaimSum"] = data[key]!.claimedAmounts + data[key]!.claimable;
    data[key + "Claimable"] = data[key]!.claimable;
    data[key + "MaxVestableAmount"] = data[key]!.maxVestableAmount;
    data[key + "AverageStakedAmount"] = data[key]!.averageStakedAmount;
  }

  return data as RawVestingData;
}

export function getStakingData(stakingInfo: bigint[] | undefined):
  | undefined
  | Record<
      | "stakedGmxTracker"
      | "bonusGmxTracker"
      | "feeGmxTracker"
      | "stakedGlpTracker"
      | "feeGlpTracker"
      | "extendedGmxTracker",
      {
        claimable: bigint;
        tokensPerInterval: bigint;
        averageStakedAmounts: bigint;
        cumulativeRewards: bigint;
        totalSupply: bigint;
      }
    > {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = [
    "stakedGmxTracker",
    "bonusGmxTracker",
    "feeGmxTracker",
    "stakedGlpTracker",
    "feeGlpTracker",
    "extendedGmxTracker",
  ];
  const data = {};
  const propsLength = 5;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
      averageStakedAmounts: stakingInfo[i * propsLength + 2],
      cumulativeRewards: stakingInfo[i * propsLength + 3],
      totalSupply: stakingInfo[i * propsLength + 4],
    };
  }

  return data as any;
}

export type ProcessedData = Partial<{
  gmxBalance: bigint;
  gmxBalanceUsd: bigint;
  gmxSupply: bigint;
  gmxSupplyUsd: bigint;
  stakedGmxSupply: bigint;
  stakedGmxSupplyUsd: bigint;
  gmxInStakedGmx: bigint;
  gmxInStakedGmxUsd: bigint;
  esGmxBalance: bigint;
  esGmxBalanceUsd: bigint;
  stakedGmxTrackerSupply: bigint;
  stakedGmxTrackerSupplyUsd: bigint;
  stakedEsGmxSupply: bigint;
  stakedEsGmxSupplyUsd: bigint;
  esGmxInStakedGmx: bigint;
  esGmxInStakedGmxUsd: bigint;
  bonusGmxInFeeGmx: bigint;
  feeGmxSupply: bigint;
  feeGmxSupplyUsd: bigint;
  stakedGmxTrackerRewards: bigint;
  stakedGmxTrackerRewardsUsd: bigint;
  extendedGmxTrackerRewards: bigint;
  extendedGmxTrackerRewardsUsd: bigint;
  feeGmxTrackerRewards: bigint;
  feeGmxTrackerRewardsUsd: bigint;
  stakedGmxTrackerAnnualRewardsUsd: bigint;
  extendedGmxTrackerAnnualRewardsUsd: bigint;
  feeGmxTrackerAnnualRewardsUsd: bigint;
  gmxAprTotal: bigint;
  totalStakingRewardsUsd: bigint;
  glpSupply: bigint;
  glpPrice: bigint;
  glpSupplyUsd: bigint;
  glpBalance: bigint;
  glpBalanceUsd: bigint;
  stakedGlpTrackerRewards: bigint;
  stakedGlpTrackerRewardsUsd: bigint;
  feeGlpTrackerRewards: bigint;
  feeGlpTrackerRewardsUsd: bigint;
  stakedGlpTrackerAnnualRewardsUsd: bigint;
  glpAprForEsGmx: bigint;
  feeGlpTrackerAnnualRewardsUsd: bigint;
  glpAprForNativeToken: bigint;
  gmxAprForGmx: bigint;
  glpAprTotal: bigint;
  totalGlpRewardsUsd: bigint;
  totalEsGmxRewards: bigint;
  totalEsGmxRewardsUsd: bigint;
  totalGmxRewards: bigint;
  totalGmxRewardsUsd: bigint;
  gmxVesterRewards: bigint;
  glpVesterRewards: bigint;
  totalVesterRewards: bigint;
  totalVesterRewardsUsd: bigint;
  totalNativeTokenRewards: bigint;
  totalNativeTokenRewardsUsd: bigint;
  totalRewardsUsd: bigint;
}> & {
  gmxAprForEsGmx: bigint;
  gmxAprForNativeToken: bigint;
};

export function getProcessedData(
  balanceData: Partial<Record<"glp" | "gmx" | "esGmx" | "stakedGmxTracker", bigint>> | undefined,
  supplyData: Partial<Record<"gmx" | "esGmx" | "glp" | "stakedGmxTracker", bigint>> | undefined,
  depositBalanceData:
    | Record<
        | "gmxInStakedGmx"
        | "esGmxInStakedGmx"
        | "stakedGmxInBonusGmx"
        | "bonusGmxInFeeGmx"
        | "bnGmxInFeeGmx"
        | "glpInStakedGlp",
        bigint
      >
    | undefined,
  stakingData:
    | Record<
        | "stakedGmxTracker"
        | "bonusGmxTracker"
        | "feeGmxTracker"
        | "stakedGlpTracker"
        | "feeGlpTracker"
        | "extendedGmxTracker",
        {
          claimable: bigint;
          tokensPerInterval: bigint;
          averageStakedAmounts: bigint;
          cumulativeRewards: bigint;
          totalSupply: bigint;
        }
      >
    | undefined,
  vestingData: RawVestingData | undefined,
  aum: bigint | undefined,
  nativeTokenPrice: bigint | undefined,
  stakedGmxSupply: bigint | undefined,
  gmxPrice: bigint | undefined,
  gmxSupply: string | undefined
): ProcessedData | undefined {
  if (
    !balanceData ||
    !supplyData ||
    !depositBalanceData ||
    !stakingData ||
    !vestingData ||
    aum === undefined ||
    nativeTokenPrice === undefined ||
    stakedGmxSupply === undefined ||
    gmxPrice === undefined ||
    !gmxSupply
  ) {
    return undefined;
  }
  const data: any = {};

  data.gmxBalance = balanceData.gmx;
  data.gmxBalanceUsd = mulDiv(balanceData.gmx, gmxPrice, expandDecimals(1, 18));

  data.gmxSupply = bigNumberify(gmxSupply);

  data.gmxSupplyUsd = mulDiv(data.gmxSupply, gmxPrice, expandDecimals(1, 18));
  data.stakedGmxSupply = stakedGmxSupply;
  data.stakedGmxSupplyUsd = mulDiv(stakedGmxSupply, gmxPrice, expandDecimals(1, 18));
  data.gmxInStakedGmx = depositBalanceData.gmxInStakedGmx;
  data.gmxInStakedGmxUsd = mulDiv(depositBalanceData.gmxInStakedGmx, gmxPrice, expandDecimals(1, 18));

  data.esGmxBalance = balanceData.esGmx;
  data.esGmxBalanceUsd = mulDiv(balanceData.esGmx, gmxPrice, expandDecimals(1, 18));

  data.stakedGmxTrackerSupply = supplyData.stakedGmxTracker;
  data.stakedGmxTrackerSupplyUsd = mulDiv(supplyData.stakedGmxTracker, gmxPrice, expandDecimals(1, 18));
  data.stakedEsGmxSupply = data.stakedGmxTrackerSupply - data.stakedGmxSupply;
  data.stakedEsGmxSupplyUsd = mulDiv(data.stakedEsGmxSupply, gmxPrice, expandDecimals(1, 18));

  data.esGmxInStakedGmx = depositBalanceData.esGmxInStakedGmx;
  data.esGmxInStakedGmxUsd = mulDiv(depositBalanceData.esGmxInStakedGmx, gmxPrice, expandDecimals(1, 18));

  data.bonusGmxInFeeGmx = depositBalanceData.bonusGmxInFeeGmx;
  data.feeGmxSupply = stakingData.feeGmxTracker.totalSupply;
  data.feeGmxSupplyUsd = mulDiv(data.feeGmxSupply, gmxPrice, expandDecimals(1, 18));

  data.stakedGmxTrackerRewards = stakingData.stakedGmxTracker.claimable;
  data.stakedGmxTrackerRewardsUsd = mulDiv(stakingData.stakedGmxTracker.claimable, gmxPrice, expandDecimals(1, 18));

  data.feeGmxTrackerRewards = stakingData.feeGmxTracker.claimable;
  data.feeGmxTrackerRewardsUsd = mulDiv(stakingData.feeGmxTracker.claimable, nativeTokenPrice, expandDecimals(1, 18));

  data.extendedGmxTrackerRewards = stakingData.extendedGmxTracker.claimable;
  data.extendedGmxTrackerSupply = stakingData.extendedGmxTracker.totalSupply;
  data.extendedGmxTrackerSupplyUsd = mulDiv(data.extendedGmxTrackerSupply, gmxPrice, expandDecimals(1, 18));
  data.extendedGmxTrackerRewardsUsd = mulDiv(stakingData.extendedGmxTracker.claimable, gmxPrice, expandDecimals(1, 18));
  data.extendedGmxTrackerAnnualRewardsUsd =
    (stakingData.extendedGmxTracker.tokensPerInterval * SECONDS_PER_YEAR * gmxPrice) / expandDecimals(1, 18);

  data.stakedGmxTrackerAnnualRewardsUsd =
    (stakingData.stakedGmxTracker.tokensPerInterval * SECONDS_PER_YEAR * gmxPrice) / expandDecimals(1, 18);
  data.gmxAprForEsGmx =
    data.stakedGmxTrackerSupplyUsd && data.stakedGmxTrackerSupplyUsd > 0
      ? mulDiv(data.stakedGmxTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.stakedGmxTrackerSupplyUsd)
      : 0n;
  data.feeGmxTrackerAnnualRewardsUsd =
    (stakingData.feeGmxTracker.tokensPerInterval * SECONDS_PER_YEAR * nativeTokenPrice) / expandDecimals(1, 18);

  data.gmxAprForNativeToken =
    data.feeGmxSupplyUsd && data.feeGmxSupplyUsd > 0
      ? mulDiv(data.feeGmxTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.feeGmxSupplyUsd)
      : 0n;

  data.gmxAprForGmx =
    data.feeGmxSupplyUsd && data.feeGmxSupplyUsd > 0
      ? mulDiv(data.extendedGmxTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.feeGmxSupplyUsd)
      : 0n;

  data.gmxAprTotal = data.gmxAprForNativeToken + data.gmxAprForGmx;

  data.totalStakingRewardsUsd =
    data.stakedGmxTrackerRewardsUsd + data.feeGmxTrackerRewardsUsd + data.extendedGmxTrackerRewardsUsd;

  data.glpSupply = supplyData.glp;
  data.glpPrice =
    data.glpSupply && data.glpSupply > 0 ? mulDiv(aum, expandDecimals(1, GLP_DECIMALS), data.glpSupply) : 0n;

  data.glpSupplyUsd = mulDiv(supplyData.glp, data.glpPrice, expandDecimals(1, 18));

  data.glpBalance = depositBalanceData.glpInStakedGlp;
  data.glpBalanceUsd = mulDiv(depositBalanceData.glpInStakedGlp, data.glpPrice, expandDecimals(1, GLP_DECIMALS));

  data.stakedGlpTrackerRewards = stakingData.stakedGlpTracker.claimable;
  data.stakedGlpTrackerRewardsUsd = mulDiv(stakingData.stakedGlpTracker.claimable, gmxPrice, expandDecimals(1, 18));

  data.feeGlpTrackerRewards = stakingData.feeGlpTracker.claimable;
  data.feeGlpTrackerRewardsUsd = mulDiv(stakingData.feeGlpTracker.claimable, nativeTokenPrice, expandDecimals(1, 18));

  data.stakedGlpTrackerAnnualRewardsUsd = mulDiv(
    stakingData.stakedGlpTracker.tokensPerInterval * SECONDS_PER_YEAR,
    gmxPrice,
    expandDecimals(1, 18)
  );
  data.glpAprForEsGmx =
    data.glpSupplyUsd && data.glpSupplyUsd > 0
      ? mulDiv(data.stakedGlpTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.glpSupplyUsd)
      : 0n;
  data.feeGlpTrackerAnnualRewardsUsd = mulDiv(
    stakingData.feeGlpTracker.tokensPerInterval * SECONDS_PER_YEAR,
    nativeTokenPrice,
    expandDecimals(1, 18)
  );
  data.glpAprForNativeToken =
    data.glpSupplyUsd && data.glpSupplyUsd > 0
      ? mulDiv(data.feeGlpTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.glpSupplyUsd)
      : 0n;
  data.glpAprTotal = data.glpAprForNativeToken + data.glpAprForEsGmx;

  data.totalGlpRewardsUsd = data.stakedGlpTrackerRewardsUsd + data.feeGlpTrackerRewardsUsd;

  data.totalEsGmxRewards = data.stakedGmxTrackerRewards + data.stakedGlpTrackerRewards;
  data.totalEsGmxRewardsUsd = data.stakedGmxTrackerRewardsUsd + data.stakedGlpTrackerRewardsUsd;

  data.gmxVesterRewards = vestingData.gmxVester.claimable;
  data.glpVesterRewards = vestingData.glpVester.claimable;
  data.totalVesterRewards = data.gmxVesterRewards + data.glpVesterRewards;
  data.totalVesterRewardsUsd = mulDiv(data.totalVesterRewards, gmxPrice, expandDecimals(1, 18));

  data.totalGmxRewards = data.totalVesterRewards + data.extendedGmxTrackerRewards;
  data.totalGmxRewardsUsd = data.totalVesterRewardsUsd + data.extendedGmxTrackerRewardsUsd;

  data.totalNativeTokenRewards = data.feeGmxTrackerRewards + data.feeGlpTrackerRewards;
  data.totalNativeTokenRewardsUsd = data.feeGmxTrackerRewardsUsd + data.feeGlpTrackerRewardsUsd;

  data.totalRewardsUsd = data.totalEsGmxRewardsUsd + data.totalNativeTokenRewardsUsd + data.totalGmxRewardsUsd;

  data.avgGMXAprTotal = data.gmxAprTotal ? data.gmxAprTotal + (data.avgBoostAprForNativeToken ?? 0n) : undefined;

  return data;
}

export function getPageTitle(data) {
  const title = t`Decentralized Perpetual Exchange | GMX`;
  return `${data} | ${title}`;
}

export function isHashZero(value) {
  return value === ethers.ZeroHash;
}
export function isAddressZero(value) {
  return value === ethers.ZeroAddress;
}

export function getHomeUrl() {
  if (isLocal()) {
    return "http://localhost:3010";
  }

  return "https://gmx.io";
}

export function getAppBaseUrl() {
  if (isLocal()) {
    return "http://localhost:3011/#";
  }

  return PRODUCTION_HOST;
}

export function getRootShareApiUrl() {
  if (isLocal()) {
    return "https://gmxs.vercel.app";
  }

  return "https://share.gmx.io";
}

export function getTradePageUrl() {
  if (isLocal()) {
    return "http://localhost:3011/#/trade";
  }

  return PRODUCTION_HOST + "/#/trade";
}

// Resolves all images in the folder that match the pattern and store them as `fileName -> path` pairs
const imageStaticMap = mapKeys(
  import.meta.glob("img/*.*", {
    query: "?url",
    import: "default",
    eager: true,
  }),
  (_, key) => key.split("/").pop()
);

export function importImage(name) {
  if (name in imageStaticMap) {
    return imageStaticMap[name] as string;
  }

  const pngName = name.replace(/_\d+\.svg$/, ".png");
  if (pngName in imageStaticMap) {
    return imageStaticMap[pngName] as string;
  }
  throw new Error(`Image ${name} not found`);
}

export function getTwitterIntentURL(text, url = "", hashtag = "") {
  let finalURL = "https://twitter.com/intent/tweet?text=";
  if (text.length > 0) {
    finalURL += Array.isArray(text) ? text.map((t) => encodeURIComponent(t)).join("%0a%0a") : encodeURIComponent(text);
    if (hashtag.length > 0) {
      finalURL += "&hashtags=" + encodeURIComponent(hashtag.replace(/#/g, ""));
    }
    if (url.length > 0) {
      finalURL += "&url=" + encodeURIComponent(url);
    }
  }
  return finalURL;
}

export function getPositionForOrder(account, order, positionsMap) {
  const key = getPositionKey(account, order.collateralToken, order.indexToken, order.isLong);

  const position = positionsMap[key];

  return position && position.size && position.size > 0 ? position : null;
}

export function getOrderError(account, order, positionsMap, position) {
  if (order.type !== DECREASE) {
    return;
  }

  const positionForOrder = position ? position : getPositionForOrder(account, order, positionsMap);

  if (!positionForOrder) {
    return t`No open position, order cannot be executed unless a position is opened`;
  }
  if (positionForOrder.size < order.sizeDelta) {
    return t`Order size is bigger than position, will only be executable if position increases`;
  }

  if (positionForOrder.size > order.sizeDelta) {
    if (positionForOrder.size - order.sizeDelta < positionForOrder.collateral - order.collateralDelta) {
      return t`Order cannot be executed as it would reduce the position's leverage below 1`;
    }
    if (positionForOrder.size - order.sizeDelta < expandDecimals(5, USD_DECIMALS)) {
      return t`Order cannot be executed as the remaining position would be smaller than $5.00`;
    }
  }
}

export function shouldShowRedirectModal(timestamp?: number): boolean {
  if (!timestamp) {
    return true;
  }

  const thirtyDays = 1000 * 60 * 60 * 24 * 30;
  const expiryTime = timestamp + thirtyDays;
  return !isValidTimestamp(timestamp) || Date.now() > expiryTime;
}

function mulDiv(a: bigint | number | undefined, b: bigint | number, c: bigint | number) {
  if (a === undefined) return undefined;
  a = BigInt(a);
  b = BigInt(b);
  c = BigInt(c);
  return (a * b) / c;
}
