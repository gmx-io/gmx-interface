import React, { useState, useRef, useEffect } from 'react'
import { InjectedConnector } from '@web3-react/injected-connector'
import { toast } from 'react-toastify'
import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core'
import { useLocalStorage } from 'react-use'
import { ethers } from 'ethers'
import { format as formatDateFn } from 'date-fns'
import Token from './abis/Token.json'
import _ from "lodash"
import { getContract } from './Addresses'
import useSWR from 'swr'

import OrderBookReader from './abis/OrderBookReader.json'
import OrderBook from './abis/OrderBook.json'

import { getWhitelistedTokens } from './data/Tokens'

const { AddressZero } = ethers.constants

export const MAINNET = 56;
export const TESTNET = 97;
export const ARBITRUM_TESTNET = 421611
export const ARBITRUM = 42161
// TODO take it from web3
export const DEFAULT_CHAIN_ID = ARBITRUM
export const CHAIN_ID = DEFAULT_CHAIN_ID

const CHAIN_NAMES_MAP = {
  [MAINNET]: "BSC",
  [TESTNET]: "BSC Testnet",
  [ARBITRUM_TESTNET]: "Arbitrum Testnet",
  [ARBITRUM]: "Arbitrum"
}
export function getChainName(chainId) {
  return CHAIN_NAMES_MAP[chainId]
}

export const USDG_ADDRESS = getContract(CHAIN_ID, "USDG")
const MAX_LEVERAGE = 50 * 10000

export const DEFAULT_GAS_LIMIT = 5 * 1000 * 1000
export const SECONDS_PER_YEAR = 31536000
export const USDG_DECIMALS = 18
export const USD_DECIMALS = 30
export const BASIS_POINTS_DIVISOR = 10000
export const DUST_BNB = "2000000000000000"
export const DUST_USD = expandDecimals(1, USD_DECIMALS)
export const PRECISION = expandDecimals(1, 30)
export const GLP_DECIMALS = 18
export const GMX_DECIMALS = 18
export const DEFAULT_MAX_USDG_AMOUNT = expandDecimals(100 * 1000 * 1000, 18)

export const TAX_BASIS_POINTS = 60
export const STABLE_TAX_BASIS_POINTS = 5
export const MINT_BURN_FEE_BASIS_POINTS = 0
export const SWAP_FEE_BASIS_POINTS = 20
export const STABLE_SWAP_FEE_BASIS_POINTS = 1
export const MARGIN_FEE_BASIS_POINTS = 10

export const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS)

export const GLP_COOLDOWN_DURATION = 15 * 60
export const THRESHOLD_REDEMPTION_VALUE = expandDecimals(993, 27) // 0.993
export const FUNDING_RATE_PRECISION = 1000000

export const SWAP = "Swap"
export const LONG = "Long"
export const SHORT = "Short"

export const MARKET = 'Market';
export const LIMIT = 'Limit';
export const STOP = 'Stop';
export const LEVERAGE_ORDER_OPTIONS = [MARKET, LIMIT];
export const SWAP_ORDER_OPTIONS = [MARKET, LIMIT];
export const SWAP_OPTIONS = [LONG, SHORT, SWAP]
export const DEFAULT_SLIPPAGE_AMOUNT = 20;

export const SLIPPAGE_BPS_KEY = "Exchange-swap-slippage-basis-points-v3"

const ORDER_EXECUTION_GAS_PRICE = expandDecimals(30, 9)

export const SWAP_ORDER_EXECUTION_GAS_FEE = ORDER_EXECUTION_GAS_PRICE.mul(450000)
export const INCREASE_ORDER_EXECUTION_GAS_FEE = ORDER_EXECUTION_GAS_PRICE.mul(1000000)
export const DECREASE_ORDER_EXECUTION_GAS_FEE = ORDER_EXECUTION_GAS_PRICE.mul(550000)

export const TRIGGER_PREFIX_ABOVE = '>'
export const TRIGGER_PREFIX_BELOW = '<'

export const PROFIT_THRESHOLD_BASIS_POINTS = 150

const supportedChainIds = [
  ARBITRUM
];
const injected = new InjectedConnector({
  supportedChainIds
})

export function isSupportedChain(chainId) {
  return supportedChainIds.includes(chainId);
}

export function deserialize(data) {
  for (const [key, value] of Object.entries(data)) {
    if (value._type === "BigNumber") {
      data[key] = bigNumberify(value.value);
    }
  }
  return data;
}

export function useLocalStorageSerializeKey(key, value, opts) {
  key = JSON.stringify(key);
  return useLocalStorage(key, value, opts);
}

function getTriggerPrice(tokenAddress, max, info, orderType, triggerPriceUsd) {
  // Limit/stop orders are executed with price specified by user
  if (orderType && orderType !== MARKET && triggerPriceUsd) { return triggerPriceUsd; }

  // Market orders are executed with current market price
  if (!info) { return }
  if (max && !info.maxPrice) { return }
  if (!max && !info.minPrice) { return }
  return max ? info.maxPrice : info.minPrice;
}

function getLiquidationPriceFromDelta({ liquidationAmount, size, collateral, averagePrice, isLong }) {
  if (!size || size.eq(0)) { return }
  if (liquidationAmount.gt(collateral)) { return }

  const liquidationDelta = collateral.sub(liquidationAmount)
  const priceDelta = liquidationDelta.mul(averagePrice).div(size)

  if (isLong) {
    return averagePrice.sub(priceDelta)
  }

  return averagePrice.add(priceDelta)
}

export const replaceNativeTokenAddress = (path, nativeTokenAddress) => {
  if (!path) { return }

  let updatedPath = []
  for (let i = 0; i < path.length; i++) {
    let address = path[i]
    if (address === AddressZero) {
      address = nativeTokenAddress
    }
    updatedPath.push(address)
  }

  return updatedPath
}

export function getPositionFee(size) {
  if (!size) {
    return bigNumberify(0);
  }
  const afterFeeUsd = size.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
  return size.sub(afterFeeUsd)
}

export function getMarginFee(sizeDelta) {
  if (!sizeDelta) {
    return bigNumberify(0);
  }
  const afterFeeUsd = sizeDelta.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
  return sizeDelta.sub(afterFeeUsd)
}

export function getServerBaseUrl(chainId) {
  if (!chainId) {
    throw new Error("chainId is not provided")
  }
  if (document.location.hostname === "localhost") {
    // return "http://localhost:8080"
  }
  if (chainId === MAINNET) {
    return "https://gambit-server-staging.uc.r.appspot.com"
  }
  if (chainId === ARBITRUM_TESTNET) {
    return "https://gambit-l2.as.r.appspot.com"
  }
  if (chainId === ARBITRUM) {
    return "https://gmx-server-mainnet.uw.r.appspot.com"
  }
  return "https://gambit-server-devnet.uc.r.appspot.com"
}

export function getServerUrl(chainId, path) {
  return `${getServerBaseUrl(chainId)}${path}`
}

export function isTriggerRatioInverted(fromTokenInfo, toTokenInfo) {
  if (!toTokenInfo || !fromTokenInfo) return false
  if (toTokenInfo.isStable || toTokenInfo.isUsdg) return true
  if (toTokenInfo.maxPrice) return toTokenInfo.maxPrice.lt(fromTokenInfo.maxPrice)
  return false
}

export function getExchangeRate(tokenAInfo, tokenBInfo, inverted) {
  if (!tokenAInfo || !tokenAInfo.minPrice || !tokenBInfo || !tokenBInfo.maxPrice) {
    return;
  }
  if (inverted) {
   return tokenAInfo.minPrice.mul(PRECISION).div(tokenBInfo.maxPrice);
  }
  return tokenBInfo.maxPrice.mul(PRECISION).div(tokenAInfo.minPrice);
}

export function getMostAbundantStableToken(chainId, infoTokens) {
  const whitelistedTokens = getWhitelistedTokens(chainId)
  let availableAmount
  let stableToken
  for (let i = 0; i < whitelistedTokens.length; i++) {
    const info = getTokenInfo(infoTokens, whitelistedTokens[i].address)
    if (!info.isStable) {
      continue
    }

    if (!availableAmount || info.availableAmount.gt(availableAmount)) {
      availableAmount = info.availableAmount
      stableToken = info
    }
  }
  return stableToken
}

export function shouldInvertTriggerRatio(tokenA, tokenB) {
  if (tokenB.isStable || tokenB.isUsdg) return true
  if (tokenB.maxPrice && tokenA.maxPrice && tokenB.maxPrice.lt(tokenA.maxPrice)) return true
  return false
}

export function getExchangeRateDisplay(rate, tokenA, tokenB, opts = {}) {
  if (!rate) return '...';
  if (shouldInvertTriggerRatio(tokenA, tokenB)) {
    [tokenA, tokenB] = [tokenB, tokenA]
    rate = PRECISION.mul(PRECISION).div(rate)
  }
  const rateValue = formatAmount(rate, USD_DECIMALS, (tokenA.isStable || tokenA.isUsdg) ? 2 : 4, true);
  if (opts.omitSymbols) {
    return rateValue
  }
  return `${rateValue} ${tokenA.symbol} / ${tokenB.symbol}`
}

const adjustForDecimalsFactory = n => number => {
    if (n === 0) {
      return number;
    }
    if (n > 0) {
      return number.mul(expandDecimals(1, n))
    }
    return number.div(expandDecimals(1, -n))
}

export function adjustForDecimals(amount, divDecimals, mulDecimals) {
  return amount.mul(expandDecimals(1, mulDecimals)).div(expandDecimals(1, divDecimals))
}

export function getTargetUsdgAmount(token, usdgSupply, totalTokenWeights) {
  if (!token || !token.weight || !usdgSupply) {
    return
  }

  if (usdgSupply.eq(0)) {
    return bigNumberify(0)
  }

  return token.weight.mul(usdgSupply).div(totalTokenWeights);
}

export function getFeeBasisPoints(token, usdgDelta, feeBasisPoints, taxBasisPoints, increment, usdgSupply, totalTokenWeights) {
  if (!token || !token.usdgAmount || !usdgSupply || !totalTokenWeights) {
    return 0
  }

  feeBasisPoints = bigNumberify(feeBasisPoints)
  taxBasisPoints = bigNumberify(taxBasisPoints)

  const initialAmount = token.usdgAmount
  let nextAmount = initialAmount.add(usdgDelta)
  if (!increment) {
    nextAmount = usdgDelta.gt(initialAmount) ? bigNumberify(0) : initialAmount.sub(usdgDelta)
  }

  const targetAmount = getTargetUsdgAmount(token, usdgSupply, totalTokenWeights)
  if (!targetAmount || targetAmount.eq(0)) { return feeBasisPoints.toNumber() }

  const initialDiff = initialAmount.gt(targetAmount) ? initialAmount.sub(targetAmount) : targetAmount.sub(initialAmount)
  const nextDiff = nextAmount.gt(targetAmount) ? nextAmount.sub(targetAmount) : targetAmount.sub(nextAmount)

  if (nextDiff.lt(initialDiff)) {
    const rebateBps = taxBasisPoints.mul(initialDiff).div(targetAmount)
    return rebateBps.gt(feeBasisPoints) ? 0 : feeBasisPoints.sub(rebateBps).toNumber()
  }

  let averageDiff = initialDiff.add(nextDiff).div(2)
  if (averageDiff.gt(targetAmount)) {
    averageDiff = targetAmount
  }
  const taxBps = taxBasisPoints.mul(averageDiff).div(targetAmount)
  return feeBasisPoints.add(taxBps).toNumber()
}

export function getBuyGlpToAmount(fromAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0), feeBasisPoints: 0 }
  if (!fromAmount || !swapTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue
  }

  const swapToken = getTokenInfo(infoTokens, swapTokenAddress)
  if (!swapToken || !swapToken.minPrice) { return defaultValue }

  let glpAmount = fromAmount.mul(swapToken.minPrice).div(glpPrice);
  glpAmount = adjustForDecimals(glpAmount, swapToken.decimals, USDG_DECIMALS);

  let usdgAmount = fromAmount.mul(swapToken.minPrice).div(PRECISION);
  usdgAmount = adjustForDecimals(usdgAmount, swapToken.decimals, USDG_DECIMALS)
  const feeBasisPoints = getFeeBasisPoints(swapToken, usdgAmount, MINT_BURN_FEE_BASIS_POINTS, TAX_BASIS_POINTS, true, usdgSupply, totalTokenWeights)

  glpAmount = glpAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)

  return { amount: glpAmount, feeBasisPoints }
}

export function getSellGlpFromAmount(toAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0), feeBasisPoints: 0 }
  if (!toAmount || !swapTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue
  }

  const swapToken = getTokenInfo(infoTokens, swapTokenAddress)
  if (!swapToken || !swapToken.maxPrice) { return defaultValue }

  let glpAmount = toAmount.mul(swapToken.maxPrice).div(glpPrice);
  glpAmount = adjustForDecimals(glpAmount, swapToken.decimals, USDG_DECIMALS);

  let usdgAmount = toAmount.mul(swapToken.maxPrice).div(PRECISION);
  usdgAmount = adjustForDecimals(usdgAmount, swapToken.decimals, USDG_DECIMALS)
  const feeBasisPoints = getFeeBasisPoints(swapToken, usdgAmount, MINT_BURN_FEE_BASIS_POINTS, TAX_BASIS_POINTS, false, usdgSupply, totalTokenWeights)

  glpAmount = glpAmount.mul(BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR - feeBasisPoints)

  return { amount: glpAmount, feeBasisPoints }
}

export function getBuyGlpFromAmount(toAmount, fromTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0) }
  if (!toAmount || !fromTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  if (!fromToken || !fromToken.minPrice) { return defaultValue }

  let fromAmount = toAmount.mul(glpPrice).div(fromToken.minPrice)
  fromAmount = adjustForDecimals(fromAmount, GLP_DECIMALS, fromToken.decimals);

  const usdgAmount = toAmount.mul(glpPrice).div(PRECISION);
  const feeBasisPoints = getFeeBasisPoints(fromToken, usdgAmount, MINT_BURN_FEE_BASIS_POINTS, TAX_BASIS_POINTS, true, usdgSupply, totalTokenWeights)

  fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR - feeBasisPoints)

  return { amount: fromAmount, feeBasisPoints }
}

export function getSellGlpToAmount(toAmount, fromTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0) }
  if (!toAmount || !fromTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  if (!fromToken || !fromToken.maxPrice) { return defaultValue }

  let fromAmount = toAmount.mul(glpPrice).div(fromToken.maxPrice)
  fromAmount = adjustForDecimals(fromAmount, GLP_DECIMALS, fromToken.decimals);

  const usdgAmount = toAmount.mul(glpPrice).div(PRECISION);
  const feeBasisPoints = getFeeBasisPoints(fromToken, usdgAmount, MINT_BURN_FEE_BASIS_POINTS, TAX_BASIS_POINTS, false, usdgSupply, totalTokenWeights)

  fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)

  return { amount: fromAmount, feeBasisPoints }
}

export function getNextFromAmount(chainId, toAmount, fromTokenAddress, toTokenAddress, infoTokens, toTokenPriceUsd, ratio, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0) }

  if (!toAmount || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: toAmount }
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  const toToken = getTokenInfo(infoTokens, toTokenAddress)

  if (!fromToken || !toToken) { return defaultValue }

  const adjustDecimals = adjustForDecimalsFactory(fromToken.decimals - toToken.decimals)

  let fromAmountBasedOnRatio;
  if (ratio && !ratio.isZero()) {
    fromAmountBasedOnRatio = toAmount.mul(ratio).div(PRECISION);
  }

  if (toTokenAddress === USDG_ADDRESS) {
    const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable)

    if (ratio && !ratio.isZero()) {
      return { amount: adjustDecimals(fromAmountBasedOnRatio.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR)) }
    }
    const fromAmount = toAmount.mul(PRECISION).div(fromToken.maxPrice)
    return {
      amount: adjustDecimals(fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR))
    }
  }

  if (fromTokenAddress === USDG_ADDRESS) {
    const redemptionValue = toToken.redemptionAmount.mul(toToken.maxPrice).div(expandDecimals(1, toToken.decimals))
    if (redemptionValue.gt(THRESHOLD_REDEMPTION_VALUE)) {
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)

      const fromAmount = ratio && !ratio.isZero()
        ? fromAmountBasedOnRatio
        : toAmount.mul(expandDecimals(1, toToken.decimals)).div(toToken.redemptionAmount)

      return {
        amount: adjustDecimals(fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR))
      }
    }

    const expectedAmount = toAmount.mul(toToken.maxPrice).div(PRECISION)

    const stableToken = getMostAbundantStableToken(chainId, infoTokens)
    if (!stableToken || stableToken.availableAmount.lt(expectedAmount)) {
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)

      const fromAmount = ratio && !ratio.isZero()
        ? fromAmountBasedOnRatio
        : toAmount.mul(expandDecimals(1, toToken.decimals)).div(toToken.redemptionAmount);

      return {
        amount: adjustDecimals(fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR))
      }
    }

    const feeBasisPoints0 = getSwapFeeBasisPoints(true)
    const feeBasisPoints1 = getSwapFeeBasisPoints(false)

    if (ratio && !ratio.isZero()) {
      // apply fees twice usdg -> token1 -> token2
      const fromAmount = fromAmountBasedOnRatio
        .mul(BASIS_POINTS_DIVISOR + feeBasisPoints0 + feeBasisPoints1)
        .div(BASIS_POINTS_DIVISOR)
      return {
        amount: adjustDecimals(fromAmount),
        path: [USDG_ADDRESS, stableToken.address, toToken.address]
      }
    }

    // get fromAmount for stableToken => toToken
    let fromAmount = toAmount.mul(toToken.maxPrice).div(stableToken.minPrice)

    // apply stableToken => toToken fees
    fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints1).div(BASIS_POINTS_DIVISOR)

    // get fromAmount for USDG => stableToken
    fromAmount = fromAmount.mul(stableToken.maxPrice).div(PRECISION)

    // apply USDG => stableToken fees
    fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints0).div(BASIS_POINTS_DIVISOR)

    return {
      amount: adjustDecimals(fromAmount),
      path: [USDG_ADDRESS, stableToken.address, toToken.address]
    }
  }

  // const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable && toToken.isStable)
  const fromAmount = ratio && !ratio.isZero()
    ? fromAmountBasedOnRatio
    : toAmount.mul(toToken.maxPrice).div(fromToken.minPrice)

  let usdgAmount = fromAmount.mul(fromToken.minPrice).div(PRECISION)
  usdgAmount = adjustForDecimals(usdgAmount, toToken.decimals, USDG_DECIMALS)
  const swapFeeBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
  const taxBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS
  const feeBasisPoints0 = getFeeBasisPoints(fromToken, usdgAmount, swapFeeBasisPoints, taxBasisPoints, true, usdgSupply, totalTokenWeights)
  const feeBasisPoints1 = getFeeBasisPoints(toToken, usdgAmount, swapFeeBasisPoints, taxBasisPoints, false, usdgSupply, totalTokenWeights)
  const feeBasisPoints = feeBasisPoints0 > feeBasisPoints1 ? feeBasisPoints0 : feeBasisPoints1;

  return { amount: adjustDecimals(fromAmount.mul(BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR - feeBasisPoints)), feeBasisPoints }
}

export function getNextToAmount(chainId, fromAmount, fromTokenAddress, toTokenAddress, infoTokens, toTokenPriceUsd, ratio, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0) }
  if (!fromAmount || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: fromAmount }
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  const toToken = getTokenInfo(infoTokens, toTokenAddress)

  if (fromToken.isNative && toToken.isWrapped) {
      return { amount: fromAmount }
  }

  if (fromToken.isWrapped && toToken.isNative) {
      return { amount: fromAmount }
  }

  if (!fromToken || !fromToken.minPrice || !toToken || !toToken.maxPrice) { return defaultValue }

  const adjustDecimals = adjustForDecimalsFactory(toToken.decimals - fromToken.decimals)

  let toAmountBasedOnRatio = bigNumberify(0);
  if (ratio && !ratio.isZero()) {
    toAmountBasedOnRatio = fromAmount.mul(PRECISION).div(ratio)
  }

  if (toTokenAddress === USDG_ADDRESS) {
    const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable)

    if (ratio && !ratio.isZero()) {
      const toAmount = toAmountBasedOnRatio
      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints
      }
    }

    const toAmount = fromAmount.mul(fromToken.minPrice).div(PRECISION)
    return {
      amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
      feeBasisPoints
    }
  }

  if (fromTokenAddress === USDG_ADDRESS) {
    const redemptionValue = toToken.redemptionAmount.mul(toTokenPriceUsd || toToken.maxPrice).div(expandDecimals(1, toToken.decimals))

    if (redemptionValue.gt(THRESHOLD_REDEMPTION_VALUE)) {
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)

      const toAmount = ratio && !ratio.isZero()
        ? toAmountBasedOnRatio
        : fromAmount.mul(toToken.redemptionAmount).div(expandDecimals(1, toToken.decimals))

      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints
      }
    }

    const expectedAmount = fromAmount

    const stableToken = getMostAbundantStableToken(chainId, infoTokens)
    if (!stableToken || stableToken.availableAmount.lt(expectedAmount)) {
      const toAmount = ratio && !ratio.isZero()
        ? toAmountBasedOnRatio
        : fromAmount.mul(toToken.redemptionAmount).div(expandDecimals(1, toToken.decimals))
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)
      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints
      }
    }

    const feeBasisPoints0 = getSwapFeeBasisPoints(true)
    const feeBasisPoints1 = getSwapFeeBasisPoints(false)

    if (ratio && !ratio.isZero()) {
      const toAmount = toAmountBasedOnRatio
        .mul(BASIS_POINTS_DIVISOR - feeBasisPoints0 - feeBasisPoints1)
        .div(BASIS_POINTS_DIVISOR)
      return {
        amount: adjustDecimals(toAmount),
        path: [USDG_ADDRESS, stableToken.address, toToken.address],
        feeBasisPoints: feeBasisPoints0 + feeBasisPoints1
      }
    }

    // get toAmount for USDG => stableToken
    let toAmount = fromAmount.mul(PRECISION).div(stableToken.maxPrice)
    // apply USDG => stableToken fees
    toAmount = toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints0).div(BASIS_POINTS_DIVISOR)

    // get toAmount for stableToken => toToken
    toAmount = toAmount.mul(stableToken.minPrice).div(toTokenPriceUsd || toToken.maxPrice)
    // apply stableToken => toToken fees
    toAmount = toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints1).div(BASIS_POINTS_DIVISOR)

    return {
      amount: adjustDecimals(toAmount),
      path: [USDG_ADDRESS, stableToken.address, toToken.address],
      feeBasisPoints: feeBasisPoints0 + feeBasisPoints1
    }
  }

  const toAmount = ratio && !ratio.isZero()
    ? toAmountBasedOnRatio
    : fromAmount.mul(fromToken.minPrice).div(toTokenPriceUsd || toToken.maxPrice)

  let usdgAmount = fromAmount.mul(fromToken.minPrice).div(PRECISION)
  usdgAmount = adjustForDecimals(usdgAmount, fromToken.decimals, USDG_DECIMALS)
  const swapFeeBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
  const taxBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS
  const feeBasisPoints0 = getFeeBasisPoints(fromToken, usdgAmount, swapFeeBasisPoints, taxBasisPoints, true, usdgSupply, totalTokenWeights)
  const feeBasisPoints1 = getFeeBasisPoints(toToken, usdgAmount, swapFeeBasisPoints, taxBasisPoints, false, usdgSupply, totalTokenWeights)
  const feeBasisPoints = feeBasisPoints0 > feeBasisPoints1 ? feeBasisPoints0 : feeBasisPoints1;

  return {
    amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
    feeBasisPoints
  }
}

export function calculatePositionDelta({ size, collateral, isLong, averagePrice, price }) {
  const priceDelta = averagePrice.gt(price) ? averagePrice.sub(price) : price.sub(averagePrice)
  let delta = size.mul(priceDelta).div(averagePrice)
  const pendingDelta = delta

  const hasProfit = isLong ? price.gt(averagePrice) : price.lt(averagePrice)
  if (hasProfit && delta.mul(BASIS_POINTS_DIVISOR).lte(size.mul(PROFIT_THRESHOLD_BASIS_POINTS))) {
    delta = bigNumberify(0)
  }

  const deltaPercentage = delta.mul(BASIS_POINTS_DIVISOR).div(collateral)
  const pendingDeltaPercentage = pendingDelta.mul(BASIS_POINTS_DIVISOR).div(collateral)

  return {
    delta,
    pendingDelta,
    pendingDeltaPercentage,
    hasProfit,
    deltaPercentage
  }
}

export function getDeltaStr({ delta, deltaPercentage, hasProfit }) {
  let deltaStr
  let deltaPercentageStr

  if (delta.gt(0)) {
    deltaStr = hasProfit ? "+" : "-"
    deltaPercentageStr = hasProfit ? "+" : "-"
  } else {
    deltaStr = "";
    deltaPercentageStr = "";
  }
  deltaStr += `$${formatAmount(delta, USD_DECIMALS, 2, true)}`
  deltaPercentageStr += `${formatAmount(deltaPercentage, 2, 2)}%`

  return { deltaStr, deltaPercentageStr }
}

export function getLeverage ({ size, sizeDelta, increaseSize, collateral, collateralDelta, increaseCollateral, entryFundingRate, cumulativeFundingRate, hasProfit, delta, includeDelta }) {
  if (!size && !sizeDelta) { return }
  if (!collateral && !collateralDelta) { return }

  let nextSize = size ? size : bigNumberify(0)
  if (sizeDelta) {
    if (increaseSize) {
      nextSize = size.add(sizeDelta)
    } else {
      if (sizeDelta.gte(size)) {
        return
      }
      nextSize = size.sub(sizeDelta)
    }
  }

  let remainingCollateral = collateral ? collateral : bigNumberify(0)
  if (collateralDelta) {
    if (increaseCollateral) {
      remainingCollateral = collateral.add(collateralDelta)
    } else {
      if (collateralDelta.gte(collateral)) {
        return
      }
      remainingCollateral = collateral.sub(collateralDelta)
    }
  }

  if (delta && includeDelta) {
    if (hasProfit) {
      remainingCollateral = remainingCollateral.add(delta)
    } else {
      if (delta.gt(remainingCollateral)) {
        return
      }

      remainingCollateral = remainingCollateral.sub(delta)
    }
  }

  if (remainingCollateral.eq(0)) { return }

  remainingCollateral = sizeDelta ? remainingCollateral.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR) : remainingCollateral
  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
    remainingCollateral = remainingCollateral.sub(fundingFee)
  }

  return nextSize.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral)
}

export function getLiquidationPrice(data) {
  let { isLong, size, collateral, averagePrice, entryFundingRate, cumulativeFundingRate, sizeDelta, collateralDelta, increaseCollateral, increaseSize } = data
  if (!size || !collateral || !averagePrice) { return }

  let nextSize = size ? size : bigNumberify(0)
  let remainingCollateral = collateral

  if (sizeDelta) {
    if (increaseSize) {
      nextSize = size.add(sizeDelta)
    } else {
      if (sizeDelta.gte(size)) {
        return
      }
      nextSize = size.sub(sizeDelta)
    }

    const marginFee = getMarginFee(sizeDelta)
    remainingCollateral = remainingCollateral.sub(marginFee)
  }

  if (collateralDelta) {
    if (increaseCollateral) {
      remainingCollateral = remainingCollateral.add(collateralDelta)
    } else {
      if (collateralDelta.gte(remainingCollateral)) {
        return
      }
      remainingCollateral = remainingCollateral.sub(collateralDelta)
    }
  }

  let positionFee = getPositionFee(size).add(LIQUIDATION_FEE)
  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
    positionFee.add(fundingFee)
  }

  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: positionFee, size: nextSize, collateral: remainingCollateral, averagePrice, isLong
  })

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: nextSize.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE), size: nextSize, collateral: remainingCollateral, averagePrice, isLong
  })

  if (!liquidationPriceForFees) { return liquidationPriceForMaxLeverage }
  if (!liquidationPriceForMaxLeverage) { return liquidationPriceForFees }

  if (isLong) {
    // return the higher price
    return liquidationPriceForFees.gt(liquidationPriceForMaxLeverage) ? liquidationPriceForFees : liquidationPriceForMaxLeverage
  }

  // return the lower price
  return liquidationPriceForFees.lt(liquidationPriceForMaxLeverage) ? liquidationPriceForFees : liquidationPriceForMaxLeverage
}

export function getUsd(amount, tokenAddress, max, infoTokens, orderType, triggerPriceUsd) {
  if (!amount) { return }
  if (tokenAddress === USDG_ADDRESS) {
    return amount.mul(PRECISION).div(expandDecimals(1, 18))
  }
  const info = getTokenInfo(infoTokens, tokenAddress)
  const price = getTriggerPrice(tokenAddress, max, info, orderType, triggerPriceUsd);
  if (!price) { return }

  return amount.mul(price).div(expandDecimals(1, info.decimals))
}

export function getPositionKey(collateralTokenAddress, indexTokenAddress, isLong, nativeTokenAddress) {
  const tokenAddress0 = collateralTokenAddress === AddressZero ? nativeTokenAddress : collateralTokenAddress
  const tokenAddress1 = indexTokenAddress === AddressZero ? nativeTokenAddress : indexTokenAddress
  return tokenAddress0 + ":" + tokenAddress1 + ":" + isLong
}

export function getSwapFeeBasisPoints(isStable) {
  return isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
}

// BSC TESTNET
// const RPC_PROVIDERS = [
//   "https://data-seed-prebsc-1-s1.binance.org:8545",
//   "https://data-seed-prebsc-2-s1.binance.org:8545",
//   "https://data-seed-prebsc-1-s2.binance.org:8545",
//   "https://data-seed-prebsc-2-s2.binance.org:8545",
//   "https://data-seed-prebsc-1-s3.binance.org:8545",
//   "https://data-seed-prebsc-2-s3.binance.org:8545"
// ]

// BSC MAINNET
export const BSC_RPC_PROVIDERS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-dataseed2.defibit.io",
  "https://bsc-dataseed3.defibit.io",
  "https://bsc-dataseed4.defibit.io",
  "https://bsc-dataseed2.ninicoin.io",
  "https://bsc-dataseed3.ninicoin.io",
  "https://bsc-dataseed4.ninicoin.io",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org"
]

const ARBITRUM_RPC_PROVIDERS = [
  "https://arb1.arbitrum.io/rpc"
]

const RPC_PROVIDERS = {
  [MAINNET]: BSC_RPC_PROVIDERS,
  [ARBITRUM]: ARBITRUM_RPC_PROVIDERS
}

export function shortenAddress(address) {
  if (!address) { return address }
  if (address.length < 10) { return address }
  return address.substring(0, 6) + "..." + address.substring(address.length - 4, address.length)
}

export function formatDateTime(time) {
  return formatDateFn(time * 1000, "dd MMM yyyy, h:mm a")
}

export function formatDate(time) {
  return formatDateFn(time * 1000, "dd MMM yyyy")
}

export function getInjectedConnector() {
  return injected
}

export function useChainId() {
  const { chainId } = useWeb3React()

  if (!supportedChainIds.includes(chainId)) {
    return { chainId: DEFAULT_CHAIN_ID }
  }
  return { chainId }
}

export function useEagerConnect() {
  const injected = getInjectedConnector()
  const { activate, active } = useWeb3React()

  const [tried, setTried] = useState(false)

  useEffect(() => {
    injected.isAuthorized().then((isAuthorized) => {
      if (isAuthorized) {
        activate(injected, undefined, true).catch(() => {
          setTried(true)
        })
      } else {
        setTried(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (!tried && active) {
      setTried(true)
    }
  }, [tried, active])

  return tried
}

export function useInactiveListener(suppress: boolean = false) {
  const injected = getInjectedConnector()
  const { active, error, activate } = useWeb3React()

  useEffect((): any => {
    const { ethereum } = window
    if (ethereum && ethereum.on && !active && !error && !suppress) {
      const handleConnect = () => {
        activate(injected)
      }
      const handleChainChanged = (chainId: string | number) => {
        activate(injected)
      }
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          activate(injected)
        }
      }
      const handleNetworkChanged = (networkId: string | number) => {
        activate(injected)
      }

      ethereum.on('connect', handleConnect)
      ethereum.on('chainChanged', handleChainChanged)
      ethereum.on('accountsChanged', handleAccountsChanged)
      ethereum.on('networkChanged', handleNetworkChanged)

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('connect', handleConnect)
          ethereum.removeListener('chainChanged', handleChainChanged)
          ethereum.removeListener('accountsChanged', handleAccountsChanged)
          ethereum.removeListener('networkChanged', handleNetworkChanged)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, error, suppress, activate])
}

export function getProvider(library, chainId) {
  let provider;
  if (library) {
    return library.getSigner()
  }
  provider = _.sample(RPC_PROVIDERS[chainId])
  return new ethers.providers.JsonRpcProvider(provider)
}

const ordersFetcher = (library, contractInfo, ...params) => (active, chainId, address, method) => {
  if (!ethers.utils.isAddress(address)) {
    return;
  }
  const provider = getProvider(library, chainId)
  const contract = new ethers.Contract(address, contractInfo.abi, provider)
  return contract[method](...params).catch(console.error)
}

export const fetcher = (library, contractInfo, additionalArgs) => (...args) => {
  // eslint-disable-next-line
  const [id, chainId, arg0, arg1, ...params] = args
  const provider = getProvider(library, chainId);

  const method = ethers.utils.isAddress(arg0) ? arg1 : arg0

  function onError(e) {
      console.error(contractInfo.contractName, method, e)
  }

  if (ethers.utils.isAddress(arg0)) {
    const address = arg0
    const contract = new ethers.Contract(address, contractInfo.abi, provider)

    try {
      if (additionalArgs) {
        return contract[method](...params.concat(additionalArgs)).catch(onError)
      }
      return contract[method](...params).catch(onError)
    } catch (e) {
      onError(e)
    }
  }

  if (!library) {
    return
  }

  return library[method](arg1, ...params).catch(onError)
}

export function bigNumberify(n) {
  return ethers.BigNumber.from(n)
}

export function expandDecimals(n, decimals) {
  return bigNumberify(n).mul(bigNumberify(10).pow(decimals))
}

export const trimZeroDecimals = (amount) => {
  if (parseFloat(amount) === parseInt(amount)) {
    return parseInt(amount).toString()
  }
  return amount
}

export const limitDecimals = (amount, maxDecimals) => {
  let amountStr = amount.toString()
  if (maxDecimals === undefined) {
    return amountStr
  }
  if (maxDecimals === 0) {
    return amountStr.split(".")[0]
  }
  const dotIndex = amountStr.indexOf(".")
  if (dotIndex !== -1) {
    let decimals = amountStr.length - dotIndex - 1
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals))
    }
  }
  return amountStr
}

export const padDecimals = (amount, minDecimals) => {
  let amountStr = amount.toString()
  const dotIndex = amountStr.indexOf(".")
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1
    if (decimals < minDecimals) {
      amountStr = amountStr.padEnd(amountStr.length + (minDecimals - decimals), "0")
    }
  } else {
    amountStr = amountStr + ".0000"
  }
  return amountStr
}

export const formatKeyAmount = (map, key, tokenDecimals, displayDecimals, useCommas) => {
  if (!map || !map[key]) {
    return "..."
  }

  return formatAmount(map[key], tokenDecimals, displayDecimals, useCommas)
}

export const formatArrayAmount = (arr, index, tokenDecimals, displayDecimals, useCommas) => {
  if (!arr || !arr[index]) {
    return "..."
  }

  return formatAmount(arr[index], tokenDecimals, displayDecimals, useCommas)
}

function _parseOrdersData(ordersData, account, indices, extractor, uintPropsLength, addressPropsLength) {
  if (!ordersData || ordersData.length === 0) {
    return [];
  }
  const [uintProps, addressProps] = ordersData;
  const count = uintProps.length / uintPropsLength;

  const orders = [];
  for (let i = 0; i < count; i++) {
    const sliced = addressProps
      .slice(addressPropsLength * i, addressPropsLength * (i + 1))
      .concat(
        uintProps.slice(uintPropsLength * i, uintPropsLength * (i + 1))
      );

    if (sliced[0] === AddressZero && sliced[1] === AddressZero) {
      continue;
    }

    const order = extractor(sliced);
    order.index = indices[i];
    order.account = account;
    orders.push(order);
  }

  return orders;
}

function parseDecreaseOrdersData(decreaseOrdersData, account, indices) {
  const extractor = sliced => {
    const swapOption = sliced[4].toString() === "1" ? LONG : SHORT
    return {
      collateralToken: sliced[0],
      indexToken: sliced[1],
      collateralDelta: sliced[2],
      sizeDelta: sliced[3],
      swapOption,
      triggerPrice: sliced[5],
      triggerAboveThreshold: sliced[6].toString() === "1",
      orderType: STOP
    }
  }
  return _parseOrdersData(decreaseOrdersData, account, indices, extractor, 5, 2)
}

function parseIncreaseOrdersData(increaseOrdersData, account, indices) {
  const extractor = sliced => {
    const swapOption = sliced[5].toString() === "1" ? LONG : SHORT
    return {
      purchaseToken: sliced[0],
      collateralToken: sliced[1],
      indexToken: sliced[2],
      purchaseTokenAmount: sliced[3],
      sizeDelta: sliced[4],
      swapOption,
      triggerPrice: sliced[6],
      triggerAboveThreshold: sliced[7].toString() === "1",
      orderType: LIMIT
    }
  }
  return _parseOrdersData(increaseOrdersData, account, indices, extractor, 5, 3)
}

function parseSwapOrdersData(swapOrdersData, account, indices) {
  if (!swapOrdersData || !swapOrdersData.length) {
    return [];
  }

  const extractor = sliced => {
    const triggerAboveThreshold = sliced[6].toString() === '1';
    return {
      fromTokenAddress: sliced[0],
      toTokenAddress: sliced[2] === AddressZero ? sliced[1] : sliced[2],
      amountIn: sliced[3],
      minOut: sliced[4],
      triggerRatio: sliced[5],
      triggerAboveThreshold,
      swapOption: SWAP,
      orderType: triggerAboveThreshold ? STOP : LIMIT
    }
  }
  return _parseOrdersData(swapOrdersData, account, indices, extractor, 4, 3)
}

function _useOrdersByType(shouldRequest, chainId, method, indexProp, parseFunc, indices = []) {
  const { active, library, account } = useWeb3React();
  const LIMIT = 10;
  const orderBookReaderAddress = getContract(chainId, "OrderBookReader")
  const getKey = (method, index) => {
    if (!(active && account && index && index.gt(0))) {
      return false;
    }
    // using `index.toString()` because BigNumber(0) !== BigNumber(0)
    // and useSWR tries to retrieve data again
    return [active, chainId, orderBookReaderAddress, method, orderBookAddress, account, index.toString()];
  }

  const getIndicesRange = (to, from) => {
    const _indices = []
    from = from || Math.max(to - LIMIT, 0)
    for (let i = to - 1; i >= from; i--) {
      _indices.push(i);
    }
    return _indices;
  }

  const orderBookAddress = getContract(chainId, "OrderBook")

  const { data: currentOrderIndex = bigNumberify(0), mutate: updateOrderIndex } = useSWR(
    shouldRequest ? [active, chainId, orderBookAddress, indexProp, account] : false,
    { fetcher: fetcher(library, OrderBook) }
  );

  if (indices.length === 0) {
    indices = getIndicesRange(currentOrderIndex)
  } else if (indices[indices.length - 1] < currentOrderIndex - 1) {
    indices = [...indices, ...getIndicesRange(currentOrderIndex, indices[indices.length - 1] + 1)].sort((a, b) => b - a)
  }

  const ordersKey = getKey(method, currentOrderIndex);
  const { data: ordersData, mutate: updateOrders } = useSWR(ordersKey, {
    fetcher: ordersFetcher(library, OrderBookReader, orderBookAddress, account, indices)
  })
  const orders = parseFunc(ordersData, account, indices)

  return [
    orders,
    (orders, shouldRevalidate) => {
      updateOrderIndex(undefined, shouldRevalidate);
      updateOrders(undefined, shouldRevalidate)
    }
  ]
}

export function useOrders(flagOrdersEnabled) {
  const { account, active } = useWeb3React()
  const { chainId } = useChainId()
  const ordersIndicesUrl = `${getServerBaseUrl(chainId)}/orders_indices?account=${account}`
  const shouldRequest = active && account && flagOrdersEnabled

  const { data: indicesGroups = {} } = useSWR(shouldRequest ? ordersIndicesUrl : undefined, {
    dedupingInterval: 60000,
    fetcher: (...args) => {
      return fetch(...args)
        .then(res => {
          const json = res.json()
          for (const key of json) {
            json[key] = json[key].map(deserialize)
          }
          return json
        })
    }
  })

  const [swapOrders, updateSwapOrders] = _useOrdersByType(
    shouldRequest,
    chainId,
    "getSwapOrders",
    "swapOrdersIndex",
    parseSwapOrdersData,
    indicesGroups.Swap
  )
  const [increaseOrders, updateIncreaseOrders] = _useOrdersByType(
    shouldRequest,
    chainId,
    "getIncreaseOrders",
    "increaseOrdersIndex",
    parseIncreaseOrdersData,
    indicesGroups.Increase
  )
  const [decreaseOrders, updateDecreaseOrders] = _useOrdersByType(
    shouldRequest,
    chainId,
    "getDecreaseOrders",
    "decreaseOrdersIndex",
    parseDecreaseOrdersData,
    indicesGroups.Decrease
  )

  return [
    [
      ...swapOrders,
      ...increaseOrders,
      ...decreaseOrders
    ],
    // `_` arg to keep common signature for mutate functions...
    (_, shouldRevalidate) => {
      if (shouldRevalidate) {
        updateSwapOrders(undefined, true)
        updateIncreaseOrders(undefined, true)
        updateDecreaseOrders(undefined, true)
      }
    }
  ];
}

export const formatAmount = (amount, tokenDecimals, displayDecimals, useCommas, defaultValue) => {
  if (!defaultValue) {
    defaultValue = "..."
  }
  if (amount === undefined || amount.toString().length === 0) {
    return defaultValue
  }
  if (displayDecimals === undefined) {
    displayDecimals = 4
  }
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals)
  amountStr = limitDecimals(amountStr, displayDecimals)
  if (displayDecimals !== 0) {
    amountStr = padDecimals(amountStr, displayDecimals)
  }
  if (useCommas) {
    return numberWithCommas(amountStr)
  }
  return amountStr
}

export const formatAmountFree = (amount, tokenDecimals, displayDecimals) => {
  if (!amount) {
    return "..."
  }
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals)
  amountStr = limitDecimals(amountStr, displayDecimals)
  return trimZeroDecimals(amountStr)
}

export const parseValue = (value, tokenDecimals) => {
  const pValue = parseFloat(value)
  if (isNaN(pValue)) {
    return undefined
  }
  value = limitDecimals(value, tokenDecimals)
  const amount = ethers.utils.parseUnits(value, tokenDecimals)
  return bigNumberify(amount)
}

export function numberWithCommas(x) {
  if (!x) { return "..." }
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function getExplorerUrl(chainId) {
  if (chainId === 3) {
    return "https://ropsten.etherscan.io/"
  }
  if (chainId === 42) {
    return "https://kovan.etherscan.io/"
  }
  if (chainId === MAINNET) {
    return "https://bscscan.com/"
  }
  if (chainId === TESTNET) {
    return "https://testnet.bscscan.com/"
  }
  if (chainId === ARBITRUM_TESTNET) {
    return "https://rinkeby-explorer.arbitrum.io/"
  }
  if (chainId === ARBITRUM) {
    return "https://arbiscan.io/"
  }
  return "https://etherscan.io/"
}

export function getAccountUrl(chainId, account) {
  if (!account) {
    return getExplorerUrl(chainId)
  }
  return getExplorerUrl(chainId) + "address/" + account
}

export function getTokenUrl(chainId, address) {
  if (!address) {
    return getExplorerUrl(chainId)
  }
  return getExplorerUrl(chainId) + "token/" + address
}

export function usePrevious(value) {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

export async function getGasLimit(contract, method, params = [], value, gasBuffer) {
  const defaultGasBuffer = 50000
  const defaultValue = bigNumberify(0)

  if (!value) {
    value = defaultValue
  }

  let gasLimit = await contract.estimateGas[method](...params, { value })

  if (!gasBuffer) {
    gasBuffer = defaultGasBuffer
  }

  return gasLimit.add(gasBuffer)
}

export function approveTokens({ setIsApproving, library, tokenAddress, spender, chainId, onApproveSubmitted, getTokenInfo, infoTokens, pendingTxns, setPendingTxns, includeMessage }) {
  setIsApproving(true)
  const contract = new ethers.Contract(tokenAddress, Token.abi, library.getSigner())
  contract.approve(spender, ethers.constants.MaxUint256)
  .then(async (res) => {
    const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash
    toast.success(
      <div>
      Approval submitted! <a href={txUrl} target="_blank" rel="noopener noreferrer">View status.</a>
      <br/>
      </div>
    )
    if (onApproveSubmitted) {
      onApproveSubmitted()
    }
    if (getTokenInfo && infoTokens && pendingTxns && setPendingTxns) {
      const token = getTokenInfo(infoTokens, tokenAddress)
      const pendingTxn = {
        hash: res.hash,
        message: includeMessage ? `${token.symbol} Approved!` : false
      }
      setPendingTxns([...pendingTxns, pendingTxn])
    }
  })
  .catch((e) => {
    console.error(e)
    let failMsg
    if (["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(e.data?.message)) {
      failMsg = (<div>
        There is not enough ETH in your account on Arbitrum to send this transaction.<br/>
        <br/>
        <a href={"https://arbitrum.io/bridge-tutorial/"} target="_blank" rel="noopener noreferrer">Bridge ETH to Arbitrum</a>
      </div>)
    } else if (e.message?.includes("User denied transaction signature")) {
      failMsg = "Approval was cancelled."
    } else {
      failMsg = "Approval failed."
    }
    toast.error(failMsg)
  })
  .finally(() => {
    setIsApproving(false)
  })
}

export const shouldRaiseGasError = (token, amount) => {
  if (!amount) { return false }
  if (token.address !== AddressZero) { return false }
  if (!token.balance) { return false }
  if (amount.gte(token.balance)) { return true }
  if (token.balance.sub(amount).lt(DUST_BNB)) { return true }
  return false
}

export const getTokenInfo = (infoTokens, tokenAddress, replaceNative, nativeTokenAddress) => {
  if (replaceNative && tokenAddress === nativeTokenAddress) {
    return infoTokens[AddressZero]
  }
  return infoTokens[tokenAddress]
}

const NETWORK_METADATA = {
  [MAINNET]: {
    chainId: '0x' + MAINNET.toString(16),
    chainName: 'BSC',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: BSC_RPC_PROVIDERS,
    blockExplorerUrls: ['https://bscscan.com'],
  },
  [TESTNET]: {
    chainId: '0x' + TESTNET.toString(16),
    chainName: 'BSC Testnet',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
    blockExplorerUrls: ["https://testnet.bscscan.com/"],
  },
  [ARBITRUM_TESTNET]: {
    chainId: '0x' + ARBITRUM_TESTNET.toString(16),
    chainName: "Arbitrum Testnet",
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ["https://rinkeby.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://rinkeby-explorer.arbitrum.io/"],
  },
  [ARBITRUM]: {
    chainId: '0x' + ARBITRUM.toString(16),
    chainName: 'Arbitrum',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ARBITRUM_RPC_PROVIDERS,
    blockExplorerUrls: [getExplorerUrl(ARBITRUM)],
  },
}

export const addBscNetwork = async () => {
  return addNetwork(NETWORK_METADATA[MAINNET])
}

export const addNetwork = async (metadata) => {
  await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [metadata] }).catch()
}

export const switchNetwork = async (chainId) => {
  try {
    const chainIdHex = '0x' + chainId.toString(16)
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }]
    })
    toast.dismiss()
    toast.success("Wallet connected!")
  } catch (ex) {
    // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods
    // This error code indicates that the chain has not been added to MetaMask.
    if (ex.code === 4902) {
      return await addNetwork(NETWORK_METADATA[chainId])
    }

    console.error(ex)
  }
}

export const getConnectWalletHandler = (activate) => {
  const fn = async () => {
    activate(getInjectedConnector(), (e) => {
      if (e.message.includes("No Ethereum provider")) {
        toast.error(<div>
          Could not find a wallet to connect to.<br/>
          <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">Add a wallet</a> to start using the app.
        </div>)
        return
      }
      if (e instanceof UnsupportedChainIdError) {
        toast.error(<div>
          <div>Your wallet is not connected to {getChainName(DEFAULT_CHAIN_ID)}.</div><br/>
          <div className="clickable underline margin-bottom" onClick={() => switchNetwork(DEFAULT_CHAIN_ID)}>
            Switch to {getChainName(DEFAULT_CHAIN_ID)}
          </div>
          <div className="clickable underline" onClick={() => switchNetwork(DEFAULT_CHAIN_ID)}>
            Add {getChainName(DEFAULT_CHAIN_ID)}
          </div>
        </div>)
        return
      }
      toast.error(e.toString())
    })
  }
  return fn
}

export function getInfoTokens(tokens, tokenBalances, whitelistedTokens, vaultTokenInfo, fundingRateInfo, vaultPropsLength) {
  if (!vaultPropsLength) {
    vaultPropsLength = 12
  }
  const fundingRatePropsLength = 2
  const infoTokens = {}

  for (let i = 0; i < tokens.length; i++) {
    const token = JSON.parse(JSON.stringify(tokens[i]))
    if (tokenBalances) {
      token.balance = tokenBalances[i]
    }
    if (token.address === USDG_ADDRESS) {
      token.minPrice = expandDecimals(1, USD_DECIMALS)
      token.maxPrice = expandDecimals(1, USD_DECIMALS)
    }
    infoTokens[token.address] = token
  }

  for (let i = 0; i < whitelistedTokens.length; i++) {
    const token = JSON.parse(JSON.stringify(whitelistedTokens[i]))
    if (vaultTokenInfo) {
      token.poolAmount = vaultTokenInfo[i * vaultPropsLength]
      token.reservedAmount = vaultTokenInfo[i * vaultPropsLength + 1]
      token.availableAmount = token.poolAmount.sub(token.reservedAmount)
      token.usdgAmount = vaultTokenInfo[i * vaultPropsLength + 2]
      token.redemptionAmount = vaultTokenInfo[i * vaultPropsLength + 3]
      token.weight = vaultTokenInfo[i * vaultPropsLength + 4]
      token.bufferAmount = vaultTokenInfo[i * vaultPropsLength + 5]
      token.maxUsdgAmount = vaultTokenInfo[i * vaultPropsLength + 6]
      token.minPrice = vaultTokenInfo[i * vaultPropsLength + 7]
      token.maxPrice = vaultTokenInfo[i * vaultPropsLength + 8]
      token.guaranteedUsd = vaultTokenInfo[i * vaultPropsLength + 9]

      token.availableUsd = token.isStable
        ? token.poolAmount.mul(token.minPrice).div(expandDecimals(1, token.decimals))
        : token.availableAmount.mul(token.minPrice).div(expandDecimals(1, token.decimals))

      token.managedUsd = token.availableUsd.add(token.guaranteedUsd)
      token.managedAmount = token.managedUsd.mul(expandDecimals(1, token.decimals)).div(token.minPrice)
    }

    if (fundingRateInfo) {
      token.fundingRate = fundingRateInfo[i * fundingRatePropsLength];
      token.cumulativeFundingRate = fundingRateInfo[i * fundingRatePropsLength + 1];
    }

    if (infoTokens[token.address]) {
      token.balance = infoTokens[token.address].balance
    }

    infoTokens[token.address] = token
  }

  return infoTokens
}
