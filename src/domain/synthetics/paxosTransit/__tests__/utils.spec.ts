import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";
import type { TransitFeeTierResponse } from "sdk/utils/paxos/types";

import { getIsTransitQuoteNeeded, getShouldUseTransit, getTransitFeeTier, getTransitMinOrderSize } from "../utils";

const usd = (value: number) => expandDecimals(value, USD_DECIMALS);
const ZERO_FEE: TransitFeeTierResponse = { feeTier: "zeroFee", zeroFeeCapacity: 1_000_000n };
const STANDARD_FEE: TransitFeeTierResponse = { feeTier: "standardFee", zeroFeeCapacity: 0n };

describe("getTransitFeeTier", () => {
  const params = {
    feeTierData: ZERO_FEE,
    isWhitelistIgnored: false,
    isUsdcOffered: true,
    amount: 500_000n,
    zeroFeeMinOrderSize: 100_000n,
    isStandardFeeForced: false,
  };

  it("uses zero fee for a whitelisted address with enough capacity", () => {
    expect(getTransitFeeTier(params)).toEqual({
      isWhitelisted: true,
      isZeroFeeCapacityShort: false,
      isBelowZeroFeeMinimum: false,
      feeTier: "zeroFee",
    });
  });

  it("falls back to standard fee when USDC to USDG capacity is short", () => {
    expect(getTransitFeeTier({ ...params, amount: 2_000_000n })).toEqual({
      isWhitelisted: true,
      isZeroFeeCapacityShort: true,
      isBelowZeroFeeMinimum: false,
      feeTier: "standardFee",
    });
  });

  it("falls back to standard fee below the zero fee minimum order size", () => {
    expect(getTransitFeeTier({ ...params, zeroFeeMinOrderSize: 600_000n })).toEqual({
      isWhitelisted: true,
      isZeroFeeCapacityShort: false,
      isBelowZeroFeeMinimum: true,
      feeTier: "standardFee",
    });
  });

  it("uses zero fee while the zero fee minimum order size is unknown", () => {
    expect(getTransitFeeTier({ ...params, zeroFeeMinOrderSize: undefined }).feeTier).toBe("zeroFee");
  });

  it("ignores capacity when USDG is offered", () => {
    expect(getTransitFeeTier({ ...params, isUsdcOffered: false, amount: 2_000_000n }).feeTier).toBe("zeroFee");
  });

  it("uses standard fee when forced, ignored or not whitelisted", () => {
    expect(getTransitFeeTier({ ...params, isStandardFeeForced: true }).feeTier).toBe("standardFee");
    expect(getTransitFeeTier({ ...params, isWhitelistIgnored: true }).isWhitelisted).toBe(false);
    expect(getTransitFeeTier({ ...params, feeTierData: STANDARD_FEE }).feeTier).toBe("standardFee");
    expect(getTransitFeeTier({ ...params, feeTierData: undefined }).feeTier).toBe("standardFee");
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
    minAmountUsd: usd(250_000),
  };

  it("uses Transit for a large conversion where it is cheaper", () => {
    expect(getShouldUseTransit(LARGE)).toBe(true);
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

  it("always uses Transit for whitelisted addresses", () => {
    expect(getShouldUseTransit({ ...LARGE, amountUsd: usd(1), transitFeesUsd: undefined, isWhitelisted: true })).toBe(
      true
    );
  });
});

describe("getIsTransitQuoteNeeded", () => {
  const params = {
    isTransitRequired: false,
    isWhitelisted: false,
    collateralSwapTotalFeesDeltaUsd: -usd(1),
    amountUsd: usd(100),
    minAmountUsd: usd(250),
  };

  it("skips the quote for a small amount our pool can fill", () => {
    expect(getIsTransitQuoteNeeded(params)).toBe(false);
  });

  it("needs a quote when required, whitelisted, above the threshold or when our pool can't fill it", () => {
    expect(getIsTransitQuoteNeeded({ ...params, isTransitRequired: true })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, isWhitelisted: true })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, amountUsd: usd(300) })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, collateralSwapTotalFeesDeltaUsd: undefined })).toBe(true);
  });
});
