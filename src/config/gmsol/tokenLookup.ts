import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { Token, TokenAddressTypesMap } from "sdk/utils/tokens/types";

import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS, type GmsolTokenConfig } from "./tokens";

function toToken({ tokenProgram: _tokenProgram, ...token }: GmsolTokenConfig): Token {
  return token;
}

const gmsolNativeToken: Token = { ...GMSOL_NATIVE_TOKEN };

const gmsolTokensByAddress = new Map<string, Token>([[gmsolNativeToken.address, gmsolNativeToken]]);
// Native SOL shares the symbol "SOL" with the index mint and stays out of this map.
const gmsolTokensBySymbol = new Map<string, Token>();

for (const config of GMSOL_TOKENS) {
  const token = toToken(config);
  gmsolTokensByAddress.set(token.address, token);
  gmsolTokensBySymbol.set(token.symbol, token);
}

function missingWsol(): never {
  throw new Error("GMSOL WSOL is not configured");
}

const gmsolWrappedToken = gmsolTokensBySymbol.get("WSOL") ?? missingWsol();

const gmsolTokenAddresses: readonly string[] = [
  gmsolNativeToken.address,
  ...GMSOL_TOKENS.map((token) => token.address),
];

export function getGmsolTokenAddresses(): readonly string[] {
  return gmsolTokenAddresses;
}

export function getGmsolToken(address: string): Token | undefined {
  return gmsolTokensByAddress.get(address);
}

export function getGmsolTokenBySymbol(symbol: string): Token | undefined {
  return gmsolTokensBySymbol.get(symbol);
}

export function getGmsolNativeToken(): Token {
  return gmsolNativeToken;
}

export function getGmsolWrappedToken(): Token {
  return gmsolWrappedToken;
}

export function convertGmsolTokenAddress<T extends keyof TokenAddressTypesMap, R extends TokenAddressTypesMap[T]>(
  address: string,
  convertTo?: T
): R {
  if (convertTo === "wrapped" && address === NATIVE_TOKEN_ADDRESS) {
    return gmsolWrappedToken.address as R;
  }

  if (convertTo === "native" && address === gmsolWrappedToken.address) {
    return NATIVE_TOKEN_ADDRESS as R;
  }

  return address as R;
}
