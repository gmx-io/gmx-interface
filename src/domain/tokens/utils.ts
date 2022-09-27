import { BigNumber } from "ethers";
import {
  bigNumberify,
  expandDecimals,
  getFeeBasisPoints,
  getTokenInfo,
  MINT_BURN_FEE_BASIS_POINTS,
  PRECISION,
  TAX_BASIS_POINTS,
  USD_DECIMALS,
  USDG_ADDRESS,
  USDG_DECIMALS,
} from "../../lib/legacy";
import { ARBITRUM, ARBITRUM_TESTNET, AVALANCHE, MAINNET, TESTNET } from "../../config/chains";
import { ADDITIONAL_TOKENS, TOKENS } from "../../config/tokens";
import { InfoTokens, Token, TokenInfo } from "./index";

const { TOKENS_MAP, TOKENS_BY_SYMBOL_MAP, WRAPPED_TOKENS_MAP, NATIVE_TOKENS_MAP } = prepareTokens();

export function getWrappedToken(chainId: number) {
  return WRAPPED_TOKENS_MAP[chainId];
}

export function getNativeToken(chainId: number) {
  return NATIVE_TOKENS_MAP[chainId];
}

export function getTokens(chainId: number) {
  return TOKENS[chainId];
}

export function isValidToken(chainId: number, address: string) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  return address in TOKENS_MAP[chainId];
}

export function getToken(chainId: number, address: string) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  if (!TOKENS_MAP[chainId][address]) {
    throw new Error(`Incorrect address "${address}" for chainId ${chainId}`);
  }
  return TOKENS_MAP[chainId][address];
}

export function getTokenBySymbol(chainId: number, symbol: string) {
  const token = TOKENS_BY_SYMBOL_MAP[chainId][symbol];
  if (!token) {
    throw new Error(`Incorrect symbol "${symbol}" for chainId ${chainId}`);
  }
  return token;
}

export function getWhitelistedTokens(chainId) {
  return TOKENS[chainId].filter((token) => token.symbol !== "USDG");
}

export function getVisibleTokens(chainId) {
  return getWhitelistedTokens(chainId).filter((token) => !token.isWrapped && !token.isTempHidden);
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
      usdgAmount,
      MINT_BURN_FEE_BASIS_POINTS,
      TAX_BASIS_POINTS,
      true,
      usdgSupply,
      totalTokenWeights
    );

    let amountLeftToDeposit = bigNumberify(0);

    if (fromToken.maxUsdgAmount && fromToken.maxUsdgAmount.gt(0)) {
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
    : tokensData.sort((a, b) => b.amountLeftToDeposit.sub(a.amountLeftToDeposit))[0];
}

function prepareTokens() {
  const CHAIN_IDS = [MAINNET, TESTNET, ARBITRUM, ARBITRUM_TESTNET, AVALANCHE];

  const TOKENS_MAP = {};
  const TOKENS_BY_SYMBOL_MAP = {};
  const WRAPPED_TOKENS_MAP = {};
  const NATIVE_TOKENS_MAP = {};

  for (let j = 0; j < CHAIN_IDS.length; j++) {
    const chainId = CHAIN_IDS[j];
    TOKENS_MAP[chainId] = {};
    TOKENS_BY_SYMBOL_MAP[chainId] = {};
    let tokens = TOKENS[chainId];
    if (ADDITIONAL_TOKENS[chainId]) {
      tokens = tokens.concat(ADDITIONAL_TOKENS[chainId]);
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      TOKENS_MAP[chainId][token.address] = token;
      TOKENS_BY_SYMBOL_MAP[chainId][token.symbol] = token;
    }
  }

  for (const chainId of CHAIN_IDS) {
    for (const token of TOKENS[chainId]) {
      if (token.isWrapped) {
        WRAPPED_TOKENS_MAP[chainId] = token;
      } else if (token.isNative) {
        NATIVE_TOKENS_MAP[chainId] = token;
      }
    }
  }

  return {
    TOKENS_MAP,
    TOKENS_BY_SYMBOL_MAP,
    WRAPPED_TOKENS_MAP,
    NATIVE_TOKENS_MAP,
  };
}
