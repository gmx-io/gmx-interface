import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StreamStatus, WebSocketCtor } from "../types";
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
  const Ctor = vi.fn((url: string) => {
    attempts += 1;
    if (attempts <= failFirst) {
      throw new Error("connect failed");
    }
    const socket = new FakeSocket(url);
    sockets.push(socket);
    return socket;
  });
  return { Ctor: Ctor as unknown as WebSocketCtor, ctorMock: Ctor, sockets, getAttempts: () => attempts };
}

const URL = "ws://localhost:3004/v1/stream";

function makeClient(opts: { failFirst?: number; reconnectBaseMs?: number; reconnectMaxMs?: number } = {}) {
  const impl = makeWsImpl({ failFirst: opts.failFirst });
  const client = new WsStreamClient({
    url: URL,
    webSocketImpl: impl.Ctor,
    reconnectBaseMs: opts.reconnectBaseMs,
    reconnectMaxMs: opts.reconnectMaxMs,
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
  it("starts closed and does not connect until first subscribe", () => {
    const { client, ctorMock } = makeClient();
    expect(client.status).toBe("closed");
    expect(ctorMock).not.toHaveBeenCalled();
  });

  it("connects on first subscribe and transitions connecting -> live", () => {
    const { client, ctorMock, sockets } = makeClient();
    const statuses: StreamStatus[] = [];
    client.addStatusListener((s) => statuses.push(s));

    client.subscribe("prices", vi.fn());
    expect(ctorMock).toHaveBeenCalledTimes(1);
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

  it("opens a single connection for multiple listeners on one channel", () => {
    const { client, ctorMock } = makeClient();
    client.subscribe("prices", vi.fn());
    client.subscribe("prices", vi.fn());
    expect(ctorMock).toHaveBeenCalledTimes(1);
  });

  it("does not connect for a status listener alone", () => {
    const { client, ctorMock } = makeClient();
    client.addStatusListener(vi.fn());
    expect(ctorMock).not.toHaveBeenCalled();
    expect(client.status).toBe("closed");
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

  it("ignores frames for an unsubscribed channel", () => {
    const { sockets, listener } = connected();
    sockets[0].emit({ ch: "candles", type: "snapshot", serverTs: 1, data: {} });
    expect(listener).not.toHaveBeenCalled();
  });

  it("drops a snapshot frame that carries no data, then delivers the next valid one", () => {
    const { sockets, listener } = connected();
    sockets[0].emit({ ch: "prices", type: "snapshot", serverTs: 1 }); // no `data` key
    expect(listener).not.toHaveBeenCalled();
    sockets[0].emit({ ch: "prices", type: "snapshot", serverTs: 2, data: { p: 1 } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignores ack / error / non-snapshot frames", () => {
    const { sockets, listener } = connected();
    sockets[0].emit({ op: "ack", channels: ["prices"] });
    sockets[0].emit({ op: "error", message: "x" });
    sockets[0].emit({ ch: "prices", type: "delta", serverTs: 1, data: {} });
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores invalid JSON without throwing", () => {
    const { sockets, listener } = connected();
    expect(() => sockets[0].emit("{ not json")).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it("parses a non-string (Buffer) frame", () => {
    const { sockets, listener } = connected();
    sockets[0].emitRaw(Buffer.from(JSON.stringify({ ch: "prices", type: "snapshot", serverTs: 1, data: 42 })));
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ data: 42 }));
  });
});

describe("WsStreamClient reconnect / backoff", () => {
  it("reconnects after the server closes the socket", () => {
    const { client, ctorMock, sockets } = makeClient();
    client.subscribe("prices", vi.fn());
    sockets[0].open();

    sockets[0].serverClose();
    expect(client.status).toBe("reconnecting");

    vi.advanceTimersByTime(500);
    expect(ctorMock).toHaveBeenCalledTimes(2);
  });

  it("applies exponential backoff capped at the max", () => {
    const { client, getAttempts } = makeClient({ failFirst: 5, reconnectBaseMs: 100, reconnectMaxMs: 400 });
    client.subscribe("prices", vi.fn()); // attempt 1 throws -> schedule base

    expect(getAttempts()).toBe(1);
    vi.advanceTimersByTime(99);
    expect(getAttempts()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(getAttempts()).toBe(2); // after base=100
    vi.advanceTimersByTime(200);
    expect(getAttempts()).toBe(3); // after 2*base=200
    vi.advanceTimersByTime(400);
    expect(getAttempts()).toBe(4); // after 4*base capped at 400
    vi.advanceTimersByTime(400);
    expect(getAttempts()).toBe(5); // stays capped at 400
    expect(client.status).toBe("reconnecting");
  });

  it("resets the backoff after a successful open", () => {
    const { client, sockets, getAttempts } = makeClient({ failFirst: 2, reconnectBaseMs: 100, reconnectMaxMs: 400 });
    client.subscribe("prices", vi.fn()); // attempt 1 throws -> schedule 100
    vi.advanceTimersByTime(100); // attempt 2 throws -> schedule 200
    vi.advanceTimersByTime(200); // attempt 3 succeeds
    expect(sockets.length).toBe(1);
    sockets[0].open(); // resets delay to base

    sockets[0].serverClose(); // schedule at base (100), not 400
    vi.advanceTimersByTime(99);
    expect(getAttempts()).toBe(3);
    vi.advanceTimersByTime(1);
    expect(getAttempts()).toBe(4);
  });

  it("schedules a reconnect when the socket constructor throws", () => {
    const { client } = makeClient({ failFirst: 1 });
    expect(() => client.subscribe("prices", vi.fn())).not.toThrow();
    expect(client.status).toBe("reconnecting");
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

  it("tolerates a double unsubscribe", () => {
    const { client } = makeClient();
    const unsub = client.subscribe("prices", vi.fn());
    unsub();
    expect(() => unsub()).not.toThrow();
  });

  it("close() stops a pending reconnect", () => {
    const { client, getAttempts } = makeClient({ failFirst: 1 });
    client.subscribe("prices", vi.fn()); // reconnect pending
    client.close();
    vi.advanceTimersByTime(5000);
    expect(getAttempts()).toBe(1);
    expect(client.status).toBe("closed");
  });

  it("does not reconnect after a user-initiated close", () => {
    const { client, sockets, getAttempts } = makeClient();
    client.subscribe("prices", vi.fn());
    sockets[0].open();
    client.close();
    sockets[0].serverClose(); // late close event from the socket
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

  it("survives a send that throws", () => {
    const { client, sockets } = makeClient();
    client.subscribe("prices", vi.fn());
    sockets[0].open();
    sockets[0].send.mockImplementation(() => {
      throw new Error("socket gone");
    });
    expect(() => client.subscribe("candles", vi.fn())).not.toThrow();
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

describe("WsStreamClient WebSocket resolution", () => {
  it("falls back to the isomorphic-ws default when no implementation is injected", () => {
    expect(() => new WsStreamClient({ url: URL })).not.toThrow();
  });

  it("prefers the injected implementation over the default", () => {
    const { client, ctorMock } = makeClient();
    client.subscribe("prices", vi.fn());
    expect(ctorMock).toHaveBeenCalledTimes(1);
  });
});
