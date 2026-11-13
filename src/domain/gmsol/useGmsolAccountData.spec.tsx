import { act, cleanup, render, waitFor } from "@testing-library/react";
import { mutate } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getGmsolAccountDataKey,
  refreshGmsolAccountDataAfterTransaction,
  useGmsolOrders,
  useGmsolPositions,
} from "./useGmsolAccountData";

const source = vi.hoisted(() => ({
  slot: 1,
  orders: [{ key: "order-before" }],
  positions: [{ key: "position-before" }],
  error: undefined as Error | undefined,
  requests: [] as { kind: string; minContextSlot: number | undefined }[],
}));

vi.mock("./api/gmsolApiSdk", () => ({
  getGmsolApiCacheKey: () => "account-refresh-regression",
  getGmsolApiSdk: () => ({
    fetchOrders: async ({
      minContextSlot,
      onResponse,
    }: {
      minContextSlot?: number;
      onResponse: (metadata: { slot: number }) => void;
    }) => {
      source.requests.push({ kind: "orders", minContextSlot });
      if (source.error) throw source.error;
      onResponse({ slot: source.slot });
      return source.orders;
    },
    fetchPositionsInfo: async ({
      minContextSlot,
      onResponse,
    }: {
      minContextSlot?: number;
      onResponse: (metadata: { slot: number }) => void;
    }) => {
      source.requests.push({ kind: "positions", minContextSlot });
      if (source.error) throw source.error;
      onResponse({ slot: source.slot });
      return source.positions;
    },
  }),
}));

let ownerIndex = 0;

beforeEach(() => {
  source.slot = 1;
  source.orders = [{ key: "order-before" }];
  source.positions = [{ key: "position-before" }];
  source.error = undefined;
  source.requests = [];
});
afterEach(cleanup);

async function mountAccount() {
  const owner = `account-refresh-owner-${++ownerIndex}`;
  const result = {
    current: undefined as unknown as {
      orders: ReturnType<typeof useGmsolOrders>;
      positions: ReturnType<typeof useGmsolPositions>;
    },
  };
  function Probe() {
    result.current = { orders: useGmsolOrders(owner), positions: useGmsolPositions(owner) };
    return null;
  }
  render(<Probe />);
  await waitFor(() => {
    expect(result.current.orders.data).toEqual(source.orders);
    expect(result.current.positions.data).toEqual(source.positions);
  });
  return { owner, result };
}

describe("confirmed transaction account refresh", () => {
  it("keeps the highest confirmation floor through failed refreshes until polling catches up FESOL-56", async () => {
    const { owner, result } = await mountAccount();
    source.error = new Error("Snapshot service unavailable");
    await act(async () => {
      await expect(refreshGmsolAccountDataAfterTransaction(owner, 3)).rejects.toThrow("unavailable");
      await expect(refreshGmsolAccountDataAfterTransaction(owner, 2)).rejects.toThrow("unavailable");
    });
    expect(result.current.orders.error).toBeDefined();
    expect(result.current.positions.error).toBeDefined();

    const poll = () =>
      Promise.all(
        (["gmsolOrders", "gmsolPositions"] as const).map((request) =>
          mutate(getGmsolAccountDataKey(request, "account-refresh-regression", owner))
        )
      );
    source.error = undefined;
    source.slot = 2;
    source.orders = [{ key: "pre-confirmation-order" }];
    source.positions = [{ key: "pre-confirmation-position" }];
    source.requests = [];
    await act(async () => {
      await poll();
    });
    expect(result.current.orders.data).toEqual([{ key: "order-before" }]);
    expect(result.current.positions.data).toEqual([{ key: "position-before" }]);
    expect(source.requests.every(({ minContextSlot }) => minContextSlot === 3)).toBe(true);

    source.slot = 3;
    source.orders = [{ key: "confirmed-order" }];
    source.positions = [{ key: "confirmed-position" }];
    await act(async () => {
      await poll();
    });
    expect(result.current.orders.data).toEqual(source.orders);
    expect(result.current.positions.data).toEqual(source.positions);
    expect(result.current.orders.error).toBeUndefined();
    expect(result.current.positions.error).toBeUndefined();
  });

  it("immediately exposes the confirmed orders and positions through the real freshness hooks", async () => {
    const { owner, result } = await mountAccount();
    source.slot = 2;
    source.orders = [{ key: "order-after" }];
    source.positions = [{ key: "position-after" }];
    source.requests = [];

    await act(async () => {
      await refreshGmsolAccountDataAfterTransaction(owner, 2);
    });

    expect(result.current.orders.data).toEqual(source.orders);
    expect(result.current.positions.data).toEqual(source.positions);
    for (const account of [result.current.orders, result.current.positions]) {
      expect(account.isLoading).toBe(false);
      expect(account.error).toBeUndefined();
    }
    expect(source.requests).toEqual([
      { kind: "positions", minContextSlot: 2 },
      { kind: "orders", minContextSlot: 2 },
    ]);
  });

  it("preserves the accepted snapshot when a later refresh returns an older slot", async () => {
    const { owner, result } = await mountAccount();
    source.slot = 3;
    source.orders = [{ key: "confirmed-order" }];
    source.positions = [{ key: "confirmed-position" }];
    await act(async () => {
      await refreshGmsolAccountDataAfterTransaction(owner, 3);
    });
    source.slot = 2;
    source.orders = [{ key: "stale-order" }];
    source.positions = [{ key: "stale-position" }];

    await act(async () => {
      await expect(refreshGmsolAccountDataAfterTransaction(owner, 3)).rejects.toThrow(
        "older than the accepted snapshot"
      );
    });

    expect(result.current.orders.data).toEqual([{ key: "confirmed-order" }]);
    expect(result.current.positions.data).toEqual([{ key: "confirmed-position" }]);
  });

  it("retains the last good account data and reports a failed refresh to the caller", async () => {
    const { owner, result } = await mountAccount();
    source.error = new Error("Snapshot service unavailable");

    await act(async () => {
      await expect(refreshGmsolAccountDataAfterTransaction(owner, 2)).rejects.toThrow("Snapshot service unavailable");
    });

    expect(result.current.orders.data).toEqual([{ key: "order-before" }]);
    expect(result.current.positions.data).toEqual([{ key: "position-before" }]);
    expect(result.current.orders.isLoading).toBe(false);
    expect(result.current.positions.isLoading).toBe(false);
  });
});
