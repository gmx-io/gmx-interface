import { describe, expect, it } from "vitest";

import {
  MarketOrderExecutionAction,
  MarketOrderExecutionSample,
  buildMarketOrderExecutionRows,
  buildMarketOrderExecutionSampleRows,
  getSignedPriceDeltaBps,
} from "./marketOrderExecutions";
import { OrderType } from "./types";

function action(overrides: Partial<MarketOrderExecutionAction> = {}): MarketOrderExecutionAction {
  return {
    id: "execution",
    orderKey: "0xorder",
    orderType: OrderType.MarketIncrease,
    timestamp: 104,
    transactionHash: "0xexecution",
    account: "0xAccount",
    marketAddress: "0xMarket",
    isLong: true,
    shouldUnwrapNativeToken: false,
    initialCollateralTokenAddress: "0xTokenIn",
    initialCollateralDeltaAmount: "1000000",
    swapPath: [],
    sizeDeltaUsd: "1000000000000000000000000000000000",
    executionPrice: "100",
    minOutputAmount: null,
    executionAmountOut: null,
    orderCreatedTimestamp: 100,
    orderCreatedTxnHash: "0xcreation",
    orderCreatedIndexTokenPriceMin: "98",
    orderCreatedIndexTokenPriceMax: "102",
    orderCreatedIndexTokenPriceTimestamp: 95,
    orderCreatedIndexTokenPriceType: "v2",
    indexTokenPriceMin: "99",
    indexTokenPriceMax: "101",
    indexTokenPriceTimestamp: 103,
    indexTokenPriceType: "v2",
    ...overrides,
  };
}

function sample(overrides: Partial<MarketOrderExecutionSample> = {}): MarketOrderExecutionSample {
  return {
    id: "execution",
    orderKey: "0xorder",
    orderType: OrderType.MarketIncrease,
    account: "0xAccount",
    marketAddress: "0xMarket",
    isLong: true,
    sizeDeltaUsd: "1000",
    orderCreatedTimestamp: 100,
    orderCreatedTxnHash: "0xcreation",
    executedTimestamp: 104,
    executedTxnHash: "0xexecution",
    delaySeconds: 4,
    referenceAgeSeconds: 5,
    creationReferencePrice: "102",
    executionReferencePrice: "101",
    executionPrice: "100",
    signedFillDeltaBps: 196.0784,
    signedOracleMoveBps: 98.0392,
    signedExecutionImpactBps: 99.0099,
    ...overrides,
  };
}

describe("getSignedPriceDeltaBps", () => {
  it.each([
    [true, "102", "100", 196.0784],
    [false, "98", "100", 204.0816],
    [true, "100", "101", -100],
    [false, "100", "99", -100],
  ])("normalizes a signed fill delta for isBuy=%s", (isBuy, referencePrice, comparisonPrice, expected) => {
    expect(
      getSignedPriceDeltaBps({
        isBuy,
        referencePrice,
        comparisonPrice,
      })
    ).toBe(expected);
  });

  it("returns null for unusable prices", () => {
    expect(
      getSignedPriceDeltaBps({
        isBuy: true,
        referencePrice: "0",
        comparisonPrice: "100",
      })
    ).toBeNull();
  });
});

describe("buildMarketOrderExecutionRows", () => {
  it("uses creation and execution oracle references for a long increase", () => {
    const [row] = buildMarketOrderExecutionRows([action()]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.submittedTimestamp).toBe(100);
    expect(row.submittedTransactionHash).toBe("0xcreation");
    expect(row.delaySeconds).toBe(4);
    expect(row.creationReferencePrice).toBe("102");
    expect(row.executionReferencePrice).toBe("101");
    expect(row.referenceAgeSeconds).toBe(5);
    expect(row.executionReferenceAgeSeconds).toBe(1);
    expect(row.fillDeltaBps).toBeCloseTo(196.0784);
    expect(row.oracleMoveBps).toBeCloseTo(98.0392);
    expect(row.executionImpactBps).toBeCloseTo(99.0099);
  });

  it.each([
    [OrderType.MarketIncrease, true, "102"],
    [OrderType.MarketIncrease, false, "98"],
    [OrderType.MarketDecrease, true, "98"],
    [OrderType.MarketDecrease, false, "102"],
  ])("selects the correct creation reference for orderType=%s and isLong=%s", (orderType, isLong, expected) => {
    const [row] = buildMarketOrderExecutionRows([action({ orderType, isLong })]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.creationReferencePrice).toBe(expected);
  });

  it("excludes stale creation references from price metrics", () => {
    const [row] = buildMarketOrderExecutionRows([
      action({
        orderCreatedIndexTokenPriceTimestamp: 39,
      }),
    ]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.creationReferencePrice).toBe("102");
    expect(row.referenceAgeSeconds).toBe(61);
    expect(row.fillDeltaBps).toBeNull();
    expect(row.oracleMoveBps).toBeNull();
    expect(row.executionImpactBps).toBeNull();
  });

  it("does not fall back to acceptable price when the V2 creation reference is unavailable", () => {
    const [row] = buildMarketOrderExecutionRows([
      action({
        orderCreatedIndexTokenPriceType: "onchainFeed",
      }),
    ]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.creationReferencePrice).toBeNull();
    expect(row.fillDeltaBps).toBeNull();
  });

  it("keeps swap timing without treating minimum output as a price reference", () => {
    const [row] = buildMarketOrderExecutionRows([
      action({
        orderType: OrderType.MarketSwap,
        isLong: null,
        marketAddress: null,
        executionPrice: null,
        minOutputAmount: "1000",
        executionAmountOut: "1020",
        swapPath: ["0xMarket"],
      }),
    ]);

    expect(row.kind).toBe("swap");
    if (row.kind !== "swap") {
      throw new Error("Expected a swap row");
    }

    expect(row.minOutputAmount).toBe("1000");
    expect(row.executionAmountOut).toBe("1020");
    expect(row.delaySeconds).toBe(4);
    expect(row.fillDeltaBps).toBeNull();
  });
});

describe("buildMarketOrderExecutionSampleRows", () => {
  it("maps the resolver's freshness-qualified sample without recalculating metrics", () => {
    const [row] = buildMarketOrderExecutionSampleRows([sample()]);

    expect(row).toMatchObject({
      kind: "perp",
      orderKey: "0xorder",
      submittedTimestamp: 100,
      submittedTransactionHash: "0xcreation",
      executedTimestamp: 104,
      executedTransactionHash: "0xexecution",
      creationReferencePrice: "102",
      executionReferencePrice: "101",
      executionPrice: "100",
      fillDeltaBps: 196.0784,
      oracleMoveBps: 98.0392,
      executionImpactBps: 99.0099,
    });
  });

  it("ignores swap rows because the resolver sample is perp-only", () => {
    expect(buildMarketOrderExecutionSampleRows([sample({ orderType: OrderType.MarketSwap })])).toEqual([]);
  });
});
