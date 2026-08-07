import { describe, expect, it } from "vitest";

import { CHAIN_ID_PREFERRED_DEPOSIT_TOKEN } from "config/multichain";
import type { TokenData, TokensData } from "domain/tokens";
import { expandDecimals, numberToBigint } from "lib/numbers";
import { ARBITRUM } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { isDepositableFromWallet, resolveSettlementChainDepositToken } from "./depositTokenSelection";

const PREFERRED = CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[ARBITRUM];

const USD_PRICES_BY_SYMBOL: Record<string, number> = { ETH: 2000, GMX: 20, USDC: 1, FRAX: 1 };

function token(symbol: string, walletBalance: number | undefined): TokenData {
  const config = getTokenBySymbol(ARBITRUM, symbol);
  const price = expandDecimals(USD_PRICES_BY_SYMBOL[symbol], 30);

  return {
    ...config,
    prices: { minPrice: price, maxPrice: price },
    walletBalance: walletBalance === undefined ? undefined : numberToBigint(walletBalance, config.decimals),
  } as TokenData;
}

function wallet(...tokens: TokenData[]): TokensData {
  return Object.fromEntries(tokens.map((t) => [t.address, t]));
}

const GMX = getTokenBySymbol(ARBITRUM, "GMX").address;
const ETH = getTokenBySymbol(ARBITRUM, "ETH").address;
const FRAX = getTokenBySymbol(ARBITRUM, "FRAX").address;

function resolve(tokensData: TokensData | undefined, selectedTokenAddress?: string) {
  return resolveSettlementChainDepositToken({
    chainId: ARBITRUM,
    tokensData,
    selectedTokenAddress,
    preferredTokenAddress: PREFERRED,
  });
}

describe("isDepositableFromWallet", () => {
  it("accepts any asset the GMX Account can hold, not just the bridge assets", () => {
    expect(isDepositableFromWallet(ARBITRUM, token("GMX", 10))).toBe(true);
    expect(isDepositableFromWallet(ARBITRUM, token("USDC", 10))).toBe(true);
  });

  it("accepts the native token, which is wrapped on deposit", () => {
    expect(isDepositableFromWallet(ARBITRUM, token("ETH", 1))).toBe(true);
  });

  it("rejects assets no market uses as collateral", () => {
    expect(isDepositableFromWallet(ARBITRUM, token("FRAX", 500))).toBe(false);
  });

  it("rejects empty and unloaded balances", () => {
    expect(isDepositableFromWallet(ARBITRUM, token("GMX", 0))).toBe(false);
    expect(isDepositableFromWallet(ARBITRUM, token("GMX", undefined))).toBe(false);
    expect(isDepositableFromWallet(ARBITRUM, undefined)).toBe(false);
  });
});

describe("resolveSettlementChainDepositToken", () => {
  it("keeps a non-bridge asset the user picked (FEDEV-4173)", () => {
    const tokensData = wallet(token("GMX", 12.5), token("USDC", 100), token("ETH", 1));

    expect(resolve(tokensData, GMX)).toBe(GMX);
  });

  it("replaces a selection the GMX Account cannot hold", () => {
    const tokensData = wallet(token("FRAX", 500), token("USDC", 100));

    expect(resolve(tokensData, FRAX)).toBe(PREFERRED);
  });

  it("replaces a selection whose balance is spent", () => {
    const tokensData = wallet(token("GMX", 0), token("USDC", 100));

    expect(resolve(tokensData, GMX)).toBe(PREFERRED);
  });

  it("prefers the chain's deposit token when nothing is selected", () => {
    const tokensData = wallet(token("GMX", 12.5), token("USDC", 100));

    expect(resolve(tokensData, undefined)).toBe(PREFERRED);
  });

  it("falls back to the largest balance by USD when the preferred token is empty", () => {
    const tokensData = wallet(token("GMX", 12.5), token("ETH", 0.05), token("USDC", 0));

    expect(resolve(tokensData, undefined)).toBe(GMX);
  });

  it("does not leave the user stuck when the wallet holds only a non-bridge asset", () => {
    expect(resolve(wallet(token("GMX", 12.5)), undefined)).toBe(GMX);
  });

  it("ignores non-holdable assets when picking the largest balance", () => {
    const tokensData = wallet(token("FRAX", 5000), token("ETH", 0.05));

    expect(resolve(tokensData, undefined)).toBe(ETH);
  });

  it("reports no candidate while balances are still unknown", () => {
    expect(resolve(undefined, undefined)).toBeUndefined();
    expect(resolve(wallet(token("GMX", undefined)), undefined)).toBeUndefined();
  });
});
