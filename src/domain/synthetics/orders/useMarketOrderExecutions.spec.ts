import { print } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderType } from "./types";
import { fetchMarketOrderExecutionRows, fetchMarketOrderExecutionStats } from "./useMarketOrderExecutions";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("lib/indexers", () => ({
  getMarketOrderExecutionGraphClient: () => ({
    query: mocks.query,
  }),
}));

const baseParams = {
  chainId: 42161,
  fromTimestamp: 1_700_000_000,
  toTimestamp: 1_700_086_400,
  marketAddress: "0x1111111111111111111111111111111111111111",
  account: "0x2222222222222222222222222222222222222222",
  kind: "perp" as const,
  phase: undefined,
  side: undefined,
};

function statsResult(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      marketOrderExecutionStats: {
        totalCount: 1001,
        timingCount: 999,
        referencePriceCount: 900,
        pricedCount: 850,
        oracleMoveCount: 800,
        executionImpactCount: 800,
        maxReferenceAgeSeconds: null,
        pricedFromTimestamp: 1_700_000_100,
        medianDelaySeconds: 17,
        p95DelaySeconds: 42,
        medianReferenceAgeSeconds: 4,
        p95ReferenceAgeSeconds: 12,
        medianSignedFillDeltaBps: 3,
        medianSignedOracleMoveBps: 2,
        medianSignedExecutionImpactBps: 1,
        percentiles: [
          {
            percentile: 0.5,
            delaySeconds: 17,
            absoluteFillDeltaBps: 5,
          },
        ],
        delayThresholds: [{ threshold: 2, count: 800, total: 999, percentage: 80.08008 }],
        priceThresholds: [{ threshold: 5, count: 425, total: 850, percentage: 50 }],
        sample: [
          {
            id: "execution",
            orderKey: "0xorder",
            orderType: OrderType.MarketIncrease,
            account: "0x2222222222222222222222222222222222222222",
            marketAddress: "0x1111111111111111111111111111111111111111",
            isLong: true,
            sizeDeltaUsd: "1000",
            orderCreatedTimestamp: 1_700_000_100,
            orderCreatedTxnHash: "0xcreation",
            executedTimestamp: 1_700_000_101,
            executedTxnHash: "0xexecution",
            delaySeconds: 1,
            referenceAgeSeconds: 1,
            creationReferencePrice: "102",
            creationReferenceTimestamp: 1_700_000_099,
            creationReferenceTxnHash: "0xoracle",
            creationReferenceProvider: "0xProvider",
            creationReferenceObservationId: "0xoracle:1",
            executionReferencePrice: "101",
            executionReferenceTimestamp: 1_700_000_101,
            executionReferenceTxnHash: "0xexecution",
            executionReferenceProvider: "0xExecutionProvider",
            executionReferenceObservationId: "0xexecution:2",
            executionReferenceAgeSeconds: 0,
            executionPrice: "100",
            signedFillDeltaBps: 196.0784,
            signedOracleMoveBps: 98.0392,
            signedExecutionImpactBps: 99.0099,
          },
        ],
        ...overrides,
      },
    },
  };
}

describe("fetchMarketOrderExecutionStats", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it("returns full-population aggregates instead of recomputing them from the sample", async () => {
    mocks.query.mockResolvedValue(statsResult());

    const result = await fetchMarketOrderExecutionStats(baseParams);

    expect(result.totalCount).toBe(1001);
    expect(result.medianDelaySeconds).toBe(17);
    expect(result.sample).toHaveLength(1);
    expect(result.sample[0].delaySeconds).toBe(1);
    expect(result.sample[0].creationReferencePrice).toBe("102");
    expect(result.sample[0]).toMatchObject({
      executionReferencePrice: "101",
      executionReferenceTimestamp: 1_700_000_101,
      executionReferenceTxnHash: "0xexecution",
      executionReferenceProvider: "0xExecutionProvider",
      executionReferenceObservationId: "0xexecution:2",
      executionReferenceAgeSeconds: 0,
    });

    const query = print(mocks.query.mock.calls[0][0].query);

    expect(query).toContain("executionReferencePrice");
    expect(query).toContain("executionReferenceTimestamp");
    expect(query).toContain("executionReferenceTxnHash");
    expect(query).toContain("executionReferenceProvider");
    expect(query).toContain("executionReferenceObservationId");
    expect(query).toContain("executionReferenceAgeSeconds");
    expect(query).not.toContain("$maxReferenceAgeSeconds");
  });

  it("maps phase and side filters to resolver variables without changing address casing", async () => {
    mocks.query.mockResolvedValue(statsResult({ sample: [] }));
    const account = "0xAbCdEfabcdefABCDefabCDefAbcdefABcDefABCD";
    const marketAddress = "0xFfFfFffFffFFfffFFfFFfFffFFFffffFfFFFfFfF";

    await fetchMarketOrderExecutionStats({
      ...baseParams,
      account,
      marketAddress,
      phase: "decrease",
      side: "short",
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          account,
          marketAddress,
          orderTypes: [OrderType.MarketDecrease],
          isLong: false,
          sampleSize: 300,
        }),
      })
    );
  });

  it("requests timing-only stats for swaps", async () => {
    mocks.query.mockResolvedValue(
      statsResult({
        pricedCount: 0,
        sample: [],
      })
    );

    const result = await fetchMarketOrderExecutionStats({
      ...baseParams,
      kind: "swap",
    });

    expect(result.sample).toEqual([]);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          orderTypes: [OrderType.MarketSwap],
          isLong: undefined,
          sampleSize: 0,
        }),
      })
    );
  });
});

describe("fetchMarketOrderExecutionRows", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it("uses canonical resolver rows and supports pages beyond the old 1,000-order cap", async () => {
    mocks.query.mockResolvedValue({
      data: {
        marketOrderExecutions: [],
      },
    });

    await fetchMarketOrderExecutionRows({
      ...baseParams,
      phase: "increase",
      side: "long",
      offset: 1000,
      limit: 25,
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          offset: 1000,
          limit: 25,
          orderTypes: [OrderType.MarketIncrease],
          isLong: true,
          account: baseParams.account,
          marketAddress: baseParams.marketAddress,
          sortField: "EXECUTED_AT",
          sortDirection: "DESC",
        }),
      })
    );

    const query = print(mocks.query.mock.calls[0][0].query);

    expect(query).toContain("creationReferencePrice");
    expect(query).toContain("creationReferenceTimestamp");
    expect(query).toContain("creationReferenceTxnHash");
    expect(query).toContain("creationReferenceProvider");
    expect(query).toContain("creationReferenceObservationId");
    expect(query).toContain("referenceAgeSeconds");
    expect(query).toContain("executionReferencePrice");
    expect(query).toContain("executionReferenceTimestamp");
    expect(query).toContain("executionReferenceTxnHash");
    expect(query).toContain("executionReferenceProvider");
    expect(query).toContain("executionReferenceObservationId");
    expect(query).toContain("executionReferenceAgeSeconds");
    expect(query).not.toContain("indexTokenPriceMin");
    expect(query).not.toContain("indexTokenPriceMax");
    expect(query).not.toContain("indexTokenPriceTimestamp");
    expect(query).not.toContain("indexTokenPriceType");
    expect(query).not.toContain("maxReferenceAgeSeconds:");
  });

  it.each([
    ["desc", "DESC"],
    ["asc", "ASC"],
  ] as const)("sorts the full filtered perp dataset by price improvement %s", async (direction, expectedDirection) => {
    mocks.query.mockResolvedValue({
      data: {
        marketOrderExecutions: [],
      },
    });

    await fetchMarketOrderExecutionRows({
      ...baseParams,
      phase: "decrease",
      side: "short",
      offset: 50,
      limit: 25,
      sortField: "priceImprovement",
      sortDirection: direction,
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          fromTimestamp: baseParams.fromTimestamp,
          toTimestamp: baseParams.toTimestamp,
          marketAddress: baseParams.marketAddress,
          account: baseParams.account,
          orderTypes: [OrderType.MarketDecrease],
          isLong: false,
          offset: 50,
          limit: 25,
          sortField: "PRICE_IMPROVEMENT",
          sortDirection: expectedDirection,
        },
      })
    );

    const query = print(mocks.query.mock.calls[0][0].query);

    expect(query).toContain("MarketOrderExecutionSortField");
    expect(query).toContain("sortField");
  });

  it("maps the server-sorted improvement value into the table row", async () => {
    mocks.query.mockResolvedValue({
      data: {
        marketOrderExecutions: [
          {
            id: "execution",
            orderKey: "0xorder",
            orderType: OrderType.MarketIncrease,
            timestamp: 1_700_000_105,
            transactionHash: "0xexecution",
            account: baseParams.account,
            marketAddress: baseParams.marketAddress,
            isLong: true,
            sizeDeltaUsd: "1000",
            executionPrice: "100",
            orderCreatedTimestamp: 1_700_000_100,
            orderCreatedTxnHash: "0xcreation",
            creationReferencePrice: "102",
            creationReferenceTimestamp: 1_699_996_500,
            creationReferenceTxnHash: "0xoracle",
            creationReferenceProvider: "0xProvider",
            creationReferenceObservationId: "0xoracle:1",
            referenceAgeSeconds: 3_600,
            executionReferencePrice: "100",
            executionReferenceTimestamp: 1_700_000_105,
            executionReferenceTxnHash: "0xexecution",
            executionReferenceProvider: "0xExecutionProvider",
            executionReferenceObservationId: "0xexecution:2",
            executionReferenceAgeSeconds: 0,
            signedFillDeltaBps: 196.078431,
          },
        ],
      },
    });

    const [row] = await fetchMarketOrderExecutionRows({
      ...baseParams,
      offset: 0,
      limit: 25,
      sortField: "priceImprovement",
      sortDirection: "desc",
    });

    expect(row.fillDeltaBps).toBe(196.078431);
    expect(row.kind).toBe("perp");
    if (row.kind === "perp") {
      expect(row.creationReferencePrice).toBe("102");
      expect(row.referenceAgeSeconds).toBe(3_600);
      expect(row.executionReferencePrice).toBe("100");
      expect(row.executionReferenceTimestamp).toBe(1_700_000_105);
      expect(row.executionReferenceTxnHash).toBe("0xexecution");
      expect(row.executionReferenceProvider).toBe("0xExecutionProvider");
      expect(row.executionReferenceObservationId).toBe("0xexecution:2");
      expect(row.executionReferenceAgeSeconds).toBe(0);
    }
  });

  it("keeps swaps on newest-first entity pagination", async () => {
    mocks.query.mockResolvedValue({
      data: {
        marketOrderExecutions: [],
      },
    });

    await fetchMarketOrderExecutionRows({
      ...baseParams,
      kind: "swap",
      offset: 0,
      limit: 25,
      sortField: "priceImprovement",
      sortDirection: "desc",
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          offset: 0,
          limit: 25,
          where: expect.objectContaining({
            orderType_eq: OrderType.MarketSwap,
          }),
        }),
      })
    );
  });

  it.each([
    ["perp", [OrderType.MarketIncrease, OrderType.MarketDecrease]],
    ["swap", [OrderType.MarketSwap]],
  ] as const)("sorts the full filtered %s dataset by execution time", async (kind, orderTypes) => {
    mocks.query.mockResolvedValue({
      data: {
        marketOrderExecutions: [],
      },
    });

    await fetchMarketOrderExecutionRows({
      ...baseParams,
      kind,
      offset: 25,
      limit: 25,
      sortField: "executionTime",
      sortDirection: "asc",
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          fromTimestamp: baseParams.fromTimestamp,
          toTimestamp: baseParams.toTimestamp,
          marketAddress: baseParams.marketAddress,
          account: baseParams.account,
          orderTypes: [...orderTypes],
          isLong: undefined,
          offset: 25,
          limit: 25,
          sortField: "EXECUTION_TIME",
          sortDirection: "ASC",
        },
      })
    );
  });
});
