import { USD_DECIMALS } from "config/factors";
import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatAmountHuman,
  formatBalanceAmount,
  formatBalanceAmountWithUsd,
  formatFactor,
  formatUsdPrice,
  roundBigNumberWithDecimals,
  toBigNumberWithDecimals,
  formatPercentage,
  PERCENT_PRECISION_DECIMALS,
  PRECISION_DECIMALS,
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

describe("toBigNumberWithDecimals", () => {
  it("should convert string to big number with decimals", () => {
    expect(toBigNumberWithDecimals("0", PRECISION_DECIMALS)).toBe(0n);
    expect(toBigNumberWithDecimals("1", PRECISION_DECIMALS)).toBe(1000000000000000000000000000000n);
    expect(toBigNumberWithDecimals("123.456", PRECISION_DECIMALS)).toBe(123456000000000000000000000000000n);
    expect(toBigNumberWithDecimals("123.456789", PRECISION_DECIMALS)).toBe(123456789000000000000000000000000n);
    expect(toBigNumberWithDecimals("-1.5", PRECISION_DECIMALS)).toBe(-1500000000000000000000000000000n);
    expect(toBigNumberWithDecimals("0.000001", PRECISION_DECIMALS)).toBe(1000000000000000000000000n);
  });

  it("should handle strings with more decimals than token decimals parameter", () => {
    expect(toBigNumberWithDecimals("0.123456789012345678901234567890", 5)).toBe(12345n);
  });

  it("should handle cases with different token decimals ", () => {
    expect(toBigNumberWithDecimals("0.1234567890123456789012345678901", 18)).toBe(
      toBigNumberWithDecimals("0.123456789012345678901234567890", 18)
    );
    expect(toBigNumberWithDecimals("0.1234567890123456789012345678901", 5)).toBe(
      toBigNumberWithDecimals("0.123456789012345678901234567890", 5)
    );
    expect(toBigNumberWithDecimals("0.1234567890123456789012345678901", 1)).toBe(
      toBigNumberWithDecimals("0.123456789012345678901234567890", 1)
    );
  });

  it("should be compatible with formatAmount", () => {
    expect(formatAmount(toBigNumberWithDecimals("123.456", PRECISION_DECIMALS), USD_DECIMALS, 3)).toBe("123.456");
    expect(formatAmount(toBigNumberWithDecimals("0.789", PRECISION_DECIMALS), USD_DECIMALS, 2)).toBe("0.79");
  });
});

describe("roundBigNumberWithDecimals", () => {
  it("should round small numbers correctly", () => {
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000001", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(0n);
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.5", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("1", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.499", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(0n);
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1", PRECISION_DECIMALS));
  });

  it("should round numbers at specific decimal places", () => {
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1.49", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1.5", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1.44", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 1,
      })
    ).toBe(toBigNumberWithDecimals("1.4", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1.499", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 2,
      })
    ).toBe(toBigNumberWithDecimals("1.50", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("1.495", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 2,
      })
    ).toBe(toBigNumberWithDecimals("1.50", PRECISION_DECIMALS));
  });

  it("should round large numbers correctly", () => {
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("499.999999", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 5,
      })
    ).toBe(toBigNumberWithDecimals("500.00000", PRECISION_DECIMALS));
  });

  it("should handle complex rounding cases", () => {
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000000000000000000000000001", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 25,
      })
    ).toBe(0n);
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.4999999999999999999999999999", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 25,
      })
    ).toBe(toBigNumberWithDecimals("0.5000000000000000000000000000", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("123.456789", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 4,
      })
    ).toBe(toBigNumberWithDecimals("123.4568", PRECISION_DECIMALS));
  });

  it("should round numbers with different token decimals correctly", () => {
    const differentTokenDecimals = [18, 5, 1, 22];
    for (const tokenDecimals of differentTokenDecimals) {
      expect(
        roundBigNumberWithDecimals(toBigNumberWithDecimals("123.456789", tokenDecimals), {
          tokenDecimals,
          displayDecimals: 4,
        })
      ).toBe(toBigNumberWithDecimals("123.4568", tokenDecimals));
    }
  });

  it("should handle edge cases", () => {
    expect(roundBigNumberWithDecimals(0n, { tokenDecimals: PRECISION_DECIMALS, displayDecimals: 10 })).toBe(0n);
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("-1.5", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("-2", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("-1.4", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 0,
      })
    ).toBe(toBigNumberWithDecimals("-1", PRECISION_DECIMALS));
    expect(
      roundBigNumberWithDecimals(toBigNumberWithDecimals("0.0000001", PRECISION_DECIMALS), {
        tokenDecimals: PRECISION_DECIMALS,
        displayDecimals: 5,
      })
    ).toBe(0n);
  });
});

describe("formatPercentage", () => {
  it("should format a basic percentage", () => {
    expect(formatPercentage(100n, { displayDecimals: 4 })).toBe("1.0000%");
    expect(formatPercentage(2500n)).toBe("25.0000%");
    expect(formatPercentage(123456n)).toBe("1234.5600%");
  });

  it("should handle undefined input with fallbackToZero", () => {
    expect(formatPercentage(undefined, { fallbackToZero: true })).toBe("0.0000%");
  });

  it("should display signed percentage", () => {
    expect(formatPercentage(100n, { signed: true })).toBe("+1.0000%");
    expect(formatPercentage(-100n, { signed: true })).toBe("-1.0000%");
  });

  it("should format with different displayDecimals", () => {
    expect(formatPercentage(100n, { displayDecimals: 2 })).toBe("1.00%");
    expect(formatPercentage(123456n, { displayDecimals: 1 })).toBe("1234.6%");
  });

  it("should handle basis points (bps) formatting", () => {
    expect(
      formatPercentage(toBigNumberWithDecimals("1", PERCENT_PRECISION_DECIMALS), { bps: false, displayDecimals: 4 })
    ).toBe("1.0000%");
    expect(
      formatPercentage(toBigNumberWithDecimals("0.999", PERCENT_PRECISION_DECIMALS), { bps: false, displayDecimals: 5 })
    ).toBe("0.99900%");
  });
});
