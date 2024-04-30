import { getExplorerUrl } from "config/chains";
import { getVisibleV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
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
import { InfoTokens, Token, TokenInfo, TokenPrices } from "./types";
import { convertToTokenAmount } from "domain/synthetics/tokens";
const { ZeroAddress } = ethers;

export function getTokenUrl(chainId: number, address: string) {
  if (!address) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "token/" + address;
}

export function getIsEquivalentTokens(token1: Token, token2: Token) {
  if (token1.address === token2.address) {
    return true;
  }

  if (token1.wrappedAddress === token2.address || token2.wrappedAddress === token1.address) {
    return true;
  }

  if ((token1.isSynthetic || token2.isSynthetic) && token1.symbol === token2.symbol) {
    return true;
  }

  return false;
}

export function getIsWrap(token1: Token, token2: Token) {
  return token1.isNative && token2.isWrapped;
}

export function getIsUnwrap(token1: Token, token2: Token) {
  return token1.isWrapped && token2.isNative;
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
    return infoTokens[ZeroAddress];
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

  const tokens = getVisibleV1Tokens(chainId);

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
        // eslint-disable-next-line no-prototype-builtins
        asset.hasOwnProperty("fees") &&
        swapUsdMin.lt(asset.amountLeftToDeposit)
    )
    .sort((a, b) => a.fees - b.fees);

  return tokensWithLiquidity.length > 0
    ? tokensWithLiquidity[0]
    : tokensData.sort((a, b) => Number(b.amountLeftToDeposit.sub(a.amountLeftToDeposit)))[0];
}

export function getMostAbundantStableToken(chainId: number, infoTokens: InfoTokens) {
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
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
  if (token.address !== ZeroAddress) {
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
    if (address === ZeroAddress) {
      address = nativeTokenAddress;
    }
    updatedPath.push(address);
  }

  return updatedPath;
};

export function getSpread(p: { minPrice: BigNumber; maxPrice: BigNumber }): BigNumber {
  const diff = p.maxPrice.sub(p.minPrice);
  return diff.mul(PRECISION).div(p.maxPrice.add(p.minPrice).div(2));
}

export function getMidPrice(prices: TokenPrices) {
  return prices.minPrice.add(prices.maxPrice).div(2);
}

// calculates the minimum amount of native currency that should be left to be used as gas fees
export function getMinResidualAmount(decimals?: number, price?: BigNumber) {
  if (!decimals || !price) {
    return BigInt(0);
  }

  const MIN_NATIVE_CURRENCY_FOR_GAS = expandDecimals(10, USD_DECIMALS);
  return convertToTokenAmount(MIN_NATIVE_CURRENCY_FOR_GAS, decimals, price);
}
