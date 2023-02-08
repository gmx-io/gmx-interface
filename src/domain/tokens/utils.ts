import { getExplorerUrl } from "config/chains";
import { getVisibleTokens, getWhitelistedTokens } from "config/tokens";
import { BigNumber, ethers } from "ethers";
import {
  DUST_BNB,
  MARKET,
  MINT_BURN_FEE_BASIS_POINTS,
  PRECISION,
  TAX_BASIS_POINTS,
  USDG_ADDRESS,
  USDG_DECIMALS,
  USD_DECIMALS,
  adjustForDecimals,
  getFeeBasisPoints,
} from "lib/legacy";
import { bigNumberify, expandDecimals } from "lib/numbers";
import { InfoTokens, Token, TokenInfo } from "./types";
import { HIGH_SPREAD_THRESHOLD } from "config/factors";

const { AddressZero } = ethers.constants;

export function getTokenUrl(chainId: number, address: string) {
  if (!address) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "token/" + address;
}

export function getUsd(
  amount: BigNumber | undefined,
  tokenAddress: string,
  max: boolean,
  infoTokens: InfoTokens,
  orderOption?: string,
  triggerPriceUsd?: BigNumber
) {
  if (!amount) {
    return;
  }
  if (tokenAddress === USDG_ADDRESS) {
    return amount.mul(PRECISION).div(expandDecimals(1, 18));
  }
  const info = getTokenInfo(infoTokens, tokenAddress);
  const price = getTriggerPrice(tokenAddress, max, info, orderOption, triggerPriceUsd);
  if (!price) {
    return;
  }

  return amount.mul(price).div(expandDecimals(1, info.decimals));
}

export function getTokenAmountFromUsd(
  infoTokens: InfoTokens,
  tokenAddress: string,
  usdAmount?: BigNumber,
  opts: {
    max?: boolean;
    overridePrice?: BigNumber;
  } = {}
) {
  if (!usdAmount) {
    return;
  }

  if (tokenAddress === USDG_ADDRESS) {
    return usdAmount.mul(expandDecimals(1, 18)).div(PRECISION);
  }

  const info: TokenInfo | undefined = getTokenInfo(infoTokens, tokenAddress);

  if (!info) {
    return;
  }

  const price = opts.overridePrice || (opts.max ? info.maxPrice : info.minPrice);

  if (!BigNumber.isBigNumber(price) || price.lte(0)) {
    return;
  }

  return usdAmount.mul(expandDecimals(1, info.decimals)).div(price);
}

export function getTriggerPrice(
  tokenAddress: string,
  max: boolean,
  info: TokenInfo,
  orderOption?: string,
  triggerPriceUsd?: BigNumber
) {
  // Limit/stop orders are executed with price specified by user
  if (orderOption && orderOption !== MARKET && triggerPriceUsd) {
    return triggerPriceUsd;
  }

  // Market orders are executed with current market price
  if (!info) {
    return;
  }
  if (max && !info.maxPrice) {
    return;
  }
  if (!max && !info.minPrice) {
    return;
  }
  return max ? info.maxPrice : info.minPrice;
}

export function getTokenInfo(
  infoTokens: InfoTokens,
  tokenAddress: string,
  replaceNative?: boolean,
  nativeTokenAddress?: string
) {
  if (replaceNative && tokenAddress === nativeTokenAddress) {
    return infoTokens[AddressZero];
  }

  return infoTokens[tokenAddress];
}

export function getLowestFeeTokenForBuyGlp(
  chainId: number,
  toAmount: BigNumber,
  glpPrice: BigNumber,
  usdgSupply: BigNumber,
  totalTokenWeights: BigNumber,
  infoTokens: InfoTokens,
  fromTokenAddress: string,
  swapUsdMin: BigNumber
): { token: Token; fees: number; amountLeftToDeposit: BigNumber } | undefined {
  if (!chainId || !toAmount || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights || !swapUsdMin) {
    return;
  }

  const tokens = getVisibleTokens(chainId);

  const usdgAmount = toAmount.mul(glpPrice).div(PRECISION);

  const tokensData = tokens.map((token) => {
    const fromToken = getTokenInfo(infoTokens, token.address);

    const fees = getFeeBasisPoints(
      fromToken,
      fromToken.usdgAmount,
      usdgAmount,
      MINT_BURN_FEE_BASIS_POINTS,
      TAX_BASIS_POINTS,
      true,
      usdgSupply,
      totalTokenWeights
    );

    let amountLeftToDeposit = bigNumberify(0)!;

    if (
      fromToken.maxUsdgAmount &&
      fromToken.maxUsdgAmount.gt(0) &&
      fromToken.usdgAmount &&
      fromToken.usdgAmount.gt(0)
    ) {
      amountLeftToDeposit = fromToken.maxUsdgAmount
        .sub(fromToken.usdgAmount)
        .mul(expandDecimals(1, USD_DECIMALS))
        .div(expandDecimals(1, USDG_DECIMALS));
    }
    return { token, fees, amountLeftToDeposit };
  });

  const tokensWithLiquidity = tokensData
    .filter(
      (asset) =>
        asset.token.address !== fromTokenAddress &&
        asset.hasOwnProperty("fees") &&
        swapUsdMin.lt(asset.amountLeftToDeposit)
    )
    .sort((a, b) => a.fees - b.fees);

  return tokensWithLiquidity.length > 0
    ? tokensWithLiquidity[0]
    : tokensData.sort((a, b) => Number(b.amountLeftToDeposit.sub(a.amountLeftToDeposit)))[0];
}

export function getMostAbundantStableToken(chainId: number, infoTokens: InfoTokens) {
  const whitelistedTokens = getWhitelistedTokens(chainId);
  let availableAmount;
  let stableToken = whitelistedTokens.find((t) => t.isStable);

  for (let i = 0; i < whitelistedTokens.length; i++) {
    const info = getTokenInfo(infoTokens, whitelistedTokens[i].address);
    if (!info.isStable || !info.availableAmount) {
      continue;
    }

    const adjustedAvailableAmount = adjustForDecimals(info.availableAmount, info.decimals, USD_DECIMALS);
    if (!availableAmount || adjustedAvailableAmount.gt(availableAmount)) {
      availableAmount = adjustedAvailableAmount;
      stableToken = info;
    }
  }

  return stableToken as TokenInfo;
}

export function shouldRaiseGasError(token: TokenInfo, amount?: BigNumber) {
  if (!amount) {
    return false;
  }
  if (token.address !== AddressZero) {
    return false;
  }
  if (!token.balance) {
    return false;
  }
  if (amount.gte(token.balance)) {
    return true;
  }
  if (token.balance.sub(amount).lt(DUST_BNB)) {
    return true;
  }
  return false;
}

export const replaceNativeTokenAddress = (path: string[], nativeTokenAddress: string) => {
  if (!path) {
    return;
  }

  let updatedPath: string[] = [];

  for (let i = 0; i < path.length; i++) {
    let address = path[i];
    if (address === AddressZero) {
      address = nativeTokenAddress;
    }
    updatedPath.push(address);
  }

  return updatedPath;
};

export function getSpread(fromTokenInfo, toTokenInfo, isLong, nativeTokenAddress) {
  if (fromTokenInfo && fromTokenInfo.maxPrice && toTokenInfo && toTokenInfo.minPrice) {
    const fromDiff = fromTokenInfo.maxPrice.sub(fromTokenInfo.minPrice).div(2);
    const fromSpread = fromDiff.mul(PRECISION).div(fromTokenInfo.maxPrice.add(fromTokenInfo.minPrice).div(2));
    const toDiff = toTokenInfo.maxPrice.sub(toTokenInfo.minPrice).div(2);
    const toSpread = toDiff.mul(PRECISION).div(toTokenInfo.maxPrice.add(toTokenInfo.minPrice).div(2));

    let value = fromSpread.add(toSpread);

    const fromTokenAddress = fromTokenInfo.isNative ? nativeTokenAddress : fromTokenInfo.address;
    const toTokenAddress = toTokenInfo.isNative ? nativeTokenAddress : toTokenInfo.address;

    if (isLong && fromTokenAddress === toTokenAddress) {
      value = fromSpread;
    }

    return {
      value,
      isHigh: value.gt(HIGH_SPREAD_THRESHOLD),
    };
  }
}
