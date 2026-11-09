import { describe, expect, it } from "vitest";

import { GMSOL_BALANCE_TOKENS, GMSOL_NATIVE_TOKEN, GMSOL_TOKENS } from "config/gmsol/tokens";

import { SOLANA_WALLET_TOKENS } from "./walletTokens";

describe("SOLANA_WALLET_TOKENS", () => {
  it("includes native SOL and the non-synthetic mints only", () => {
    const addresses = SOLANA_WALLET_TOKENS.map((token) => token.address);

    expect(addresses[0]).toBe(GMSOL_NATIVE_TOKEN.address);
    expect(addresses.slice(1)).toEqual(GMSOL_BALANCE_TOKENS.map((token) => token.address));
    expect(addresses).not.toContain("pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn");
    expect(addresses).not.toContain("WLFinEv6ypjkczcS83FZqFpgFZYwQXutRbxGe7oC16g");
  });

  it("keeps every mint that is not flagged synthetic", () => {
    const expected = GMSOL_TOKENS.filter((token) => !token.isSynthetic).map((token) => token.symbol);

    expect(SOLANA_WALLET_TOKENS.slice(1).map((token) => token.symbol)).toEqual(expected);
    expect(expected).toEqual(expect.arrayContaining(["WSOL", "USDC", "USDT", "WBTC", "WETH", "WGMX"]));
  });

  it("maps wrapped tokens to an icon the app ships", () => {
    const iconBySymbol = Object.fromEntries(SOLANA_WALLET_TOKENS.map((token) => [token.symbol, token.iconSymbol]));

    expect(iconBySymbol.WSOL).toBe("SOL");
    expect(iconBySymbol.WGMX).toBe("GMX");
    expect(iconBySymbol.USDC).toBe("USDC");
  });
});
