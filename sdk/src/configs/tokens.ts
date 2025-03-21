import { zeroAddress } from "viem";

import { Token, TokenCategory } from "types/tokens";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";

import arbitrumTokens from "./source/tokens/arbitrum.json";
import avalancheTokens from "./source/tokens/avalanche.json";
import avalancheFujiTokens from "./source/tokens/avalanche_fuji.json";

export const NATIVE_TOKEN_ADDRESS = zeroAddress;

export const TOKENS: { [chainId: number]: Token[] } = {
  [ARBITRUM]: arbitrumTokens as Token[],
  [AVALANCHE]: avalancheTokens as Token[],
  [AVALANCHE_FUJI]: avalancheFujiTokens as Token[],
};

export const TOKEN_COLOR_MAP = {
  ETH: "#6062a6",
  BTC: "#F7931A",
  WBTC: "#F7931A",
  USDC: "#2775CA",
  "USDC.E": "#2A5ADA",
  USDT: "#67B18A",
  MIM: "#9695F8",
  FRAX: "#000",
  DAI: "#FAC044",
  UNI: "#E9167C",
  AVAX: "#E84142",
  LINK: "#3256D6",
  DOGE: "#BA9F2F",
  SOL: "#38cbc1",
  ARB: "#162c4f",
  NEAR: "#07eb98",
  BNB: "#efb90b",
  ATOM: "#6f7390",
  XRP: "#23292f",
  LTC: "#16182e",
  OP: "#ff0421",
  DOT: "#e6007a",
  tBTC: "#000000",
  TEST: "#2d3ed7",
  SHIB: "#f00601",
  STX: "#eb6230",
  ORDI: "#000000",
  MATIC: "#6f41d8",
  EIGEN: "#1A0C6D",
  SATS: "#F7931A",
  default: "#6062a6",
};

export const TOKENS_MAP: { [chainId: number]: { [address: string]: Token } } = {};
export const V1_TOKENS: { [chainId: number]: Token[] } = {};
export const V2_TOKENS: { [chainId: number]: Token[] } = {};
export const SYNTHETIC_TOKENS: { [chainId: number]: Token[] } = {};
export const TOKENS_BY_SYMBOL_MAP: { [chainId: number]: { [symbol: string]: Token } } = {};
export const WRAPPED_TOKENS_MAP: { [chainId: number]: Token } = {};
export const NATIVE_TOKENS_MAP: { [chainId: number]: Token } = {};

const CHAIN_IDS = [ARBITRUM, AVALANCHE, AVALANCHE_FUJI];

for (let j = 0; j < CHAIN_IDS.length; j++) {
  const chainId = CHAIN_IDS[j];

  TOKENS_MAP[chainId] = {};
  TOKENS_BY_SYMBOL_MAP[chainId] = {};
  SYNTHETIC_TOKENS[chainId] = [];
  V1_TOKENS[chainId] = [];
  V2_TOKENS[chainId] = [];

  let tokens = TOKENS[chainId];
  let wrappedTokenAddress: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    TOKENS_MAP[chainId][token.address] = token;
    TOKENS_BY_SYMBOL_MAP[chainId][token.symbol] = token;

    if (token.isWrapped) {
      WRAPPED_TOKENS_MAP[chainId] = token;
      wrappedTokenAddress = token.address;
    }

    if (token.isNative) {
      NATIVE_TOKENS_MAP[chainId] = token;
    }

    if (token.isV1Available && !token.isTempHidden) {
      V1_TOKENS[chainId].push(token);
    }

    if ((!token.isPlatformToken || (token.isPlatformToken && token.isPlatformTradingToken)) && !token.isTempHidden) {
      V2_TOKENS[chainId].push(token);
    }

    if (token.isSynthetic) {
      SYNTHETIC_TOKENS[chainId].push(token);
    }
  }

  NATIVE_TOKENS_MAP[chainId].wrappedAddress = wrappedTokenAddress;
}

export function getSyntheticTokens(chainId: number) {
  return SYNTHETIC_TOKENS[chainId];
}

export function getWrappedToken(chainId: number) {
  return WRAPPED_TOKENS_MAP[chainId];
}

export function getNativeToken(chainId: number) {
  return NATIVE_TOKENS_MAP[chainId];
}

export function getTokens(chainId: number) {
  return TOKENS[chainId];
}

export function getV1Tokens(chainId: number) {
  return V1_TOKENS[chainId];
}

export function getV2Tokens(chainId: number) {
  return V2_TOKENS[chainId];
}

export function getTokensMap(chainId: number) {
  return TOKENS_MAP[chainId];
}

export function getWhitelistedV1Tokens(chainId: number) {
  return getV1Tokens(chainId);
}

export function getVisibleV1Tokens(chainId: number) {
  return getV1Tokens(chainId).filter((token) => !token.isWrapped);
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

export function getTokenBySymbol(
  chainId: number,
  symbol: string,
  {
    isSynthetic,
    version,
    symbolType = "symbol",
  }: { isSynthetic?: boolean; version?: "v1" | "v2"; symbolType?: "symbol" | "baseSymbol" } = {}
) {
  let tokens = Object.values(TOKENS_MAP[chainId]);

  if (version) {
    tokens = version === "v1" ? getV1Tokens(chainId) : getV2Tokens(chainId);
  }

  let token: Token | undefined;

  if (isSynthetic !== undefined) {
    token = tokens.find((token) => {
      return token[symbolType]?.toLowerCase() === symbol.toLowerCase() && Boolean(token.isSynthetic) === isSynthetic;
    });
  } else {
    if (symbolType === "symbol" && TOKENS_BY_SYMBOL_MAP[chainId][symbol]) {
      token = TOKENS_BY_SYMBOL_MAP[chainId][symbol];
    } else {
      token = tokens.find((token) => token[symbolType]?.toLowerCase() === symbol.toLowerCase());
    }
  }

  if (!token) {
    throw new Error(`Incorrect symbol "${symbol}" for chainId ${chainId}`);
  }

  return token;
}

export function convertTokenAddress(chainId: number, address: string, convertTo?: "wrapped" | "native") {
  const wrappedToken = getWrappedToken(chainId);

  if (convertTo === "wrapped" && address === NATIVE_TOKEN_ADDRESS) {
    return wrappedToken.address;
  }

  if (convertTo === "native" && address === wrappedToken.address) {
    return NATIVE_TOKEN_ADDRESS;
  }

  return address;
}

export function getNormalizedTokenSymbol(tokenSymbol) {
  if (["WBTC", "WETH", "WAVAX"].includes(tokenSymbol)) {
    return tokenSymbol.substr(1);
  } else if (tokenSymbol.includes(".")) {
    return tokenSymbol.split(".")[0];
  }
  return tokenSymbol;
}

export function isChartAvailableForToken(chainId: number, tokenSymbol: string) {
  let token;

  try {
    token = getTokenBySymbol(chainId, tokenSymbol);
  } catch (e) {
    return false;
  }

  if (token.isChartDisabled || (token.isPlatformToken && !token.isPlatformTradingToken)) return false;

  return true;
}

export function getPriceDecimals(chainId: number, tokenSymbol?: string) {
  if (!tokenSymbol) return 2;

  try {
    const token = getTokenBySymbol(chainId, tokenSymbol);
    return token.priceDecimals ?? 2;
  } catch (e) {
    return 2;
  }
}

export function getTokenBySymbolSafe(
  chainId: number,
  symbol: string,
  params: Parameters<typeof getTokenBySymbol>[2] = {}
) {
  try {
    return getTokenBySymbol(chainId, symbol, params);
  } catch (e) {
    return;
  }
}

export function isTokenInList(token: Token, tokenList: Token[]): boolean {
  return tokenList.some((t) => t.address === token.address);
}

export function isSimilarToken(tokenA: Token, tokenB: Token) {
  if (tokenA.address === tokenB.address) {
    return true;
  }

  if (tokenA.symbol === tokenB.symbol || tokenA.baseSymbol === tokenB.symbol || tokenA.symbol === tokenB.baseSymbol) {
    return true;
  }

  return false;
}

export function getTokenVisualMultiplier(token: Token): string {
  return token.visualPrefix || token.visualMultiplier?.toString() || "";
}

export function getStableTokens(chainId: number) {
  return getTokens(chainId).filter((t) => t.isStable);
}

export function getCategoryTokenAddresses(chainId: number, category: TokenCategory) {
  return TOKENS[chainId].filter((token) => token.categories?.includes(category)).map((token) => token.address);
}

export const createTokensMap = (tokens: Token[]) => {
  return tokens.reduce((acc, token) => {
    acc[token.address] = token;
    return acc;
  }, {});
};
