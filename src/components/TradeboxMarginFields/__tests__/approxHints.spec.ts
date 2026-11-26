// @vitest-shared-worker
import { describe, expect, it } from "vitest";

import { expandDecimals, joinNumberParts, USD_DECIMALS } from "lib/numbers";
import type { Token } from "sdk/utils/tokens/types";

import { formatTokenAmountHint, formatUsdHintParts } from "../approxHints";

const amount = (value: number, decimals: number) => BigInt(Math.round(value * 100)) * expandDecimals(1, decimals - 2);
const token = (symbol: string, decimals: number, extra: Partial<Token> = {}) =>
  ({ symbol, decimals, address: "0x0", name: symbol, ...extra }) as Token;

const BTC = token("BTC", 8);
const PEPE = token("PEPE", 18, { visualMultiplier: 1000, visualPrefix: "k" });

describe("formatTokenAmountHint", () => {
  it("shows amounts under 1 million in full, with thousands commas", () => {
    expect(formatTokenAmountHint(amount(999_999.5, 8), BTC)).toMatch(/^999,999\.\d+\u00a0BTC$/);
    expect(formatTokenAmountHint(amount(64.8, 8), BTC)).toMatch(/^64\.8\d*\u00a0BTC$/);
  });

  it("uses the short form from 1 million", () => {
    expect(formatTokenAmountHint(amount(33_000_000_000, 8), BTC)).toBe("33.0b\u00a0BTC");
  });

  it("divides by the visual multiplier and labels the token with its prefix", () => {
    expect(formatTokenAmountHint(amount(286_300_000_000, 18), PEPE)).toBe("286.3m\u00a0kPEPE");
  });

  it("caps where the short form would read 1000.0b", () => {
    expect(formatTokenAmountHint(amount(999_960_000_000, 8), BTC)).toBe("> 1,000b\u00a0BTC");
    expect(formatTokenAmountHint(amount(999_000_000_000, 8), BTC)).toBe("999.0b\u00a0BTC");
  });
});

describe("formatUsdHintParts", () => {
  const usd = (value: number) => joinNumberParts(formatUsdHintParts(amount(value, USD_DECIMALS)));

  it("shows dollars under 1 million in full", () => {
    expect(usd(1_234.5)).toMatch(/^\$\s?1,234\.50$/);
  });

  it("uses the short form from 1 million and caps from 999.95b", () => {
    expect(usd(286_300_000)).toMatch(/^\$\s?286\.3m$/);
    expect(usd(2_000_000_000_000)).toMatch(/^>\u00a0\$\s?1,000b$/);
  });
});
