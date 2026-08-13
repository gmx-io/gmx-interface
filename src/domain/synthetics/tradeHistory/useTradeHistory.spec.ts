import { beforeEach, describe, expect, it, vi } from "vitest";

import { SUBSQUID_PAGINATION_LIMIT } from "sdk/configs/batch";

import { fetchTwapGroupExecutedActions } from "./useTradeHistory";

const queryMock = vi.fn();

vi.mock("lib/indexers", () => ({
  getSubsquidGraphClient: () => ({ query: queryMock }),
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

    await fetchTwapGroupExecutedActions({ chainId: 42161, twapGroupIds: ["group-1"] });

    expect(queryMock).toHaveBeenCalledTimes(1);
    const body = getQueryBody(0);
    expect(body).toContain('twapGroupId_in:["group-1"]');
    expect(body).toContain('eventName_eq:"OrderExecuted"');
    expect(body).toContain("orderBy: [timestamp_ASC, id_ASC]");
  });

  it("splits group ids into chunked requests", async () => {
    queryMock.mockResolvedValue({ data: { tradeActions: [] } });
    const twapGroupIds = Array.from({ length: 150 }, (_, index) => `group-${index}`);

    await fetchTwapGroupExecutedActions({ chainId: 42161, twapGroupIds });

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

    const actions = await fetchTwapGroupExecutedActions({ chainId: 42161, twapGroupIds: ["group-1"] });

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(getQueryBody(0)).toContain("offset: 0,");
    expect(getQueryBody(1)).toContain(`offset: ${SUBSQUID_PAGINATION_LIMIT},`);
    expect(actions).toHaveLength(SUBSQUID_PAGINATION_LIMIT + 1);
    expect(actions.at(-1)?.id).toBe("action-last");
  });
});
