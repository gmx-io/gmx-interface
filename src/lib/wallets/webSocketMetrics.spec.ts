import type { PublicClient } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import { metrics } from "lib/metrics";

import { setupWebSocketClientMetrics } from "./walletConfig";

afterEach(() => vi.restoreAllMocks());

describe("WebSocket metrics", () => {
  it("records a failed handshake without an unhandled rejection", async () => {
    const push = vi.spyOn(metrics, "pushEvent").mockImplementation(() => undefined);
    const client = { transport: { getRpcClient: () => Promise.reject(new Event("error")) } } as unknown as PublicClient;
    await expect(setupWebSocketClientMetrics(client, 42161)).resolves.toBeUndefined();
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "viemWsClient.error",
        isError: true,
        data: expect.objectContaining({ chainId: 42161 }),
      })
    );
  });

  it("records actual connection state and subsequent close/error events", async () => {
    const push = vi.spyOn(metrics, "pushEvent").mockImplementation(() => undefined);
    const socket = Object.assign(new EventTarget(), { OPEN: 1, CLOSED: 3, readyState: 1 });
    const client = {
      transport: { getRpcClient: async () => ({ socket, url: "wss://public.example" }) },
    } as unknown as PublicClient;
    await setupWebSocketClientMetrics(client, 42161);
    expect(push.mock.calls.map(([event]) => event.event)).toEqual(["viemWsClient.connected"]);
    socket.dispatchEvent(new Event("close"));
    socket.dispatchEvent(new Event("error"));
    expect(push.mock.calls.map(([event]) => event.event)).toEqual([
      "viemWsClient.connected",
      "viemWsClient.disconnected",
      "viemWsClient.error",
    ]);
  });
});
