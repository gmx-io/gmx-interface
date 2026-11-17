import { print } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarketOrderExecutionAction } from "./marketOrderExecutions";
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
        medianDelaySeconds: 17,
        p95DelaySeconds: 42,
        percentiles: [
          {
            percentile: 0.5,
            delaySeconds: 17,
          },
        ],
        delayThresholds: [{ threshold: 2, count: 800, total: 999, percentage: 80.08008 }],
        ...overrides,
      },
    },
  };
}

function executionAction(overrides: Partial<MarketOrderExecutionAction> = {}): MarketOrderExecutionAction {
  return {
    orderKey: "0xorder",
    orderType: OrderType.MarketIncrease,
    timestamp: 1_700_000_105,
    transactionHash: "0xexecution",
    account: baseParams.account,
    marketAddress: baseParams.marketAddress,
    isLong: true,
    shouldUnwrapNativeToken: false,
    initialCollateralTokenAddress: "0xTokenIn",
    initialCollateralDeltaAmount: "1000",
    swapPath: [],
    sizeDeltaUsd: "1000",
    orderCreatedTimestamp: 1_700_000_100,
    orderCreatedTxnHash: "0xcreation",
    ...overrides,
  };
}

describe("fetchMarketOrderExecutionStats", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it("returns full-population timing aggregates", async () => {
    mocks.query.mockResolvedValue(statsResult());

    const result = await fetchMarketOrderExecutionStats(baseParams);

    expect(result).toEqual({
      totalCount: 1001,
      timingCount: 999,
      medianDelaySeconds: 17,
      p95DelaySeconds: 42,
      percentiles: [{ percentile: 0.5, delaySeconds: 17 }],
      delayThresholds: [{ threshold: 2, count: 800, total: 999, percentage: 80.08008 }],
    });
    const query = print(mocks.query.mock.calls[0][0].query);

    expect(query).toContain("totalCount");
    expect(query).toContain("delayThresholds");
    expect(query).not.toMatch(/price|oracle|reference|fill|impact/i);
    expect(query).not.toContain("sample {");
  });

  it("normalizes nullable timing values", async () => {
    mocks.query.mockResolvedValue(
      statsResult({
        medianDelaySeconds: undefined,
        p95DelaySeconds: undefined,
        percentiles: [{ percentile: 0.95, delaySeconds: undefined }],
      })
    );

    const result = await fetchMarketOrderExecutionStats(baseParams);

    expect(result.medianDelaySeconds).toBeNull();
    expect(result.p95DelaySeconds).toBeNull();
    expect(result.percentiles).toEqual([{ percentile: 0.95, delaySeconds: null }]);
  });

  it("maps filters without changing address casing", async () => {
    mocks.query.mockResolvedValue(statsResult());
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
        }),
      })
    );
  });

  it("requests timing aggregates for swaps", async () => {
    mocks.query.mockResolvedValue(statsResult());

    await fetchMarketOrderExecutionStats({
      ...baseParams,
      kind: "swap",
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          orderTypes: [OrderType.MarketSwap],
          isLong: undefined,
        }),
      })
    );
  });
});

describe("fetchMarketOrderExecutionRows", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it("pages newest first by default for perps", async () => {
    mocks.query.mockResolvedValue({ data: { marketOrderExecutions: [] } });
    const account = "0xAbCdEfabcdefABCDefabCDefAbcdefABcDefABCD";
    const marketAddress = "0xFfFfFffFffFFfffFFfFFfFffFFFffffFfFFFfFfF";

    await fetchMarketOrderExecutionRows({
      ...baseParams,
      account,
      marketAddress,
      phase: "increase",
      side: "long",
      offset: 1000,
      limit: 25,
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          fromTimestamp: baseParams.fromTimestamp,
          toTimestamp: baseParams.toTimestamp,
          marketAddress,
          account,
          orderTypes: [OrderType.MarketIncrease],
          isLong: true,
          offset: 1000,
          limit: 25,
          sortField: "EXECUTED_AT",
          sortDirection: "DESC",
        },
      })
    );

    const query = print(mocks.query.mock.calls[0][0].query);

    expect(query).toContain("marketOrderExecutionRows");
    expect(query).not.toContain("tradeActions");
    expect(query).not.toMatch(/price|oracle|reference|fill|impact/i);
  });

  it("does not send a side for swaps", async () => {
    mocks.query.mockResolvedValue({ data: { marketOrderExecutions: [] } });

    await fetchMarketOrderExecutionRows({
      ...baseParams,
      kind: "swap",
      side: "long",
      offset: 25,
      limit: 25,
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          orderTypes: [OrderType.MarketSwap],
          isLong: undefined,
          sortField: "EXECUTED_AT",
        }),
      })
    );
  });

  it.each([
    ["perp", [OrderType.MarketIncrease, OrderType.MarketDecrease], "asc", "ASC"],
    ["swap", [OrderType.MarketSwap], "desc", "DESC"],
  ] as const)(
    "sorts the full filtered %s dataset by execution time",
    async (kind, orderTypes, sortDirection, expectedDirection) => {
      mocks.query.mockResolvedValue({ data: { marketOrderExecutions: [] } });

      await fetchMarketOrderExecutionRows({
        ...baseParams,
        kind,
        offset: 50,
        limit: 25,
        sortField: "executionTime",
        sortDirection,
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
            offset: 50,
            limit: 25,
            sortField: "EXECUTION_TIME",
            sortDirection: expectedDirection,
          },
        })
      );

      const query = print(mocks.query.mock.calls[0][0].query);

      expect(query).toContain("marketOrderExecutionRows");
      expect(query).not.toMatch(/price|oracle|reference|fill|impact/i);
      expect(query).not.toContain("minOutputAmount");
      expect(query).not.toContain("executionAmountOut");
    }
  );

  it("maps creation and execution timestamps into a timing row", async () => {
    mocks.query.mockResolvedValue({
      data: {
        marketOrderExecutions: [executionAction()],
      },
    });

    const [row] = await fetchMarketOrderExecutionRows({
      ...baseParams,
      offset: 0,
      limit: 25,
    });

    expect(row).toMatchObject({
      kind: "perp",
      submittedTimestamp: 1_700_000_100,
      submittedTransactionHash: "0xcreation",
      executedTimestamp: 1_700_000_105,
      executedTransactionHash: "0xexecution",
      delaySeconds: 5,
      sizeDeltaUsd: "1000",
    });
  });
});
