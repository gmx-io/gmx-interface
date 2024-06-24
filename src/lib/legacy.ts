import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContract } from "config/contracts";
import useSWR from "swr";

import OrderBookReader from "abis/OrderBookReader.json";
import OrderBook from "abis/OrderBook.json";

import { CHAIN_ID, ETH_MAINNET, getExplorerUrl, getRpcUrl } from "config/chains";
import { getServerBaseUrl } from "config/backend";
import { TokenInfo, getMostAbundantStableToken } from "domain/tokens";
import { getTokenInfo } from "domain/tokens/utils";
import { getProvider } from "./rpc";
import { bigNumberify, deserializeBigIntsInObject, expandDecimals, formatAmount } from "./numbers";
import { isValidToken } from "config/tokens";
import { useChainId } from "./chains";
import { isValidTimestamp } from "./dates";
import { t } from "@lingui/macro";
import { isLocal } from "config/env";
import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import useWallet from "./wallets/useWallet";

const { ZeroAddress } = ethers;

// use a random placeholder account instead of the zero address as the zero address might have tokens
export const PLACEHOLDER_ACCOUNT = ethers.Wallet.createRandom().address;

export const MIN_PROFIT_TIME = 0;

export const USDG_ADDRESS = getContract(CHAIN_ID, "USDG");

export const MAX_PRICE_DEVIATION_BASIS_POINTS = 750;
export const SECONDS_PER_YEAR = 31536000n;
export const USDG_DECIMALS = 18;
export const USD_DECIMALS = 30;
export const DEPOSIT_FEE = 30n;
export const DUST_BNB = "2000000000000000";
export const DUST_USD = expandDecimals(1, USD_DECIMALS);
export const PRECISION = expandDecimals(1, 30);
export const GLP_DECIMALS = 18;
export const GMX_DECIMALS = 18;
export const DEFAULT_MAX_USDG_AMOUNT = expandDecimals(200 * 1000 * 1000, 18);

export const TAX_BASIS_POINTS = 60;
export const STABLE_TAX_BASIS_POINTS = 5;
export const MINT_BURN_FEE_BASIS_POINTS = 25;
export const SWAP_FEE_BASIS_POINTS = 25;
export const STABLE_SWAP_FEE_BASIS_POINTS = 1;
export const MARGIN_FEE_BASIS_POINTS = 10;

export const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS);

export const TRADES_PAGE_SIZE = 100;

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
export const REFERRAL_CODE_QUERY_PARAM = "ref";
export const MAX_REFERRAL_CODE_LENGTH = 20;

export const MIN_PROFIT_BIPS = 0;

export function deserialize(data) {
  return deserializeBigIntsInObject(data);
}

export function isHomeSite() {
  return process.env.REACT_APP_IS_HOME_SITE === "true";
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
  const rateValue = formatAmount(rate, USD_DECIMALS, tokenA.isStable || tokenA.isUsdg ? 2 : 4, true);
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

export function adjustForDecimals(amount: bigint, divDecimals: number, mulDecimals: number) {
  return (amount * expandDecimals(1, mulDecimals)) / expandDecimals(1, divDecimals);
}

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
  ratio: bigint,
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
  if (ratio !== undefined && ratio !== 0n) {
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
  deltaStr += `$${formatAmount(delta, USD_DECIMALS, 2, true)}`;
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
  const [ensName, setENSName] = useState<string | undefined>();

  useEffect(() => {
    async function resolveENS() {
      if (address) {
        const provider = new ethers.JsonRpcProvider(getRpcUrl(ETH_MAINNET));
        const name = await provider.lookupAddress(address.toLowerCase());
        if (name) setENSName(name);
      }
    }
    resolveENS();
  }, [address]);

  return { ensName };
}

function _parseOrdersData(ordersData, account, indexes, extractor, uintPropsLength, addressPropsLength) {
  if (!ordersData || ordersData.length === 0) {
    return [];
  }
  const [uintProps, addressProps] = ordersData;
  const count = uintProps.length / uintPropsLength;

  const orders: any[] = [];
  for (let i = 0; i < count; i++) {
    const sliced = addressProps
      .slice(addressPropsLength * i, addressPropsLength * (i + 1))
      .concat(uintProps.slice(uintPropsLength * i, uintPropsLength * (i + 1)));

    if (sliced[0] === ZeroAddress && sliced[1] === ZeroAddress) {
      continue;
    }

    const order = extractor(sliced);
    order.index = indexes[i];
    order.account = account;
    orders.push(order);
  }

  return orders;
}

function parseDecreaseOrdersData(chainId, decreaseOrdersData, account, indexes) {
  const extractor = (sliced) => {
    const isLong = sliced[4].toString() === "1";
    return {
      collateralToken: sliced[0],
      indexToken: sliced[1],
      collateralDelta: sliced[2],
      sizeDelta: sliced[3],
      isLong,
      triggerPrice: sliced[5],
      triggerAboveThreshold: sliced[6].toString() === "1",
      type: DECREASE,
    };
  };
  return _parseOrdersData(decreaseOrdersData, account, indexes, extractor, 5, 2).filter((order) => {
    return isValidToken(chainId, order.collateralToken) && isValidToken(chainId, order.indexToken);
  });
}

function parseIncreaseOrdersData(chainId, increaseOrdersData, account, indexes) {
  const extractor = (sliced) => {
    const isLong = sliced[5].toString() === "1";
    return {
      purchaseToken: sliced[0],
      collateralToken: sliced[1],
      indexToken: sliced[2],
      purchaseTokenAmount: sliced[3],
      sizeDelta: sliced[4],
      isLong,
      triggerPrice: sliced[6],
      triggerAboveThreshold: sliced[7].toString() === "1",
      type: INCREASE,
    };
  };
  return _parseOrdersData(increaseOrdersData, account, indexes, extractor, 5, 3).filter((order) => {
    return (
      isValidToken(chainId, order.purchaseToken) &&
      isValidToken(chainId, order.collateralToken) &&
      isValidToken(chainId, order.indexToken)
    );
  });
}

function parseSwapOrdersData(chainId, swapOrdersData, account, indexes) {
  if (!swapOrdersData || !swapOrdersData.length) {
    return [];
  }

  const extractor = (sliced) => {
    const triggerAboveThreshold = sliced[6].toString() === "1";
    const shouldUnwrap = sliced[7].toString() === "1";

    return {
      path: [sliced[0], sliced[1], sliced[2]].filter((address) => address !== ZeroAddress),
      amountIn: sliced[3],
      minOut: sliced[4],
      triggerRatio: sliced[5],
      triggerAboveThreshold,
      type: SWAP,
      shouldUnwrap,
    };
  };
  return _parseOrdersData(swapOrdersData, account, indexes, extractor, 5, 3).filter((order) => {
    return order.path.every((token) => isValidToken(chainId, token));
  });
}

export function getOrderKey(order) {
  return `${order.type}-${order.account}-${order.index}`;
}

export function useAccountOrders(
  flagOrdersEnabled: boolean,
  overrideAccount?: string,
  overrideChainId?: number,
  overrideSigner?: ethers.JsonRpcSigner,
  overrideActive?: boolean
) {
  const { signer: fallbackSigner, account: connectedAccount } = useWallet();
  const signer = overrideSigner || fallbackSigner;

  const active = overrideActive ?? true; // this is used in Actions.js so set active to always be true
  const account = overrideAccount || connectedAccount;

  const { chainId: fallbackChainId } = useChainId();
  const chainId = overrideChainId || fallbackChainId;
  const shouldRequest = active && account && flagOrdersEnabled;

  const orderBookAddress = getContract(chainId, "OrderBook");
  const orderBookReaderAddress = getContract(chainId, "OrderBookReader");
  const key: any = shouldRequest ? [active, chainId, orderBookAddress, account] : false;
  const {
    data: orders = [],
    mutate: updateOrders,
    error: ordersError,
  } = useSWR(key, {
    dedupingInterval: 5000,
    fetcher: async ([, chainId, orderBookAddress, account]) => {
      const provider = getProvider(signer, chainId);
      const orderBookContract = new ethers.Contract(orderBookAddress, OrderBook.abi, provider);
      const orderBookReaderContract = new ethers.Contract(orderBookReaderAddress, OrderBookReader.abi, provider);

      const fetchIndexesFromServer = () => {
        const ordersIndexesUrl = `${getServerBaseUrl(chainId)}/orders_indices?account=${account}`;
        return fetch(ordersIndexesUrl)
          .then(async (res) => {
            const json = await res.json();
            const ret = {};
            for (const key of Object.keys(json)) {
              ret[key.toLowerCase()] = json[key].map((val) => parseInt(val.value)).sort((a, b) => a - b);
            }

            return ret;
          })
          .catch(() => ({ swap: [], increase: [], decrease: [] }));
      };

      const fetchLastIndex = async (type) => {
        const method = type.toLowerCase() + "OrdersIndex";
        return await orderBookContract[method](account).then((res) => Number(res));
      };

      const fetchLastIndexes = async () => {
        const [swap, increase, decrease] = await Promise.all([
          fetchLastIndex("swap"),
          fetchLastIndex("increase"),
          fetchLastIndex("decrease"),
        ]);

        return { swap, increase, decrease };
      };

      const getRange = (to: number, from?: number) => {
        const LIMIT = 10;
        const _indexes: number[] = [];
        from = from || Math.max(to - LIMIT, 0);
        for (let i = to - 1; i >= from; i--) {
          _indexes.push(i);
        }
        return _indexes;
      };

      const getIndexes = (knownIndexes, lastIndex) => {
        if (knownIndexes.length === 0) {
          return getRange(lastIndex);
        }
        return [
          ...knownIndexes,
          ...getRange(lastIndex, knownIndexes[knownIndexes.length - 1] + 1).sort((a, b) => b - a),
        ];
      };

      const getOrders = async (method, knownIndexes, lastIndex, parseFunc) => {
        const indexes = getIndexes(knownIndexes, lastIndex);
        const ordersData = await orderBookReaderContract[method](orderBookAddress, account, indexes);
        const orders = parseFunc(chainId, ordersData, account, indexes);

        return orders;
      };

      try {
        const [serverIndexes, lastIndexes]: any = await Promise.all([fetchIndexesFromServer(), fetchLastIndexes()]);
        const [swapOrders = [], increaseOrders = [], decreaseOrders = []] = await Promise.all([
          getOrders("getSwapOrders", serverIndexes.swap, lastIndexes.swap, parseSwapOrdersData),
          getOrders("getIncreaseOrders", serverIndexes.increase, lastIndexes.increase, parseIncreaseOrdersData),
          getOrders("getDecreaseOrders", serverIndexes.decrease, lastIndexes.decrease, parseDecreaseOrdersData),
        ]);
        return [...swapOrders, ...increaseOrders, ...decreaseOrders];
      } catch (ex) {
        // eslint-disable-next-line no-console
        console.error(ex);
      }
    },
  });

  return [orders, updateOrders, ordersError];
}

export function getAccountUrl(chainId, account) {
  if (!account) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "address/" + account;
}

export function isMobileDevice(navigator) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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

export function getBalanceAndSupplyData(balances) {
  if (!balances || balances.length === 0) {
    return {};
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

export function getDepositBalanceData(depositBalances) {
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

  return data;
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

export function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = ["stakedGmxTracker", "bonusGmxTracker", "feeGmxTracker", "stakedGlpTracker", "feeGlpTracker"];
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

  return data;
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
  bnGmxInFeeGmx: bigint;
  bonusGmxInFeeGmx: bigint;
  feeGmxSupply: bigint;
  feeGmxSupplyUsd: bigint;
  stakedGmxTrackerRewards: bigint;
  stakedGmxTrackerRewardsUsd: bigint;
  feeGmxTrackerRewards: bigint;
  feeGmxTrackerRewardsUsd: bigint;
  boostBasisPoints: bigint;
  stakedGmxTrackerAnnualRewardsUsd: bigint;
  feeGmxTrackerAnnualRewardsUsd: bigint;
  gmxAprTotal: bigint;
  gmxAprTotalWithBoost: bigint;
  totalGmxRewardsUsd: bigint;
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
  glpAprTotal: bigint;
  totalGlpRewardsUsd: bigint;
  totalEsGmxRewards: bigint;
  totalEsGmxRewardsUsd: bigint;
  gmxVesterRewards: bigint;
  glpVesterRewards: bigint;
  totalVesterRewards: bigint;
  totalVesterRewardsUsd: bigint;
  totalNativeTokenRewards: bigint;
  totalNativeTokenRewardsUsd: bigint;
  totalRewardsUsd: bigint;
  avgBoostAprForNativeToken: bigint;
  avgGMXAprForNativeToken: bigint;
}> & {
  gmxAprForEsGmx: bigint;
  gmxAprForNativeToken: bigint;
  maxGmxAprForNativeToken: bigint;
  gmxAprForNativeTokenWithBoost: bigint;
  gmxBoostAprForNativeToken?: bigint;
  avgBoostMultiplier?: bigint;
};

export function getProcessedData(
  balanceData,
  supplyData,
  depositBalanceData,
  stakingData,
  vestingData,
  aum,
  nativeTokenPrice,
  stakedGmxSupply,
  stakedBnGmxSupply,
  gmxPrice,
  gmxSupply,
  maxBoostMultiplier
): ProcessedData | undefined {
  if (
    !balanceData ||
    !supplyData ||
    !depositBalanceData ||
    !stakingData ||
    !vestingData ||
    !aum ||
    !nativeTokenPrice ||
    !stakedGmxSupply ||
    !stakedBnGmxSupply ||
    !gmxPrice ||
    !gmxSupply ||
    !maxBoostMultiplier
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

  data.bnGmxInFeeGmx = depositBalanceData.bnGmxInFeeGmx;
  data.bonusGmxInFeeGmx = depositBalanceData.bonusGmxInFeeGmx;
  data.feeGmxSupply = stakingData.feeGmxTracker.totalSupply;
  data.feeGmxSupplyUsd = mulDiv(data.feeGmxSupply, gmxPrice, expandDecimals(1, 18));

  data.stakedGmxTrackerRewards = stakingData.stakedGmxTracker.claimable;
  data.stakedGmxTrackerRewardsUsd = mulDiv(stakingData.stakedGmxTracker.claimable, gmxPrice, expandDecimals(1, 18));

  data.feeGmxTrackerRewards = stakingData.feeGmxTracker.claimable;
  data.feeGmxTrackerRewardsUsd = mulDiv(stakingData.feeGmxTracker.claimable, nativeTokenPrice, expandDecimals(1, 18));

  data.boostBasisPoints = 0n;
  if (data && data.bnGmxInFeeGmx && data.bonusGmxInFeeGmx && data.bonusGmxInFeeGmx > 0) {
    data.boostBasisPoints = mulDiv(data.bnGmxInFeeGmx, BASIS_POINTS_DIVISOR_BIGINT, data.bonusGmxInFeeGmx);
  }

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
  data.gmxBoostAprForNativeToken = mulDiv(
    data.gmxAprForNativeToken,
    data.boostBasisPoints,
    BASIS_POINTS_DIVISOR_BIGINT
  );
  data.gmxAprTotal = data.gmxAprForNativeToken + data.gmxAprForEsGmx;
  data.gmxAprTotalWithBoost = data.gmxAprForNativeToken + data.gmxBoostAprForNativeToken + data.gmxAprForEsGmx;
  data.gmxAprForNativeTokenWithBoost = data.gmxAprForNativeToken + data.gmxBoostAprForNativeToken;

  data.maxGmxAprForNativeToken = data.gmxAprForNativeToken + data.gmxAprForNativeToken * maxBoostMultiplier;

  data.totalGmxRewardsUsd = data.stakedGmxTrackerRewardsUsd + data.feeGmxTrackerRewardsUsd;

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

  data.totalNativeTokenRewards = data.feeGmxTrackerRewards + data.feeGlpTrackerRewards;
  data.totalNativeTokenRewardsUsd = data.feeGmxTrackerRewardsUsd + data.feeGlpTrackerRewardsUsd;

  data.totalRewardsUsd = data.totalEsGmxRewardsUsd + data.totalNativeTokenRewardsUsd + data.totalVesterRewardsUsd;

  data.avgBoostMultiplier = stakedBnGmxSupply
    ? mulDiv(stakedBnGmxSupply, BASIS_POINTS_DIVISOR_BIGINT, stakedGmxSupply + (data?.stakedEsGmxSupply ?? 0n))
    : undefined;

  data.avgBoostAprForNativeToken = data.gmxAprForNativeToken
    ? mulDiv(data.gmxAprForNativeToken, data.avgBoostMultiplier, BASIS_POINTS_DIVISOR_BIGINT)
    : undefined;
  data.avgGMXAprForNativeToken = data.gmxAprForNativeToken
    ? data.gmxAprForNativeToken + (data.avgBoostAprForNativeToken ?? 0n)
    : undefined;

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

  return "https://app.gmx.io/#";
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

  return "https://app.gmx.io/#/trade";
}

export function importImage(name) {
  let tokenImage = "";

  try {
    tokenImage = require("img/" + name);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return tokenImage;
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
