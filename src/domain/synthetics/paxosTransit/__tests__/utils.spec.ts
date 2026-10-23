import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";
import { HttpError } from "sdk/utils/http/http";
import type { TransitFeeTierResponse } from "sdk/utils/paxos/types";

import {
  getIsTransitQuoteNeeded,
  getIsZeroFeeRejection,
  getShouldUseTransit,
  getTransitFeeTier,
  getTransitMinOrderSize,
} from "../utils";

const usd = (value: number) => expandDecimals(value, USD_DECIMALS);
const ZERO_FEE: TransitFeeTierResponse = {
  feeTier: "zeroFee",
  zeroFeeCapacity: 1_000_000n,
  isZeroFeeAvailable: true,
  zeroFeeExpectedReopenAt: undefined,
};
const ZERO_FEE_PAUSED: TransitFeeTierResponse = {
  ...ZERO_FEE,
  zeroFeeCapacity: 0n,
  isZeroFeeAvailable: false,
  zeroFeeExpectedReopenAt: Date.UTC(2026, 9, 26, 13) / 1000,
};
const STANDARD_FEE: TransitFeeTierResponse = {
  feeTier: "standardFee",
  zeroFeeCapacity: 0n,
  isZeroFeeAvailable: false,
  zeroFeeExpectedReopenAt: undefined,
};

describe("getTransitFeeTier", () => {
  const params = {
    feeTierData: ZERO_FEE,
    isWhitelistIgnored: false,
    isUsdcToUsdg: true,
    amount: 500_000n,
    zeroFeeMinOrderSize: 100_000n,
    isStandardFeeForced: false,
  };

  it("uses zero fee for a whitelisted address with enough capacity", () => {
    expect(getTransitFeeTier(params)).toEqual({
      isWhitelisted: true,
      isZeroFeePaused: false,
      isZeroFeeCapacityShort: false,
      feeTier: "zeroFee",
    });
  });

  it("falls back to standard fee when USDC to USDG capacity is short", () => {
    expect(getTransitFeeTier({ ...params, amount: 2_000_000n })).toEqual({
      isWhitelisted: true,
      isZeroFeePaused: false,
      isZeroFeeCapacityShort: true,
      feeTier: "standardFee",
    });
  });

  it("falls back to standard fee below the zero fee minimum order size", () => {
    expect(getTransitFeeTier({ ...params, zeroFeeMinOrderSize: 600_000n })).toEqual({
      isWhitelisted: true,
      isZeroFeePaused: false,
      isZeroFeeCapacityShort: false,
      feeTier: "standardFee",
    });
  });

  it("uses zero fee while the zero fee minimum order size is unknown", () => {
    expect(getTransitFeeTier({ ...params, zeroFeeMinOrderSize: undefined }).feeTier).toBe("zeroFee");
  });

  it("keeps zero fee at exactly the capacity and the zero fee minimum order size", () => {
    expect(getTransitFeeTier({ ...params, amount: ZERO_FEE.zeroFeeCapacity }).feeTier).toBe("zeroFee");
    expect(getTransitFeeTier({ ...params, zeroFeeMinOrderSize: params.amount }).feeTier).toBe("zeroFee");
  });

  it("uses standard fee while zero fee is paused", () => {
    expect(getTransitFeeTier({ ...params, feeTierData: ZERO_FEE_PAUSED })).toEqual({
      isWhitelisted: true,
      isZeroFeePaused: true,
      isZeroFeeCapacityShort: false,
      feeTier: "standardFee",
    });
  });

  it.each([
    ["from USDG to USDC", { isUsdcToUsdg: false }],
    ["from USDG to USDC while paused", { isUsdcToUsdg: false, feeTierData: ZERO_FEE_PAUSED }],
  ])("never uses or pauses zero fee %s", (_name, overrides) => {
    expect(getTransitFeeTier({ ...params, ...overrides })).toEqual({
      isWhitelisted: true,
      isZeroFeePaused: false,
      isZeroFeeCapacityShort: false,
      feeTier: "standardFee",
    });
  });

  it("uses standard fee when forced", () => {
    expect(getTransitFeeTier({ ...params, isStandardFeeForced: true }).feeTier).toBe("standardFee");
  });

  it.each([
    ["ignored", { isWhitelistIgnored: true }],
    ["not whitelisted", { feeTierData: STANDARD_FEE }],
    ["not loaded", { feeTierData: undefined }],
  ])("uses standard fee without zero fee notices when the whitelist is %s", (_name, overrides) => {
    expect(getTransitFeeTier({ ...params, ...overrides })).toEqual({
      isWhitelisted: false,
      isZeroFeePaused: false,
      isZeroFeeCapacityShort: false,
      feeTier: "standardFee",
    });
  });
});

describe("getIsZeroFeeRejection", () => {
  it.each([
    [403, true],
    [409, true],
    [400, false],
    [502, false],
  ])("treats HTTP %i as a rejection: %s", (statusCode, expected) => {
    expect(getIsZeroFeeRejection(new HttpError(statusCode, "error"))).toBe(expected);
  });

  it("ignores errors without an HTTP status", () => {
    expect(getIsZeroFeeRejection(new Error("network"))).toBe(false);
  });
});

describe("getTransitMinOrderSize", () => {
  const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";
  const route = (offerAsset: string, wantAsset: string, minOrderSize: bigint, chainId = 42161) => ({
    sourceChainId: chainId,
    destinationChainId: chainId,
    destinationChainEID: 30110,
    offerAsset: offerAsset.toLowerCase(),
    wantAsset: wantAsset.toLowerCase(),
    minOrderSize,
    tokenMetadataMap: {},
  });
  const routes = [route(USDC, USDG, 178_670_000n), route(USDG, USDC, 171_070_000n), route(USDC, USDG, 1n, 1)];

  it("returns the minimum of the same-chain route in the conversion direction", () => {
    expect(getTransitMinOrderSize(routes, { chainId: 42161, offerAsset: USDC, wantAsset: USDG })).toBe(178_670_000n);
    expect(getTransitMinOrderSize(routes, { chainId: 42161, offerAsset: USDG, wantAsset: USDC })).toBe(171_070_000n);
  });

  it("returns undefined without routes, tokens or a matching route", () => {
    expect(getTransitMinOrderSize(undefined, { chainId: 42161, offerAsset: USDC, wantAsset: USDG })).toBeUndefined();
    expect(getTransitMinOrderSize(routes, { chainId: 42161, offerAsset: undefined, wantAsset: USDG })).toBeUndefined();
    expect(getTransitMinOrderSize(routes, { chainId: 43114, offerAsset: USDC, wantAsset: USDG })).toBeUndefined();
  });
});

describe("getShouldUseTransit", () => {
  const LARGE = {
    amountUsd: usd(300_000),
    isWhitelisted: false,
    transitFeesUsd: usd(10),
    collateralSwapTotalFeesDeltaUsd: -usd(50),
    thresholdUsd: usd(250_000),
  };

  it("uses Transit for a large conversion where it is cheaper", () => {
    expect(getShouldUseTransit(LARGE)).toBe(true);
  });

  it("counts an amount at exactly the threshold as large", () => {
    expect(getShouldUseTransit({ ...LARGE, amountUsd: LARGE.thresholdUsd })).toBe(true);
  });

  it("keeps our pool below the size threshold or when it is cheaper", () => {
    expect(getShouldUseTransit({ ...LARGE, amountUsd: usd(2) })).toBe(false);
    expect(getShouldUseTransit({ ...LARGE, collateralSwapTotalFeesDeltaUsd: -usd(5) })).toBe(false);
  });

  it("keeps our pool without a Transit quote", () => {
    expect(getShouldUseTransit({ ...LARGE, transitFeesUsd: undefined })).toBe(false);
  });

  it("uses Transit when our pool can't fill the swap, at any size", () => {
    expect(getShouldUseTransit({ ...LARGE, collateralSwapTotalFeesDeltaUsd: undefined })).toBe(true);
    expect(getShouldUseTransit({ ...LARGE, amountUsd: usd(1), collateralSwapTotalFeesDeltaUsd: undefined })).toBe(true);
  });

  it("uses the cheaper route for whitelisted addresses at any size", () => {
    const whitelisted = { ...LARGE, amountUsd: usd(1), isWhitelisted: true };

    expect(getShouldUseTransit({ ...whitelisted, transitFeesUsd: 0n })).toBe(true);
    expect(getShouldUseTransit({ ...whitelisted, collateralSwapTotalFeesDeltaUsd: -usd(5) })).toBe(false);
    expect(getShouldUseTransit({ ...whitelisted, transitFeesUsd: undefined })).toBe(false);
  });
});

describe("getIsTransitQuoteNeeded", () => {
  const params = {
    isTransitRequired: false,
    isWhitelisted: false,
    collateralSwapTotalFeesDeltaUsd: -usd(1),
    amountUsd: usd(100),
    thresholdUsd: usd(250),
  };

  it("skips the quote for a small amount our pool can fill", () => {
    expect(getIsTransitQuoteNeeded(params)).toBe(false);
  });

  it("needs a quote at exactly the threshold", () => {
    expect(getIsTransitQuoteNeeded({ ...params, amountUsd: params.thresholdUsd })).toBe(true);
  });

  it("needs a quote when required, whitelisted, above the threshold or when our pool can't fill it", () => {
    expect(getIsTransitQuoteNeeded({ ...params, isTransitRequired: true })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, isWhitelisted: true })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, amountUsd: usd(300) })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, collateralSwapTotalFeesDeltaUsd: undefined })).toBe(true);
  });
});
