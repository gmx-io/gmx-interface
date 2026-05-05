import { describe, expect, it } from "vitest";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { mockExternalSwapQuote } from "domain/synthetics/testUtils/mocks";
import { expandDecimals } from "lib/numbers";
import { applySlippageToMinOut } from "sdk/utils/trade";

import {
  getExternalSwapRequestKey,
  inflateAmountForSlippage,
  isInternalSwapBetterByFeeRate,
  overrideQuoteWithOraclePrices,
} from "../utils";

describe("inflateAmountForSlippage", () => {
  it("returns amount unchanged when slippage is zero", () => {
    expect(inflateAmountForSlippage(1000n, 0n)).toBe(1000n);
  });

  it("returns amount unchanged when slippage clips at BASIS_POINTS_DIVISOR (overflow guard)", () => {
    expect(inflateAmountForSlippage(1000n, BASIS_POINTS_DIVISOR_BIGINT)).toBe(1000n);
    expect(inflateAmountForSlippage(1000n, BASIS_POINTS_DIVISOR_BIGINT + 1n)).toBe(1000n);
  });

  it("returns amount unchanged for negative slippage", () => {
    expect(inflateAmountForSlippage(1000n, -1n)).toBe(1000n);
  });

  it("preserves the original amount through floor-rounding slippage reduction", () => {
    // applySlippageToMinOut floors. Without ceiling-divide in inflateAmountForSlippage we'd
    // lose 1 wei on tiny amounts. Sweep small amounts and a few slippage values to catch it.
    const amounts = [1n, 2n, 5n, 7n, 13n, 100n, 999n, 1000n, 12345n];
    const slippageBpsValues = [10, 50, 100, 250, 999];

    for (const amount of amounts) {
      for (const slippageBps of slippageBpsValues) {
        const inflated = inflateAmountForSlippage(amount, BigInt(slippageBps));
        const reduced = applySlippageToMinOut(slippageBps, inflated);
        expect(reduced).toBeGreaterThanOrEqual(amount);
      }
    }
  });

  it("inflates by the expected factor for round numbers", () => {
    // 1% slippage on 10000 → at least 10101 to survive 1% reduction (10101 * 9900 / 10000 = 9999, but ceil makes it 10102)
    const inflated = inflateAmountForSlippage(10000n, 100n);
    expect(inflated).toBeGreaterThanOrEqual(10101n);
    expect(applySlippageToMinOut(100, inflated)).toBeGreaterThanOrEqual(10000n);
  });

  it("handles very large amounts without overflow", () => {
    const huge = 10n ** 30n;
    const inflated = inflateAmountForSlippage(huge, 100n);
    expect(inflated).toBeGreaterThan(huge);
    expect(applySlippageToMinOut(100, inflated)).toBeGreaterThanOrEqual(huge);
  });
});

describe("isInternalSwapBetterByFeeRate", () => {
  const baseParams = {
    internalFeesDeltaUsd: -expandDecimals(1, 30), // -$1
    internalUsdIn: expandDecimals(1000, 30), // $1000 → 0.1% fee rate
    internalAmountOut: 1n,
    internalSwapType: "internalSwap" as const,
    externalUsdIn: expandDecimals(1000, 30),
    externalFeesUsd: expandDecimals(2, 30), // $2 absolute fees → 0.2% fee rate
  };

  it("returns false when internal strategy is noSwap", () => {
    expect(isInternalSwapBetterByFeeRate({ ...baseParams, internalSwapType: "noSwap" })).toBe(false);
  });

  it("returns false when internal amountOut is zero", () => {
    expect(isInternalSwapBetterByFeeRate({ ...baseParams, internalAmountOut: 0n })).toBe(false);
  });

  it("returns false when internal fees are undefined", () => {
    expect(isInternalSwapBetterByFeeRate({ ...baseParams, internalFeesDeltaUsd: undefined })).toBe(false);
  });

  it("returns false when internal usdIn is zero", () => {
    expect(isInternalSwapBetterByFeeRate({ ...baseParams, internalUsdIn: 0n })).toBe(false);
  });

  it("returns false when external usdIn is zero", () => {
    expect(isInternalSwapBetterByFeeRate({ ...baseParams, externalUsdIn: 0n })).toBe(false);
  });

  it("returns true when internal fee rate is lower than external", () => {
    // internal: -$1 / $1000 = -0.1%; external: -$2 / $1000 = -0.2% → internal cheaper
    expect(isInternalSwapBetterByFeeRate(baseParams)).toBe(true);
  });

  it("returns false when internal fee rate is worse than external", () => {
    // internal: -$3 / $1000 = -0.3%; external: -$2 / $1000 = -0.2% → external cheaper
    expect(
      isInternalSwapBetterByFeeRate({
        ...baseParams,
        internalFeesDeltaUsd: -expandDecimals(3, 30),
      })
    ).toBe(false);
  });

  it("returns false when fee rates are equal (no strict improvement)", () => {
    // internal: -$1 / $1000 = -0.1%; external: -$1 / $1000 = -0.1%
    expect(
      isInternalSwapBetterByFeeRate({
        ...baseParams,
        externalFeesUsd: expandDecimals(1, 30),
      })
    ).toBe(false);
  });

  it("compares by rate, not absolute, when usdIn differs", () => {
    // internal: -$1 / $1000 = -0.1%; external: -$3 / $10000 = -0.03% → external cheaper
    expect(
      isInternalSwapBetterByFeeRate({
        ...baseParams,
        externalUsdIn: expandDecimals(10000, 30),
        externalFeesUsd: expandDecimals(3, 30),
      })
    ).toBe(false);
  });

  it("treats positive (rebate) internal fees as a win over any external cost", () => {
    expect(
      isInternalSwapBetterByFeeRate({
        ...baseParams,
        internalFeesDeltaUsd: expandDecimals(1, 30), // positive PI rebate
      })
    ).toBe(true);
  });
});

describe("overrideQuoteWithOraclePrices", () => {
  it("replaces price/usd fields with oracle values, keeps txnData and identity fields", () => {
    const quote = mockExternalSwapQuote({
      usdIn: 100n,
      usdOut: 90n,
      priceIn: 1n,
      priceOut: 1n,
      feesUsd: 10n,
    });
    const oracle = { usdIn: 200n, usdOut: 195n, feesUsd: 5n, priceIn: 2n, priceOut: 2n };

    const result = overrideQuoteWithOraclePrices(quote, oracle);

    expect(result.usdIn).toBe(oracle.usdIn);
    expect(result.usdOut).toBe(oracle.usdOut);
    expect(result.feesUsd).toBe(oracle.feesUsd);
    expect(result.priceIn).toBe(oracle.priceIn);
    expect(result.priceOut).toBe(oracle.priceOut);
    expect(result.txnData).toEqual(quote.txnData);
    expect(result.amountIn).toBe(quote.amountIn);
    expect(result.amountOut).toBe(quote.amountOut);
    expect(result.inTokenAddress).toBe(quote.inTokenAddress);
    expect(result.outTokenAddress).toBe(quote.outTokenAddress);
  });

  it("does not mutate the input quote", () => {
    const quote = mockExternalSwapQuote({ usdIn: 100n });
    overrideQuoteWithOraclePrices(quote, { usdIn: 999n, usdOut: 0n, feesUsd: 0n, priceIn: 0n, priceOut: 0n });
    expect(quote.usdIn).toBe(100n);
  });
});

describe("getExternalSwapRequestKey", () => {
  const base = {
    fromTokenAddress: "0xfrom",
    toTokenAddress: "0xto",
    strategy: "byFromValue" as const,
    amountIn: 1000n,
    desiredAmountOut: undefined,
    slippage: 50,
  };

  it("returns undefined when fromTokenAddress is missing", () => {
    expect(getExternalSwapRequestKey({ ...base, fromTokenAddress: undefined })).toBeUndefined();
  });

  it("returns undefined when toTokenAddress is missing", () => {
    expect(getExternalSwapRequestKey({ ...base, toTokenAddress: undefined })).toBeUndefined();
  });

  it("returns undefined when strategy is missing", () => {
    expect(getExternalSwapRequestKey({ ...base, strategy: undefined })).toBeUndefined();
  });

  it("returns undefined when slippage is missing", () => {
    expect(getExternalSwapRequestKey({ ...base, slippage: undefined })).toBeUndefined();
  });

  it("returns undefined when byFromValue amount is missing or zero", () => {
    expect(getExternalSwapRequestKey({ ...base, amountIn: undefined })).toBeUndefined();
    expect(getExternalSwapRequestKey({ ...base, amountIn: 0n })).toBeUndefined();
    expect(getExternalSwapRequestKey({ ...base, amountIn: -1n })).toBeUndefined();
  });

  it("returns undefined when byToValue amount is missing or zero", () => {
    const byTo = { ...base, strategy: "byToValue" as const, amountIn: undefined, desiredAmountOut: 0n };
    expect(getExternalSwapRequestKey(byTo)).toBeUndefined();
    expect(getExternalSwapRequestKey({ ...byTo, desiredAmountOut: undefined })).toBeUndefined();
  });

  it("byFromValue uses amountIn, byToValue uses desiredAmountOut", () => {
    const fromKey = getExternalSwapRequestKey({ ...base, amountIn: 1000n, desiredAmountOut: 5000n });
    const toKey = getExternalSwapRequestKey({
      ...base,
      strategy: "byToValue",
      amountIn: 1000n,
      desiredAmountOut: 5000n,
    });
    // Two different keys for the same (amountIn, desiredAmountOut) but different strategy
    expect(fromKey).not.toBe(toKey);
    // Changing the unused amount must not change the key
    expect(getExternalSwapRequestKey({ ...base, amountIn: 1000n, desiredAmountOut: 9999n })).toBe(fromKey);
    expect(
      getExternalSwapRequestKey({
        ...base,
        strategy: "byToValue",
        amountIn: 9999n,
        desiredAmountOut: 5000n,
      })
    ).toBe(toKey);
  });

  it("produces distinct keys for distinct slippage values", () => {
    const a = getExternalSwapRequestKey({ ...base, slippage: 50 });
    const b = getExternalSwapRequestKey({ ...base, slippage: 100 });
    expect(a).not.toBe(b);
  });

  it("produces distinct keys for distinct token pairs", () => {
    const a = getExternalSwapRequestKey(base);
    const b = getExternalSwapRequestKey({ ...base, toTokenAddress: "0xother" });
    expect(a).not.toBe(b);
  });

  it("produces distinct keys for distinct strategies", () => {
    const fromKey = getExternalSwapRequestKey({ ...base, strategy: "byFromValue" });
    const leverageKey = getExternalSwapRequestKey({ ...base, strategy: "leverageBySize" });
    expect(fromKey).not.toBe(leverageKey);
  });
});
