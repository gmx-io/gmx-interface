import { describe, expect, it } from "vitest";

import { iconSymbolCandidates, pickSolanaTokenIconSymbol } from "./solanaTokenIconSymbol";

const icons = new Set(["SOL", "GMX", "PUMP", "EUR", "USDJPY", "BTC"]);
const hasIcon = (symbol: string) => icons.has(symbol);

describe("pickSolanaTokenIconSymbol", () => {
  it("returns the symbol itself when an icon exists", () => {
    expect(pickSolanaTokenIconSymbol("BTC", hasIcon)).toBe("BTC");
    expect(pickSolanaTokenIconSymbol("USDJPY", hasIcon)).toBe("USDJPY");
  });

  it("unwraps W-prefixed symbols and strips a USD forex suffix", () => {
    expect(pickSolanaTokenIconSymbol("WSOL", hasIcon)).toBe("SOL");
    expect(pickSolanaTokenIconSymbol("WGMX", hasIcon)).toBe("GMX");
    expect(pickSolanaTokenIconSymbol("WPUMP", hasIcon)).toBe("PUMP");
    expect(pickSolanaTokenIconSymbol("EURUSD", hasIcon)).toBe("EUR");
  });

  it("returns undefined for shortened addresses and empty symbols", () => {
    expect(pickSolanaTokenIconSymbol("6uu9sf…qgtc", hasIcon)).toBeUndefined();
    expect(pickSolanaTokenIconSymbol("", hasIcon)).toBeUndefined();
    expect(pickSolanaTokenIconSymbol(undefined, hasIcon)).toBeUndefined();
  });

  it("does not unwrap plain symbols starting with W", () => {
    expect(iconSymbolCandidates("WIF")).toEqual(["WIF", "IF"]);
    expect(pickSolanaTokenIconSymbol("WLFI", hasIcon)).toBeUndefined();
  });
});
