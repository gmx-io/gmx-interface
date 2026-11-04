import { describe, expect, it } from "vitest";

import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS } from "config/gmsol/tokens";

import { SOLANA_WALLET_TOKENS } from "./walletTokens";

describe("SOLANA_WALLET_TOKENS", () => {
  it("holds native SOL and every non-synthetic mint, never a synthetic one", () => {
    const addresses = SOLANA_WALLET_TOKENS.map((token) => token.address);

    expect(addresses[0]).toBe(GMSOL_NATIVE_TOKEN.address);
    expect(addresses.slice(1)).toEqual(GMSOL_TOKENS.filter((token) => !token.isSynthetic).map((token) => token.address));
  });

  it("maps wrapped tokens to an icon the app ships", () => {
    const iconBySymbol = Object.fromEntries(SOLANA_WALLET_TOKENS.map((token) => [token.symbol, token.iconSymbol]));

    expect(iconBySymbol.WSOL).toBe("SOL");
    expect(iconBySymbol.WGMX).toBe("GMX");
    expect(iconBySymbol.USDC).toBe("USDC");
  });
});
