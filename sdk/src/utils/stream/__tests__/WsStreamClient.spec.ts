import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StreamConnectionStatus } from "../types";
import { WsStreamClient } from "../WsStreamClient";

const OPEN = 1;
const CLOSED = 3;

class FakeSocket {
  readyState = 0;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = CLOSED;
  });

  constructor(public url: string) {}

  open() {
    this.readyState = OPEN;
    this.onopen?.({});
  }

  emit(frame: unknown) {
    this.onmessage?.({ data: typeof frame === "string" ? frame : JSON.stringify(frame) });
  }

  emitRaw(data: unknown) {
    this.onmessage?.({ data });
  }

  serverClose() {
    this.readyState = CLOSED;
    this.onclose?.({});
  }
}

function makeWsImpl(opts: { failFirst?: number } = {}) {
  const sockets: FakeSocket[] = [];
  const failFirst = opts.failFirst ?? 0;
  let attempts = 0;
  const Ctor = vi.fn(function (url: string) {
    attempts += 1;
    if (attempts <= failFirst) {
      throw new Error("connect failed");
    }
    const socket = new FakeSocket(url);
    sockets.push(socket);
    return socket;
  });
  return { Ctor, sockets, getAttempts: () => attempts };
}

const URL = "ws://localhost:3004/v1/stream";

function makeClient(
  opts: {
    failFirst?: number;
    reconnectBaseMs?: number;
    reconnectMaxMs?: number;
    probeIntervalMs?: number;
    random?: () => number;
  } = {}
) {
  const impl = makeWsImpl({ failFirst: opts.failFirst });
  const client = new WsStreamClient({
    url: URL,
    webSocketImpl: impl.Ctor,
    reconnectBaseMs: opts.reconnectBaseMs,
    reconnectMaxMs: opts.reconnectMaxMs,
    probeIntervalMs: opts.probeIntervalMs,
    random: opts.random ?? (() => 1),
  });
  return { client, ...impl };
}

function parseSends(socket: FakeSocket): any[] {
  return socket.send.mock.calls.map((call) => JSON.parse(call[0] as string));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WsStreamClient connection", () => {
  it("connects on first subscribe and transitions connecting -> live", () => {
    const { client, sockets, getAttempts } = makeClient();
    const statuses: StreamConnectionStatus[] = [];
    client.addStatusListener((s) => statuses.push(s));

    client.subscribe("prices", vi.fn());
    expect(getAttempts()).toBe(1);
    expect(client.status).toBe("connecting");

    sockets[0].open();
    expect(client.status).toBe("live");
    expect(statuses).toEqual(["connecting", "live"]);
  });

  it("sends subscribe for all channels on open", () => {
    const { client, sockets } = makeClient();
    client.subscribe("prices", vi.fn());
    client.subscribe("candles", vi.fn());
    sockets[0].open();
    expect(parseSends(sockets[0])).toContainEqual({ op: "subscribe", channels: ["prices", "candles"] });
  });

  it("sends subscribe immediately when subscribing while already live", () => {
    const { client, sockets } = makeClient();
    client.subscribe("prices", vi.fn());
    sockets[0].open();
    sockets[0].send.mockClear();

    client.subscribe("candles", vi.fn());
    expect(parseSends(sockets[0])).toContainEqual({ op: "subscribe", channels: ["candles"] });
  });
});

describe("WsStreamClient messages", () => {
  function connected() {
    const ctx = makeClient();
    const listener = vi.fn();
    ctx.client.subscribe("prices", listener);
    ctx.sockets[0].open();
    listener.mockClear();
    return { ...ctx, listener };
  }

  it("delivers a snapshot frame to the channel listener with meta", () => {
    const { sockets, listener } = connected();
    sockets[0].emit({ ch: "prices", type: "snapshot", serverTs: 1000, originTs: 900, data: { p: 1 } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { p: 1 },
        serverTs: 1000,
        originTs: 900,
        byteLength: expect.any(Number),
        receivedAt: expect.any(Number),
      })
    );
  });

  it.each([
    ["a frame for an unsubscribed channel", JSON.stringify({ ch: "candles", type: "snapshot", serverTs: 1, data: {} })],
    ["a non-snapshot frame", JSON.stringify({ ch: "prices", type: "delta", serverTs: 1, data: {} })],
    ["a snapshot without data", JSON.stringify({ ch: "prices", type: "snapshot", serverTs: 1 })],
    ["an ack", JSON.stringify({ op: "ack", channels: ["prices"] })],
    ["an error without channels", JSON.stringify({ op: "error", message: "x" })],
    ["invalid JSON", "{ not json"],
    ["JSON null", "null"],
    ["a JSON number", "42"],
    ["a JSON array", "[]"],
  ])("ignores %s and delivers the next frame, sent as a Buffer", (_, data) => {
    const { sockets, listener } = connected();
    sockets[0].emitRaw(data);
    expect(listener).not.toHaveBeenCalled();

    sockets[0].emitRaw(Buffer.from(JSON.stringify({ ch: "prices", type: "snapshot", serverTs: 2, data: 42 })));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ data: 42 }));
  });

  it.each([
    { held: 1000, next: 2000, applied: true },
    { held: 1000, next: 1000, applied: true },
    { held: 1000, next: 999, applied: false },
    { held: 1000, next: undefined, applied: true },
    { held: undefined, next: 5, applied: true },
  ])("after a reconnect applies a frame with originTs $next over $held: $applied", ({ held, next, applied }) => {
    const { client, sockets } = makeClient();
    const listener = vi.fn();
    client.subscribe("prices", listener);
    sockets[0].open();
    sockets[0].emit({ ch: "prices", type: "snapshot", serverTs: 1, originTs: held, data: "held" });

    sockets[0].serverClose();
    vi.advanceTimersByTime(500);
    sockets[1].open();
    sockets[1].emit({ ch: "prices", type: "snapshot", serverTs: 2, originTs: next, data: "next" });

    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ data: applied ? "next" : "held" }));
  });

  const CANDLES = "candles:ETH:1m";
  it.each([
    {
      name: "an error naming the channel, then the ack",
      probe: false,
      frames: [
        { op: "error", message: "subscription limit reached", channels: [CANDLES] },
        { op: "ack", channels: ["prices"] },
      ],
      refusals: ["subscription limit reached"],
    },
    {
      name: "an old server's error without channels, then an ack without the channel",
      probe: false,
      frames: [
        { op: "error", message: "subscription limit reached" },
        { op: "ack", channels: ["prices"] },
      ],
      refusals: ["subscription refused"],
    },
    {
      name: "a probe ack after the channel's ack",
      probe: true,
      frames: [
        { op: "ack", channels: ["prices", CANDLES] },
        { op: "ack", channels: ["prices", CANDLES] },
      ],
      refusals: [],
    },
    {
      name: "an unknown op before the ack",
      probe: false,
      frames: [{ op: "heartbeat" }, { op: "ack", channels: ["prices", CANDLES] }],
      refusals: [],
    },
  ])("matches acks and errors to the ops that caused them: $name", ({ probe, frames, refusals }) => {
    const { client, sockets } = makeClient();
    client.subscribe("prices", vi.fn());
    sockets[0].open();
    sockets[0].emit({ op: "ack", channels: ["prices"] });
    const onError = vi.fn();
    client.subscribe(CANDLES, vi.fn(), onError);
    if (probe) {
      vi.advanceTimersByTime(15_000);
    }

    frames.forEach((frame) => sockets[0].emit(frame));

    expect(onError.mock.calls.map(([error]) => error.message)).toEqual(refusals);
  });
});

describe("WsStreamClient reconnect / backoff", () => {
  it.each([
    { jitter: "lowest", random: 0, delays: [50, 100, 200, 200] },
    { jitter: "middle", random: 0.5, delays: [75, 150, 300, 300] },
    { jitter: "highest", random: 1, delays: [100, 200, 400, 400] },
  ])("backs off with equal jitter capped at the max ($jitter)", ({ random, delays }) => {
    const { client, getAttempts } = makeClient({
      failFirst: 5,
      reconnectBaseMs: 100,
      reconnectMaxMs: 400,
      random: () => random,
    });
    client.subscribe("prices", vi.fn());

    delays.forEach((delay, index) => {
      vi.advanceTimersByTime(delay - 1);
      expect(getAttempts()).toBe(index + 1);
      vi.advanceTimersByTime(1);
      expect(getAttempts()).toBe(index + 2);
    });
    expect(client.status).toBe("reconnecting");
  });

  it("keeps backing off while sockets drop soon after opening, and resets after one stayed up 30 s", () => {
    const { client, sockets, getAttempts } = makeClient({
      reconnectBaseMs: 100,
      reconnectMaxMs: 400,
      probeIntervalMs: 60_000,
    });
    client.subscribe("prices", vi.fn());
    sockets[0].open();
    sockets[0].emit({ op: "ack", channels: ["prices"] });
    sockets[0].serverClose();
    vi.advanceTimersByTime(100);
    sockets[1].open();
    sockets[1].emit({ op: "ack", channels: ["prices"] });
    sockets[1].serverClose();

    vi.advanceTimersByTime(199);
    expect(getAttempts()).toBe(2);
    vi.advanceTimersByTime(1);
    expect(getAttempts()).toBe(3);

    sockets[2].open();
    vi.advanceTimersByTime(30_000);
    sockets[2].serverClose();
    vi.advanceTimersByTime(99);
    expect(getAttempts()).toBe(3);
    vi.advanceTimersByTime(1);
    expect(getAttempts()).toBe(4);
  });

  it("probes a live socket every 15 s and replaces it with backoff when a probe goes unanswered", () => {
    const { client, sockets, getAttempts } = makeClient();
    client.subscribe("prices", vi.fn());
    sockets[0].open();
    sockets[0].send.mockClear();

    vi.advanceTimersByTime(15_000);
    expect(parseSends(sockets[0])).toEqual([{ op: "subscribe", channels: [] }]);
    sockets[0].emit({ op: "ack", channels: ["prices"] });
    vi.advanceTimersByTime(10_000);
    expect(sockets[0].close).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15_000);
    expect(sockets[0].close).toHaveBeenCalled();
    expect(client.status).toBe("reconnecting");
    vi.advanceTimersByTime(499);
    expect(getAttempts()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(getAttempts()).toBe(2);
  });

  it("does not double-connect while a reconnect is pending", () => {
    const { client, getAttempts } = makeClient({ failFirst: 1 });
    client.subscribe("prices", vi.fn()); // attempt 1 throws -> reconnect pending
    client.subscribe("candles", vi.fn()); // must not trigger a second connect now
    expect(getAttempts()).toBe(1);
  });

  it("re-subscribes all channels on reconnect", () => {
    const { client, sockets } = makeClient();
    client.subscribe("prices", vi.fn());
    client.subscribe("candles", vi.fn());
    sockets[0].open();

    sockets[0].serverClose();
    vi.advanceTimersByTime(500);
    sockets[1].open();
    expect(parseSends(sockets[1])).toContainEqual({ op: "subscribe", channels: ["prices", "candles"] });
  });

  it("ignores a closed socket's late close event after a resubscribe", () => {
    const { client, sockets, getAttempts } = makeClient();
    client.subscribe("prices", vi.fn());
    sockets[0].open();
    client.close();

    const listener = vi.fn();
    client.subscribe("prices", listener);
    sockets[0].serverClose();
    vi.advanceTimersByTime(1000);
    sockets[1].open();
    sockets[1].emit({ ch: "prices", type: "snapshot", serverTs: 1, data: 1 });

    expect(getAttempts()).toBe(2);
    expect(client.status).toBe("live");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("WsStreamClient unsubscribe / lifecycle", () => {
  it("sends unsubscribe and closes when the last channel is dropped", () => {
    const { client, sockets } = makeClient();
    const unsub = client.subscribe("prices", vi.fn());
    sockets[0].open();
    sockets[0].send.mockClear();

    unsub();
    expect(parseSends(sockets[0])).toContainEqual({ op: "unsubscribe", channels: ["prices"] });
    expect(sockets[0].close).toHaveBeenCalled();
    expect(client.status).toBe("closed");
  });

  it("keeps the channel while another listener remains", () => {
    const { client, sockets } = makeClient();
    const off1 = client.subscribe("prices", vi.fn());
    client.subscribe("prices", vi.fn());
    sockets[0].open();
    sockets[0].send.mockClear();

    off1();
    expect(sockets[0].send).not.toHaveBeenCalled();
    expect(sockets[0].close).not.toHaveBeenCalled();
  });

  it("closes without sending unsubscribe when not yet live", () => {
    const { client, sockets } = makeClient();
    const unsub = client.subscribe("prices", vi.fn()); // connecting (not open)
    unsub();
    expect(sockets[0].send).not.toHaveBeenCalled();
    expect(sockets[0].close).toHaveBeenCalled();
    expect(client.status).toBe("closed");
  });

  it("close() stops a pending reconnect", () => {
    const { client, getAttempts } = makeClient({ failFirst: 1 });
    client.subscribe("prices", vi.fn()); // reconnect pending
    client.close();
    vi.advanceTimersByTime(5000);
    expect(getAttempts()).toBe(1);
    expect(client.status).toBe("closed");
  });

  it("drops late frames after close", () => {
    const { client, sockets } = makeClient();
    const listener = vi.fn();
    client.subscribe("prices", listener);
    sockets[0].open();
    client.close();
    listener.mockClear();
    sockets[0].emit({ ch: "prices", type: "snapshot", serverTs: 1, data: {} });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("WsStreamClient status listeners", () => {
  it("notifies on transitions and stops after removal", () => {
    const { client, sockets } = makeClient();
    const cb = vi.fn();
    const remove = client.addStatusListener(cb);

    client.subscribe("prices", vi.fn());
    sockets[0].open();
    expect(cb).toHaveBeenCalledWith("connecting");
    expect(cb).toHaveBeenCalledWith("live");

    remove();
    cb.mockClear();
    sockets[0].serverClose();
    expect(cb).not.toHaveBeenCalled();
  });
});
