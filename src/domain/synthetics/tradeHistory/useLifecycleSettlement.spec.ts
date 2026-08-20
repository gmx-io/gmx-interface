import type { DocumentNode, OperationDefinitionNode } from "graphql";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { LIFECYCLE_MAX_ROWS, fetchLifecycleSettlementData } from "./useLifecycleSettlement";

vi.mock("lib/indexers/clients", () => ({ getSubsquidGraphClient: vi.fn() }));

const mockedGetClient = vi.mocked(getSubsquidGraphClient);

const CHAIN_ID = 42161;
const ACCOUNT = "0x414da6c7c50eadfbd4c67c902c7daf59f58d32c7";
const LIFECYCLE_ID = "0xposition:0xopen";
const MARKET = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const SWAP_MARKET = "0xD9535bB5f58A1a75032416F2dFe7880C30575a41";

type QueryCall = { operationName: string; variables: Record<string, unknown> };

function buildRawRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "0xtx:1",
    orderKey: "0xopen",
    orderType: 2,
    swapPath: [],
    marketAddress: MARKET,
    isLong: true,
    timestamp: 1000,
    ...overrides,
  };
}

function mockClient(handlers: Record<string, (variables: Record<string, unknown>) => unknown>) {
  const calls: QueryCall[] = [];

  const query = vi.fn(async ({ query: document, variables }: { query: DocumentNode; variables: any }) => {
    const operationName = (document.definitions[0] as OperationDefinitionNode).name!.value;

    calls.push({ operationName, variables: variables ?? {} });

    return { data: handlers[operationName]?.(variables ?? {}) ?? {} };
  });

  mockedGetClient.mockReturnValue({ query } as any);

  return calls;
}

function defaultHandlers(rows: unknown[], overrides: Record<string, (variables: any) => unknown> = {}) {
  return {
    LifecycleTradeActions: ({ offset }: any) => ({ tradeActions: offset === 0 ? rows : [] }),
    LifecycleTradeActionsCount: () => ({ tradeActionsConnection: { totalCount: rows.length } }),
    LifecycleOrders: () => ({ orders: [] }),
    LifecycleSwapInfos: () => ({ swapInfos: [] }),
    LifecycleSettleFundingClaims: () => ({ claimActions: [] }),
    ...overrides,
  };
}

function fetch() {
  return fetchLifecycleSettlementData({ chainId: CHAIN_ID, account: ACCOUNT, positionLifecycleId: LIFECYCLE_ID });
}

describe("fetchLifecycleSettlementData", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns nothing when the chain has no indexer", async () => {
    mockedGetClient.mockReturnValue(null);

    await expect(fetch()).resolves.toBeUndefined();
  });

  it("requests only executed rows of the lifecycle, oldest first", async () => {
    const calls = mockClient(defaultHandlers([buildRawRow()]));

    await fetch();

    const rowsCall = calls.find((call) => call.operationName === "LifecycleTradeActions")!;

    expect(rowsCall.variables).toEqual({ positionLifecycleId: LIFECYCLE_ID, limit: 300, offset: 0 });
  });

  it("pages until the reported total count is loaded", async () => {
    const firstPage = Array.from({ length: 300 }, (_, index) => buildRawRow({ id: `0xtx:${index}` }));
    const secondPage = [buildRawRow({ id: "0xtx:300", timestamp: 2000 })];

    const calls = mockClient(
      defaultHandlers([], {
        LifecycleTradeActions: ({ offset }: any) => ({ tradeActions: offset === 0 ? firstPage : secondPage }),
        LifecycleTradeActionsCount: () => ({ tradeActionsConnection: { totalCount: 301 } }),
      })
    );

    const result = await fetch();

    expect(result!.rawRows).toHaveLength(301);
    expect(
      calls.filter((call) => call.operationName === "LifecycleTradeActions").map((call) => call.variables.offset)
    ).toEqual([0, 300]);
    expect(result!.isTruncated).toBe(false);
  });

  it("marks the lifecycle truncated instead of paging past the cap", async () => {
    const calls = mockClient(
      defaultHandlers([], {
        LifecycleTradeActions: () => ({ tradeActions: [buildRawRow()] }),
        LifecycleTradeActionsCount: () => ({ tradeActionsConnection: { totalCount: LIFECYCLE_MAX_ROWS + 1 } }),
      })
    );

    const result = await fetch();

    expect(result!.isTruncated).toBe(true);
    expect(calls.filter((call) => call.operationName === "LifecycleTradeActions")).toHaveLength(1);
  });

  it("orders rows sharing a timestamp by log index rather than by id string", async () => {
    mockClient(
      defaultHandlers([
        buildRawRow({ id: "0xtx:10" }),
        buildRawRow({ id: "0xtx:9" }),
        buildRawRow({ id: "0xtx:2", timestamp: 900 }),
      ])
    );

    const result = await fetch();

    expect(result!.rawRows.map((row) => row.id)).toEqual(["0xtx:2", "0xtx:9", "0xtx:10"]);
  });

  it("builds swap leg ids from the funding hop of increases and the payout hop of decreases", async () => {
    const calls = mockClient(
      defaultHandlers([
        buildRawRow({ id: "0xtx:1", orderKey: "0xopen", orderType: 2, swapPath: [SWAP_MARKET, MARKET] }),
        buildRawRow({
          id: "0xtx:2",
          orderKey: "0xclose",
          orderType: 4,
          swapPath: [MARKET, SWAP_MARKET],
          timestamp: 2000,
        }),
      ])
    );

    await fetch();

    const swapCall = calls.find((call) => call.operationName === "LifecycleSwapInfos")!;

    expect(swapCall.variables.swapInfoIds).toEqual([`0xopen:${SWAP_MARKET}`, `0xclose:${SWAP_MARKET}`]);
  });

  it("skips the swap query when no row swapped", async () => {
    const calls = mockClient(defaultHandlers([buildRawRow()]));

    await fetch();

    expect(calls.some((call) => call.operationName === "LifecycleSwapInfos")).toBe(false);
  });

  it("probes settle-funding claims across the lifecycle time window", async () => {
    const calls = mockClient(
      defaultHandlers([buildRawRow({ timestamp: 1000 }), buildRawRow({ id: "0xtx:2", timestamp: 5000 })])
    );

    await fetch();

    const claimsCall = calls.find((call) => call.operationName === "LifecycleSettleFundingClaims")!;

    expect(claimsCall.variables).toEqual({ account: ACCOUNT, fromTimestamp: 1000, toTimestamp: 5000, limit: 200 });
  });

  it("flags a settle that hit the lifecycle's market and direction", async () => {
    mockClient(
      defaultHandlers([buildRawRow()], {
        LifecycleSettleFundingClaims: () => ({
          claimActions: [{ marketAddresses: [SWAP_MARKET, MARKET], isLongOrders: [true, true] }],
        }),
      })
    );

    await expect(fetch()).resolves.toMatchObject({ hasFundingSettlement: true });
  });

  it("ignores settles for another market or the opposite direction", async () => {
    mockClient(
      defaultHandlers([buildRawRow()], {
        LifecycleSettleFundingClaims: () => ({
          claimActions: [{ marketAddresses: [MARKET, SWAP_MARKET], isLongOrders: [false, true] }],
        }),
      })
    );

    await expect(fetch()).resolves.toMatchObject({ hasFundingSettlement: false });
  });

  it("treats a saturated claims probe as unreconcilable", async () => {
    mockClient(
      defaultHandlers([buildRawRow()], {
        LifecycleSettleFundingClaims: () => ({
          claimActions: Array.from({ length: 200 }, () => ({ marketAddresses: [], isLongOrders: [] })),
        }),
      })
    );

    await expect(fetch()).resolves.toMatchObject({ hasFundingSettlement: true });
  });

  it("returns the requested order amounts alongside the rows", async () => {
    const calls = mockClient(
      defaultHandlers([buildRawRow()], {
        LifecycleOrders: () => ({
          orders: [
            {
              id: "0xopen",
              initialCollateralTokenAddress: "0xusdc",
              initialCollateralDeltaAmount: "1000000000",
              swapPath: [],
            },
          ],
        }),
      })
    );

    const result = await fetch();

    expect(calls.find((call) => call.operationName === "LifecycleOrders")!.variables.orderKeys).toEqual(["0xopen"]);
    expect(result!.orders).toEqual([
      {
        orderKey: "0xopen",
        initialCollateralTokenAddress: "0xusdc",
        initialCollateralDeltaAmount: 1000000000n,
        swapPath: [],
      },
    ]);
  });
});
