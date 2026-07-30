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
    creationReferencePrice: "102",
    creationReferenceTimestamp: 99,
    creationReferenceTxnHash: "0xoracle",
    creationReferenceProvider: "0xProvider",
    creationReferenceObservationId: "0xoracle:1",
    referenceAgeSeconds: 1,
    executionReferencePrice: "101",
    executionReferenceTimestamp: 103,
    executionReferenceTxnHash: "0xexecution-oracle",
    executionReferenceProvider: "0xExecutionProvider",
    executionReferenceObservationId: "0xexecution-oracle:2",
    executionReferenceAgeSeconds: 1,
    signedFillDeltaBps: 196.0784,
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
    referenceAgeSeconds: 1,
    creationReferencePrice: "102",
    creationReferenceTimestamp: 99,
    creationReferenceTxnHash: "0xoracle",
    creationReferenceProvider: "0xProvider",
    creationReferenceObservationId: "0xoracle:1",
    executionReferencePrice: "101",
    executionReferenceTimestamp: 103,
    executionReferenceTxnHash: "0xexecution-oracle",
    executionReferenceProvider: "0xExecutionProvider",
    executionReferenceObservationId: "0xexecution-oracle:2",
    executionReferenceAgeSeconds: 1,
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
  it("uses the canonical creation observation and authoritative fill delta", () => {
    const [row] = buildMarketOrderExecutionRows([action()]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.submittedTimestamp).toBe(100);
    expect(row.submittedTransactionHash).toBe("0xcreation");
    expect(row.delaySeconds).toBe(4);
    expect(row.creationReferencePrice).toBe("102");
    expect(row.creationReferenceTimestamp).toBe(99);
    expect(row.creationReferenceTxnHash).toBe("0xoracle");
    expect(row.creationReferenceProvider).toBe("0xProvider");
    expect(row.creationReferenceObservationId).toBe("0xoracle:1");
    expect(row.executionReferencePrice).toBe("101");
    expect(row.executionReferenceTimestamp).toBe(103);
    expect(row.executionReferenceTxnHash).toBe("0xexecution-oracle");
    expect(row.executionReferenceProvider).toBe("0xExecutionProvider");
    expect(row.executionReferenceObservationId).toBe("0xexecution-oracle:2");
    expect(row.referenceAgeSeconds).toBe(1);
    expect(row.executionReferenceAgeSeconds).toBe(1);
    expect(row.fillDeltaBps).toBeCloseTo(196.0784);
    expect(row.oracleMoveBps).toBeCloseTo(98.0392);
    expect(row.executionImpactBps).toBeCloseTo(99.0099);
  });

  it("uses only the canonical execution observation instead of raw event prices", () => {
    const actionWithRawEventPrices = {
      ...action(),
      indexTokenPriceMin: "1",
      indexTokenPriceMax: "999",
      indexTokenPriceTimestamp: 104,
      indexTokenPriceType: "v2",
    };
    const [row] = buildMarketOrderExecutionRows([actionWithRawEventPrices]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.executionReferencePrice).toBe("101");
    expect(row.executionReferenceAgeSeconds).toBe(1);
    expect(row.oracleMoveBps).toBeCloseTo(98.0392);
  });

  it("rejects an unavailable or stale canonical execution observation without falling back to raw event prices", () => {
    const actionWithoutCanonicalExecutionReference = {
      ...action({
        executionReferencePrice: null,
        executionReferenceAgeSeconds: null,
      }),
      indexTokenPriceMin: "99",
      indexTokenPriceMax: "101",
      indexTokenPriceTimestamp: 104,
      indexTokenPriceType: "v2",
    };
    const [missingRow, staleRow] = buildMarketOrderExecutionRows([
      actionWithoutCanonicalExecutionReference,
      action({
        executionReferenceAgeSeconds: 2,
      }),
    ]);

    for (const row of [missingRow, staleRow]) {
      expect(row.kind).toBe("perp");
      if (row.kind !== "perp") {
        throw new Error("Expected a perp row");
      }

      expect(row.executionReferencePrice).toBeNull();
      expect(row.executionReferenceTimestamp).toBeNull();
      expect(row.executionReferenceTxnHash).toBeNull();
      expect(row.executionReferenceProvider).toBeNull();
      expect(row.executionReferenceObservationId).toBeNull();
      expect(row.oracleMoveBps).toBeNull();
      expect(row.executionImpactBps).toBeNull();
    }
  });

  it.each([
    [OrderType.MarketIncrease, true],
    [OrderType.MarketIncrease, false],
    [OrderType.MarketDecrease, true],
    [OrderType.MarketDecrease, false],
  ])("preserves the canonical directional creation price for orderType=%s and isLong=%s", (orderType, isLong) => {
    const [row] = buildMarketOrderExecutionRows([
      action({ orderType, isLong, creationReferencePrice: "123", signedFillDeltaBps: 7 }),
    ]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.creationReferencePrice).toBe("123");
    expect(row.fillDeltaBps).toBe(7);
  });

  it.each([
    [0, true],
    [1, true],
    [2, true],
    [86_400, true],
    [-1, false],
  ])("accepts preceding canonical observations with age %s: %s", (referenceAgeSeconds, isQualified) => {
    const [row] = buildMarketOrderExecutionRows([
      action({
        referenceAgeSeconds,
      }),
    ]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.creationReferencePrice).toBe(isQualified ? "102" : null);
    expect(row.referenceAgeSeconds).toBe(referenceAgeSeconds);
    expect(row.fillDeltaBps).toBe(isQualified ? 196.0784 : null);
    expect(row.creationReferenceTxnHash).toBe(isQualified ? "0xoracle" : null);
  });

  it("does not infer a creation price when the canonical observation is unavailable", () => {
    const [row] = buildMarketOrderExecutionRows([
      action({
        creationReferencePrice: null,
        referenceAgeSeconds: null,
      }),
    ]);

    expect(row.kind).toBe("perp");
    if (row.kind !== "perp") {
      throw new Error("Expected a perp row");
    }

    expect(row.creationReferencePrice).toBeNull();
    expect(row.fillDeltaBps).toBeNull();
  });

  it("rejects a creation reference without complete oracle provenance", () => {
    const [row] = buildMarketOrderExecutionRows([
      action({
        creationReferenceObservationId: null,
        referenceAgeSeconds: 3_600,
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
  it("maps the resolver's latest-preceding sample without recalculating metrics", () => {
    const [row] = buildMarketOrderExecutionSampleRows([sample({ referenceAgeSeconds: 3_600 })]);

    expect(row).toMatchObject({
      kind: "perp",
      orderKey: "0xorder",
      submittedTimestamp: 100,
      submittedTransactionHash: "0xcreation",
      executedTimestamp: 104,
      executedTransactionHash: "0xexecution",
      creationReferencePrice: "102",
      creationReferenceTimestamp: 99,
      creationReferenceTxnHash: "0xoracle",
      creationReferenceProvider: "0xProvider",
      creationReferenceObservationId: "0xoracle:1",
      executionReferencePrice: "101",
      executionReferenceTimestamp: 103,
      executionReferenceTxnHash: "0xexecution-oracle",
      executionReferenceProvider: "0xExecutionProvider",
      executionReferenceObservationId: "0xexecution-oracle:2",
      executionReferenceAgeSeconds: 1,
      executionPrice: "100",
      fillDeltaBps: 196.0784,
      oracleMoveBps: 98.0392,
      executionImpactBps: 99.0099,
      referenceAgeSeconds: 3_600,
    });
  });

  it("ignores swap rows because the resolver sample is perp-only", () => {
    expect(buildMarketOrderExecutionSampleRows([sample({ orderType: OrderType.MarketSwap })])).toEqual([]);
  });
});
