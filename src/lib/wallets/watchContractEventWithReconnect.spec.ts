import type { PublicClient } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { watchContractEventWithReconnect } from "./watchContractEventWithReconnect";

const OPEN = 1;
const socketError = new Error("Socket closed");

function createClient() {
  const rpcClients: { close: () => void; socket: { OPEN: number; readyState: number } }[] = [];
  const subscriptions: { onError: (error: unknown) => void; unwatch: () => void }[] = [];
  const getRpcClient = vi.fn(async () => {
    const last = rpcClients[rpcClients.length - 1];

    if (last?.socket.readyState === OPEN) {
      return last;
    }

    const rpcClient = { close: vi.fn(), socket: { OPEN, readyState: OPEN } };
    rpcClient.close.mockImplementation(() => (rpcClient.socket.readyState = 3));
    rpcClients.push(rpcClient);
    return rpcClient;
  });

  const client = {
    transport: { type: "webSocket", getRpcClient },
    watchContractEvent: ({ onError }: { onError: (error: unknown) => void }) => {
      const unwatch = vi.fn();
      subscriptions.push({ onError, unwatch });
      return unwatch;
    },
  } as unknown as PublicClient;

  return { client, getRpcClient, rpcClients, subscriptions };
}

const watch = (client: PublicClient) => watchContractEventWithReconnect(client, { abi: [], onLogs: () => undefined });

describe("watchContractEventWithReconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves every subscription to a new socket once when the socket fails", async () => {
    const { client, rpcClients, subscriptions } = createClient();
    watch(client);
    watch(client);
    await vi.advanceTimersByTimeAsync(0);
    expect(subscriptions).toHaveLength(2);

    const [first, second] = subscriptions;
    first.onError(socketError);
    second.onError(socketError);
    first.onError(socketError);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(first.unwatch).toHaveBeenCalledTimes(1);
    expect(second.unwatch).toHaveBeenCalledTimes(1);
    expect(rpcClients).toHaveLength(2);
    expect(subscriptions).toHaveLength(4);
  });

  it("retries only a subscription rejected by the server, with growing delays, and keeps the socket", async () => {
    const { client, rpcClients, subscriptions } = createClient();
    watch(client);
    watch(client);
    await vi.advanceTimersByTimeAsync(0);
    const [rejected, healthy] = subscriptions;

    rejected.onError({ code: 429, message: "Too many requests" });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(subscriptions).toHaveLength(3);

    subscriptions[2].onError({ code: 429, message: "Too many requests" });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(subscriptions).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(subscriptions).toHaveLength(4);

    expect(healthy.unwatch).not.toHaveBeenCalled();
    expect(rpcClients).toHaveLength(1);
    expect(rpcClients[0].close).not.toHaveBeenCalled();
  });

  it("keeps trying while the socket is down and stops when nobody is watching", async () => {
    const { client, getRpcClient, subscriptions } = createClient();
    getRpcClient.mockRejectedValue(new Error("socket is down"));

    const unwatch = watch(client);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(subscriptions).toHaveLength(0);
    const attempts = getRpcClient.mock.calls.length;
    expect(attempts).toBeLessThan(30);

    getRpcClient.mockRestore();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(subscriptions).toHaveLength(1);

    unwatch();
    subscriptions[0].onError(socketError);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(subscriptions).toHaveLength(1);
  });
});
