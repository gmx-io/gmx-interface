import { USD_DECIMALS } from "config/factors";
import { describe, expect, it } from "vitest";
import {
  formatAmountHuman,
  formatBalanceAmount,
  formatBalanceAmountWithUsd,
  formatFactor,
  formatUsdPrice,
} from "./numbers";

const ONE_USD = 1000000000000000000000000000000n;

describe("formatUsdPrice", () => {
  it("should tolerate undefined", () => {
    expect(formatUsdPrice()).toBeUndefined();
  });

  it("should return NA if negative", () => {
    expect(formatUsdPrice(-1n)).toBe("NA");
  });

  it("should calculate correct decimals if displayDecimals not passed", () =>
    // prettier-ignore
    {
      expect(formatUsdPrice(ONE_USD * 10000n)).toBe(       "$10,000.00");
      expect(formatUsdPrice(ONE_USD * 1000n)).toBe(         "$1,000.00");
      expect(formatUsdPrice(ONE_USD * 100n)).toBe(            "$100.000");
      expect(formatUsdPrice(ONE_USD * 10n)).toBe(              "$10.0000");
      expect(formatUsdPrice(ONE_USD)).toBe(                     "$1.0000");
      expect(formatUsdPrice(ONE_USD / 10n)).toBe(               "$0.10000");
      expect(formatUsdPrice(ONE_USD / 100n)).toBe(              "$0.010000");
      expect(formatUsdPrice(ONE_USD / 1000n)).toBe(             "$0.0010000");
      expect(formatUsdPrice(ONE_USD / 10_000n)).toBe(           "$0.0001000");
      expect(formatUsdPrice(ONE_USD / 100_000n)).toBe(          "$0.00001000");
      expect(formatUsdPrice(ONE_USD / 1_000_000_000n)).toBe(    "$0.000000001");
      expect(formatUsdPrice(ONE_USD / 10_000_000_000n)).toBe( "< $0.000000001");
    });
});

describe("formatAmountHuman", () => {
  it("positive", () => {
    expect(formatAmountHuman(ONE_USD, USD_DECIMALS)).toBe("1.0");
    expect(formatAmountHuman(ONE_USD * 1000n, USD_DECIMALS)).toBe("1.0K");
    expect(formatAmountHuman(ONE_USD * 1000000n, USD_DECIMALS)).toBe("1.0M");
  });

  it("negative", () => {
    expect(formatAmountHuman(-1n * ONE_USD, USD_DECIMALS)).toBe("-1.0");
    expect(formatAmountHuman(-1n * ONE_USD * 1000n, USD_DECIMALS)).toBe("-1.0K");
    expect(formatAmountHuman(-1n * ONE_USD * 1000000n, USD_DECIMALS)).toBe("-1.0M");
  });

  it("should display dollar sign", () => {
    expect(formatAmountHuman(ONE_USD, USD_DECIMALS, true)).toBe("$1.0");
    expect(formatAmountHuman(-1n * ONE_USD, USD_DECIMALS, true)).toBe("-$1.0");
  });

  it("should display decimals", () => {
    expect(formatAmountHuman(ONE_USD * 1000n, USD_DECIMALS, false, 2)).toBe("1.00K");
    expect(formatAmountHuman(ONE_USD * 1500000n, USD_DECIMALS, false, 2)).toBe("1.50M");
    expect(formatAmountHuman(ONE_USD * 1000n, USD_DECIMALS, false, 0)).toBe("1K");
    expect(formatAmountHuman(ONE_USD * 1500000n, USD_DECIMALS, false, 0)).toBe("2M");
  });
});

describe("formatBalanceAmount", () => {
  it("should display balance amount", () =>
    // prettier-ignore
    {
    expect(formatBalanceAmount(ONE_USD * 1000n, USD_DECIMALS)).toBe(         "1,000.0000");
    expect(formatBalanceAmount(0n, USD_DECIMALS)).toBe(                          "-");
    expect(formatBalanceAmount(0n, USD_DECIMALS, undefined, true)).toBe(         "0.0000");
    expect(formatBalanceAmount(ONE_USD * 1n, USD_DECIMALS)).toBe(                "1.0000");
    expect(formatBalanceAmount(ONE_USD / 10n, USD_DECIMALS)).toBe(               "0.10000");
    expect(formatBalanceAmount(ONE_USD / 100n, USD_DECIMALS)).toBe(              "0.010000");
    expect(formatBalanceAmount(ONE_USD / 1_000n, USD_DECIMALS)).toBe(            "0.0010000");
    expect(formatBalanceAmount(ONE_USD / 10_000n, USD_DECIMALS)).toBe(           "0.00010000");
    expect(formatBalanceAmount(ONE_USD / 100_000n, USD_DECIMALS)).toBe(          "0.00001000");
    expect(formatBalanceAmount(ONE_USD / 1_000_000n, USD_DECIMALS)).toBe(        "0.00000100");
    expect(formatBalanceAmount(ONE_USD / 10_000_000n, USD_DECIMALS)).toBe(       "0.00000010");
    expect(formatBalanceAmount(ONE_USD / 100_000_000n, USD_DECIMALS)).toBe(      "0.00000001");
    expect(formatBalanceAmount(ONE_USD / 1_000_000_000n, USD_DECIMALS)).toBe(    "1.00e-9");
    expect(formatBalanceAmount(ONE_USD / 1_000_000_000_000n, USD_DECIMALS)).toBe("1.00e-12");
    expect(formatBalanceAmount(ONE_USD * -1n, USD_DECIMALS)).toBe(              "-1.0000");

  });

  it("should display balance amount with symbol", () => {
    expect(formatBalanceAmount(ONE_USD, USD_DECIMALS, "USDC")).toBe("1.0000 USDC");
    expect(formatBalanceAmount(0n, USD_DECIMALS, "USDC", true)).toBe("0.0000 USDC");
    expect(formatBalanceAmount(0n, USD_DECIMALS, "USDC", false)).toBe("-");
  });

  it("should display balance amount with usd", () => {
    expect(formatBalanceAmountWithUsd(ONE_USD, ONE_USD, USD_DECIMALS)).toBe("1.0000 ($1.00)");
    expect(formatBalanceAmountWithUsd(ONE_USD, ONE_USD, USD_DECIMALS, "USDC")).toBe("1.0000 USDC ($1.00)");
    expect(formatBalanceAmountWithUsd(0n, 0n, USD_DECIMALS, "USDC")).toBe("-");
    expect(formatBalanceAmountWithUsd(0n, 0n, USD_DECIMALS, "USDC", true)).toBe("0.0000 USDC ($0.00)");
  });
});

describe("formatFactor", () => {
  it("should format factor", () => {
    expect(formatFactor(0n)).toBe("0");
    expect(formatFactor(1n)).toBe("0.000000000000000000000000000001");
    expect(formatFactor(1000n)).toBe("0.000000000000000000000000001");
    expect(formatFactor(1000000n)).toBe("0.000000000000000000000001");
    expect(formatFactor(1000000000n)).toBe("0.000000000000000000001");
    expect(formatFactor(1000000000000n)).toBe("0.000000000000000001");
    expect(formatFactor(1000000000000000n)).toBe("0.000000000000001");
    expect(formatFactor(1000000000000000000n)).toBe("0.000000000001");
    expect(formatFactor(1000000000000000000000n)).toBe("0.000000001");
    expect(formatFactor(1000000000000000000000000n)).toBe("0.000001");
    expect(formatFactor(1000000000000000000000000000n)).toBe("0.001");
    expect(formatFactor(1000000000000000000000000000000n)).toBe("1");
  });
});
