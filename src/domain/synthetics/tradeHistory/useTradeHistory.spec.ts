import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSubsquidGraphClient } from "lib/indexers";
import { SUBSQUID_PAGINATION_LIMIT } from "sdk/configs/batch";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import { fetchPositionLifecycleId, fetchTwapGroupExecutedActions } from "./useTradeHistory";

const queryMock = vi.fn();

vi.mock("lib/indexers", () => ({
  getSubsquidGraphClient: vi.fn(() => ({ query: queryMock })),
}));

function getQueryBody(callIndex: number): string {
  return queryMock.mock.calls[callIndex][0].query.loc.source.body;
}

describe("fetchTwapGroupExecutedActions", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("requests executed actions of the given groups in stable ascending order", async () => {
    queryMock.mockResolvedValue({ data: { tradeActions: [] } });

    await fetchTwapGroupExecutedActions({ chainId: 42161, account: "0xAccount", twapGroupIds: ["group-1"] });

    expect(queryMock).toHaveBeenCalledTimes(1);
    const body = getQueryBody(0);
    // account_eq keeps the query on the indexed account column; twapGroupId alone full-scans
    expect(body).toContain('account_eq:"0xAccount"');
    expect(body).toContain('twapGroupId_in:["group-1"]');
    expect(body).toContain('eventName_eq:"OrderExecuted"');
    expect(body).toContain("orderBy: [timestamp_ASC, id_ASC]");
  });

  it("splits group ids into chunked requests", async () => {
    queryMock.mockResolvedValue({ data: { tradeActions: [] } });
    const twapGroupIds = Array.from({ length: 150 }, (_, index) => `group-${index}`);

    await fetchTwapGroupExecutedActions({ chainId: 42161, account: "0xAccount", twapGroupIds });

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(getQueryBody(0)).toContain('"group-0"');
    expect(getQueryBody(0)).toContain('"group-99"');
    expect(getQueryBody(0)).not.toContain('"group-100"');
    expect(getQueryBody(1)).toContain('"group-100"');
    expect(getQueryBody(1)).toContain('"group-149"');
  });

  it("aggregates every page of a chunk", async () => {
    const fullPage = Array.from({ length: SUBSQUID_PAGINATION_LIMIT }, (_, index) => ({
      id: `action-${index}`,
      eventName: "OrderExecuted",
      timestamp: index,
      twapGroupId: "group-1",
    }));
    const lastPage = [{ id: "action-last", eventName: "OrderExecuted", timestamp: 9999, twapGroupId: "group-1" }];
    queryMock
      .mockResolvedValueOnce({ data: { tradeActions: fullPage } })
      .mockResolvedValueOnce({ data: { tradeActions: lastPage } });

    const actions = await fetchTwapGroupExecutedActions({
      chainId: 42161,
      account: "0xAccount",
      twapGroupIds: ["group-1"],
    });

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(getQueryBody(0)).toContain("offset: 0,");
    expect(getQueryBody(1)).toContain(`offset: ${SUBSQUID_PAGINATION_LIMIT},`);
    expect(actions).toHaveLength(SUBSQUID_PAGINATION_LIMIT + 1);
    expect(actions.at(-1)?.id).toBe("action-last");
  });
});

describe("fetchPositionLifecycleId", () => {
  const positionKey = "0xPosition";
  const currentLifecycleId = `${positionKey}:0xOpen`;
  const params = { chainId: 42161, positionKey };

  beforeEach(() => {
    queryMock.mockReset();
  });

  it.each([TradeActionType.OrderCreated, TradeActionType.OrderCancelled, TradeActionType.OrderFrozen])(
    "selects the open position when the newest increase or margin deposit is %s",
    async (eventName) => {
      queryMock.mockResolvedValue({
        data: {
          positionLifecycleById: { currentLifecycleId, isOpen: true },
          tradeActions: [{ eventName, positionLifecycleId: `${positionKey}:0xUnexecutedIncrease` }],
        },
      });

      await expect(fetchPositionLifecycleId(params)).resolves.toBe(currentLifecycleId);
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock.mock.calls[0][0]).toMatchObject({ variables: { positionKey }, fetchPolicy: "no-cache" });
    }
  );

  it("selects the new lifecycle after a full close and reopen", async () => {
    const reopenedLifecycleId = `${positionKey}:0xReopen`;
    queryMock.mockResolvedValue({
      data: {
        positionLifecycleById: {
          currentLifecycleId: reopenedLifecycleId,
          lastClosedLifecycleId: currentLifecycleId,
          isOpen: true,
        },
        tradeActions: [{ positionLifecycleId: currentLifecycleId }],
      },
    });

    await expect(fetchPositionLifecycleId(params)).resolves.toBe(reopenedLifecycleId);
  });

  it.each([
    null,
    { currentLifecycleId: null, isOpen: false },
    { currentLifecycleId, lastClosedLifecycleId: currentLifecycleId, isOpen: false },
    { currentLifecycleId: null, isOpen: true },
  ])("falls back to full history when no open lifecycle is indexed (%j)", async (positionLifecycleById) => {
    queryMock.mockResolvedValue({
      data: { positionLifecycleById, tradeActions: [{ positionLifecycleId: currentLifecycleId }] },
    });

    await expect(fetchPositionLifecycleId(params)).resolves.toBeUndefined();
  });

  it("falls back to full history when the chain has no indexer", async () => {
    vi.mocked(getSubsquidGraphClient).mockReturnValueOnce(null);

    await expect(fetchPositionLifecycleId(params)).resolves.toBeUndefined();
    expect(queryMock).not.toHaveBeenCalled();
  });
});
