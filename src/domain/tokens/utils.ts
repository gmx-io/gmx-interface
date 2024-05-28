import { getExplorerUrl } from "config/chains";
import { getVisibleV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
import { ethers } from "ethers";
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
import { expandDecimals } from "lib/numbers";
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
  amount: bigint | undefined,
  tokenAddress: string,
  max: boolean,
  infoTokens: InfoTokens,
  orderOption?: string,
  triggerPriceUsd?: bigint
) {
  if (amount === undefined) {
    return;
  }
  if (tokenAddress === USDG_ADDRESS) {
    return (amount * PRECISION) / expandDecimals(1, 18);
  }
  const info = getTokenInfo(infoTokens, tokenAddress);
  const price = getTriggerPrice(tokenAddress, max, info, orderOption, triggerPriceUsd);
  if (price === undefined) {
    return;
  }

  return (amount * price) / expandDecimals(1, info.decimals);
}

export function getTokenAmountFromUsd(
  infoTokens: InfoTokens,
  tokenAddress: string,
  usdAmount?: bigint,
  opts: {
    max?: boolean;
    overridePrice?: bigint;
  } = {}
) {
  if (usdAmount === undefined) {
    return;
  }

  if (tokenAddress === USDG_ADDRESS) {
    return (usdAmount * expandDecimals(1, 18)) / PRECISION;
  }

  const info: TokenInfo | undefined = getTokenInfo(infoTokens, tokenAddress);

  if (!info) {
    return;
  }

  const price = opts.overridePrice ?? (opts.max ? info.maxPrice : info.minPrice);

  if (price === undefined || price <= 0) {
    return;
  }

  return (usdAmount * expandDecimals(1, info.decimals)) / price;
}

export function getTriggerPrice(
  tokenAddress: string,
  max: boolean,
  info: TokenInfo,
  orderOption?: string,
  triggerPriceUsd?: bigint
) {
  // Limit/stop orders are executed with price specified by user
  if (orderOption && orderOption !== MARKET && triggerPriceUsd !== undefined) {
    return triggerPriceUsd;
  }

  // Market orders are executed with current market price
  if (!info) {
    return;
  }
  if (max && info.maxPrice === undefined) {
    return;
  }
  if (!max && info.minPrice === undefined) {
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
  toAmount: bigint,
  glpPrice: bigint,
  usdgSupply: bigint,
  totalTokenWeights: bigint,
  infoTokens: InfoTokens,
  fromTokenAddress: string,
  swapUsdMin: bigint
): { token: Token; fees: number; amountLeftToDeposit: bigint } | undefined {
  if (
    !chainId ||
    toAmount === undefined ||
    !infoTokens ||
    glpPrice === undefined ||
    usdgSupply === undefined ||
    totalTokenWeights === undefined ||
    swapUsdMin === undefined
  ) {
    return;
  }

  const tokens = getVisibleV1Tokens(chainId);

  const usdgAmount = (toAmount * glpPrice) / PRECISION;

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

    let amountLeftToDeposit = 0n;

    if (
      fromToken.maxUsdgAmount !== undefined &&
      fromToken.maxUsdgAmount > 0 &&
      fromToken.usdgAmount !== undefined &&
      fromToken.usdgAmount > 0
    ) {
      amountLeftToDeposit =
        ((fromToken.maxUsdgAmount - fromToken.usdgAmount) * expandDecimals(1, USD_DECIMALS)) /
        expandDecimals(1, USDG_DECIMALS);
    }
    return { token, fees, amountLeftToDeposit };
  });

  const tokensWithLiquidity = tokensData
    .filter(
      (asset) =>
        asset.token.address !== fromTokenAddress &&
        // eslint-disable-next-line no-prototype-builtins
        asset.hasOwnProperty("fees") &&
        swapUsdMin < asset.amountLeftToDeposit
    )
    .sort((a, b) => a.fees - b.fees);

  return tokensWithLiquidity.length > 0
    ? tokensWithLiquidity[0]
    : tokensData.sort((a, b) => Number(b.amountLeftToDeposit - a.amountLeftToDeposit))[0];
}

export function getMostAbundantStableToken(chainId: number, infoTokens: InfoTokens) {
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  let availableAmount: bigint | undefined;
  let stableToken = whitelistedTokens.find((t) => t.isStable);

  for (let i = 0; i < whitelistedTokens.length; i++) {
    const info = getTokenInfo(infoTokens, whitelistedTokens[i].address);
    if (!info.isStable || info.availableAmount === undefined) {
      continue;
    }

    const adjustedAvailableAmount = adjustForDecimals(info.availableAmount, info.decimals, USD_DECIMALS);
    if (availableAmount === undefined || adjustedAvailableAmount > availableAmount) {
      availableAmount = adjustedAvailableAmount;
      stableToken = info;
    }
  }

  return stableToken as TokenInfo;
}

export function shouldRaiseGasError(token: TokenInfo, amount?: bigint) {
  if (amount === undefined) {
    return false;
  }
  if (token.address !== ZeroAddress) {
    return false;
  }
  if (token.balance === undefined) {
    return false;
  }
  if (amount >= token.balance) {
    return true;
  }
  if (token.balance - amount < BigInt(DUST_BNB)) {
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

export function getSpread(p: { minPrice: bigint; maxPrice: bigint }): bigint {
  const diff = p.maxPrice - p.minPrice;
  return (diff * PRECISION) / ((p.maxPrice + p.minPrice) / 2n);
}

export function getMidPrice(prices: TokenPrices) {
  return (prices.minPrice + prices.maxPrice) / 2n;
}

// calculates the minimum amount of native currency that should be left to be used as gas fees
export function getMinResidualAmount(decimals?: number, price?: bigint) {
  if (!decimals || price === undefined) {
    return 0n;
  }

  const MIN_NATIVE_CURRENCY_FOR_GAS = expandDecimals(10, USD_DECIMALS);
  return convertToTokenAmount(MIN_NATIVE_CURRENCY_FOR_GAS, decimals, price);
}
