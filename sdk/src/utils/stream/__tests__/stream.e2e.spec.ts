import type { AddressInfo } from "net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket, WebSocketServer } from "ws";

import { GmxApiSdk } from "../../../clients/v2";

const ARBITRUM = 42161;

function startServer() {
  const wss = new WebSocketServer({ port: 0 });
  const received: { op?: string; channels?: string[] }[] = [];
  const connections: WebSocket[] = [];

  wss.on("connection", (socket) => {
    connections.push(socket);
    socket.on("message", (raw) => {
      try {
        received.push(JSON.parse(raw.toString()));
      } catch {
        /* ignore non-JSON */
      }
    });
  });

  return {
    received,
    connections,
    async ready(): Promise<number> {
      await new Promise<void>((resolve) => wss.once("listening", () => resolve()));
      return (wss.address() as AddressInfo).port;
    },
    broadcast(frame: unknown) {
      const data = JSON.stringify(frame);
      for (const socket of connections) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      }
    },
    subscribeCount(): number {
      return received.filter((m) => m.op === "subscribe").length;
    },
    async close() {
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}

const snapshot = (min: string, max: string) => ({
  ch: "prices",
  type: "snapshot",
  serverTs: 1,
  data: { "0xabc": { minPrice: min, maxPrice: max } },
});

describe("stream e2e (real client <-> real ws server)", () => {
  let server: ReturnType<typeof startServer>;
  let sdk: GmxApiSdk;
  const open: { close(): void }[] = [];

  beforeEach(async () => {
    server = startServer();
    const port = await server.ready();
    sdk = new GmxApiSdk({
      chainId: ARBITRUM,
      apiUrl: `http://localhost:${port}`,
      reconnectBaseMs: 20,
      reconnectMaxMs: 40,
    });
  });

  afterEach(async () => {
    open.forEach((sub) => sub.close());
    open.length = 0;
    await server.close();
  });

  it("connects over a real socket, subscribes, and deserializes a pushed snapshot", async () => {
    const sub = sdk.watchTokenPrices();
    open.push(sub);
    const values: unknown[] = [];
    sub.subscribe((value) => values.push(value));

    await vi.waitFor(() => expect(sub.status).toBe("live"));
    await vi.waitFor(() => expect(server.received).toContainEqual({ op: "subscribe", channels: ["prices"] }));

    server.broadcast(snapshot("123", "124"));

    await vi.waitFor(() => expect(values.length).toBeGreaterThan(0));
    expect(sub.get()).toEqual({ "0xabc": { minPrice: 123n, maxPrice: 124n } });
  });

  it("reconnects, resubscribes, and resumes delivery after the server drops the socket", async () => {
    const sub = sdk.watchTokenPrices();
    open.push(sub);
    const statuses: string[] = [];
    sub.subscribeStatus((status) => statuses.push(status));
    sub.subscribe(vi.fn());

    await vi.waitFor(() => expect(sub.status).toBe("live"));
    expect(server.connections.length).toBe(1);

    server.connections[0].close();

    await vi.waitFor(() => expect(server.connections.length).toBe(2));
    await vi.waitFor(() => expect(sub.status).toBe("live"));
    await vi.waitFor(() => expect(server.subscribeCount()).toBeGreaterThanOrEqual(2));
    expect(statuses).toContain("reconnecting");

    server.broadcast(snapshot("200", "201"));
    await vi.waitFor(() => expect(sub.get()).toEqual({ "0xabc": { minPrice: 200n, maxPrice: 201n } }));
  });

  it("closes the socket on close() and does not reconnect", async () => {
    const sub = sdk.watchTokenPrices();
    open.push(sub);
    sub.subscribe(vi.fn());

    await vi.waitFor(() => expect(server.connections.length).toBe(1));
    const socket = server.connections[0];

    sub.close();

    await vi.waitFor(() => expect(socket.readyState).toBe(WebSocket.CLOSED));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(server.connections.length).toBe(1);
    expect(sub.status).toBe("closed");
  });

  it("subscribes to a per-token candle channel and delivers the forming bar", async () => {
    const sub = sdk.watchCandles({ symbol: "BTC", timeframe: "1m" });
    open.push(sub);
    const values: unknown[] = [];
    sub.subscribe((value) => values.push(value));

    await vi.waitFor(() => expect(sub.status).toBe("live"));
    await vi.waitFor(() =>
      expect(server.received).toContainEqual({ op: "subscribe", channels: ["candles:BTC:1m"] })
    );

    const bar = { timestamp: 1_700_000_060_000, open: "4", high: "6", low: "3", close: "5" };
    server.broadcast({ ch: "candles:BTC:1m", type: "snapshot", serverTs: 1, data: bar });

    await vi.waitFor(() => expect(values.length).toBeGreaterThan(0));
    expect(sub.get()).toEqual(bar);
  });
});
